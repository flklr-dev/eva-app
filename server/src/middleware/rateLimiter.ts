import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { getRateLimitConfig } from '../config/rateLimitConfig';

// Extend Express Request type to include rateLimit property
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit: number;
        remaining: number;
        resetTime: number;
      };
    }
  }
}

/**
 * Production-grade rate limiting middleware for OTP endpoints
 * 
 * Features:
 * - Per-IP rate limiting
 * - Per-email rate limiting (via custom middleware)
 * - Proper error messages with retry information
 * - Security logging
 * - In-memory storage (works for single server instances)
 * - Configurable via environment variables
 */

const config = getRateLimitConfig();

// ============================================================================
// General API Rate Limiter (applies to all routes)
// ============================================================================

export const generalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.general.windowMs,
  max: config.general.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil((req.rateLimit?.resetTime || Date.now() + 15 * 60 * 1000 - Date.now()) / 1000);
    console.warn(`[RateLimit] General rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
    });
  },
});

// ============================================================================
// OTP Request Rate Limiter (Per IP)
// ============================================================================

/**
 * Rate limiter for OTP requests (forgot-password endpoint)
 * Limits: 5 requests per 15 minutes per IP address
 */
export const otpRequestRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.otpRequest.windowMs,
  max: config.otpRequest.maxPerIP,
  message: {
    error: 'Too many OTP requests. Please wait before requesting again.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil((req.rateLimit?.resetTime || Date.now() + 15 * 60 * 1000 - Date.now()) / 1000);
    const email = req.body?.email || 'unknown';
    console.warn(`[RateLimit] OTP request rate limit exceeded for IP: ${req.ip}, Email: ${email}`);
    
    // Log security event
    logSecurityEvent('OTP_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      email: email,
      path: req.path,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: 'Too many OTP requests. Please wait 15 minutes before requesting a new OTP.',
      retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
    });
  },
});

// ============================================================================
// OTP Verification Rate Limiter (Per IP)
// ============================================================================

/**
 * Rate limiter for OTP verification attempts
 * Limits: 5 failed attempts per 15 minutes per IP
 * Successful verifications don't count against the limit
 */
export const otpVerifyRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: config.otpVerify.windowMs,
  max: config.otpVerify.maxPerIP,
  message: {
    error: 'Too many OTP verification attempts. Please wait before trying again.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful verifications
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil((req.rateLimit?.resetTime || Date.now() + 15 * 60 * 1000 - Date.now()) / 1000);
    const email = req.body?.email || 'unknown';
    console.warn(`[RateLimit] OTP verification rate limit exceeded for IP: ${req.ip}, Email: ${email}`);
    
    // Log security event
    logSecurityEvent('OTP_VERIFY_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      email: email,
      path: req.path,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: 'Too many OTP verification attempts. Please wait 15 minutes before trying again.',
      retryAfter: `${Math.ceil(retryAfter / 60)} minutes`,
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
    });
  },
});

// ============================================================================
// Per-Email Rate Limiter (Custom Middleware)
// ============================================================================

/**
 * In-memory store for per-email rate limiting
 * Works perfectly for single server instances
 */
interface EmailRateLimitRecord {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

const emailRateLimitStore = new Map<string, EmailRateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of emailRateLimitStore.entries()) {
    if (now > record.resetTime) {
      emailRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Per-email rate limiter for OTP requests
 * Limits: 3 requests per hour per email address
 * 
 * This prevents email enumeration and spam attacks
 */
export const otpEmailRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const email = req.body?.email?.toLowerCase()?.trim();
  
  if (!email) {
    // If no email, let validation middleware handle it
    return next();
  }

  const now = Date.now();
  const key = `otp:email:${email}`;
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = config.otpRequest.maxPerEmail;

  try {
    // Use in-memory store
    const record = emailRateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      emailRateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstRequestTime: now,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
      
      console.warn(`[RateLimit] Email rate limit exceeded for: ${email}, IP: ${req.ip}`);
      logSecurityEvent('OTP_EMAIL_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        email: email,
        path: req.path,
        userAgent: req.get('user-agent'),
      });

      res.status(429).json({
        error: `Too many OTP requests for this email address. Please wait ${minutesLeft} minutes before requesting again.`,
        retryAfter: `${minutesLeft} minutes`,
        limit: maxRequests,
        remaining: 0,
      });
      return;
    }

    record.count++;
    emailRateLimitStore.set(key, record);
    next();
  } catch (error) {
    // If rate limiting fails, log error but allow request (fail open)
    console.error('[RateLimit] Error in email rate limiter:', error);
    next();
  }
};

// ============================================================================
// Daily Email Rate Limiter
// ============================================================================

/**
 * Daily rate limiter for OTP requests per email
 * Limits: 10 requests per 24 hours per email address
 */
export const otpDailyEmailRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const email = req.body?.email?.toLowerCase()?.trim();
  
  if (!email) {
    return next();
  }

  const now = Date.now();
  const key = `otp:daily:${email}`;
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  const maxRequests = config.otpRequest.maxPerEmailDaily;

  try {
    // Use in-memory store
    const record = emailRateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      emailRateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstRequestTime: now,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const hoursLeft = Math.ceil((record.resetTime - now) / 3600000);
      
      console.warn(`[RateLimit] Daily email rate limit exceeded for: ${email}, IP: ${req.ip}`);
      logSecurityEvent('OTP_DAILY_EMAIL_RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        email: email,
        path: req.path,
        userAgent: req.get('user-agent'),
      });

      res.status(429).json({
        error: `Daily OTP request limit reached for this email address. Please wait ${hoursLeft} hours or contact support.`,
        retryAfter: `${hoursLeft} hours`,
        limit: maxRequests,
        remaining: 0,
      });
      return;
    }

    record.count++;
    emailRateLimitStore.set(key, record);
    next();
  } catch (error) {
    console.error('[RateLimit] Error in daily email rate limiter:', error);
    next();
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log security events for monitoring
 */
function logSecurityEvent(eventType: string, details: Record<string, any>): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ...details,
  };

  // Log to console (in production, send to CloudWatch, Datadog, etc.)
  console.warn('[SecurityEvent]', JSON.stringify(logEntry));

  // TODO: In production, send to your monitoring service
  // Example: CloudWatch, Datadog, Sentry, etc.
}

// ============================================================================
// Combined Rate Limiter for OTP Endpoints
// ============================================================================

/**
 * Combined middleware that applies all OTP rate limiters
 * Use this on forgot-password endpoint
 */
export const otpRequestCombinedLimiter = [
  otpRequestRateLimiter,      // Per-IP: 5 requests per 15 minutes
  otpEmailRateLimiter,         // Per-email: 3 requests per hour
  otpDailyEmailRateLimiter,    // Per-email: 10 requests per day
];

/**
 * Combined middleware for OTP verification
 * Use this on verify-otp endpoint
 */
export const otpVerifyCombinedLimiter = [
  otpVerifyRateLimiter,        // Per-IP: 5 attempts per 15 minutes
];

