/**
 * Rate Limiting Configuration
 * 
 * Customize rate limits for different endpoints here.
 * These values can be overridden via environment variables.
 */

export interface RateLimitConfig {
  // General API rate limiting
  general: {
    windowMs: number; // Time window in milliseconds
    max: number; // Maximum requests per window
  };

  // OTP request rate limiting (forgot-password)
  otpRequest: {
    windowMs: number;
    maxPerIP: number; // Per IP address
    maxPerEmail: number; // Per email address (hourly)
    maxPerEmailDaily: number; // Per email address (daily)
  };

  // OTP verification rate limiting (verify-otp)
  otpVerify: {
    windowMs: number;
    maxPerIP: number; // Per IP address
  };
}

/**
 * Default rate limit configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per IP
  },
  otpRequest: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxPerIP: 5, // 5 requests per 15 minutes per IP
    maxPerEmail: 3, // 3 requests per hour per email
    maxPerEmailDaily: 10, // 10 requests per day per email
  },
  otpVerify: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxPerIP: 5, // 5 failed attempts per 15 minutes per IP
  },
};

/**
 * Get rate limit configuration from environment variables or use defaults
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '100', 10),
    },
    otpRequest: {
      windowMs: parseInt(process.env.RATE_LIMIT_OTP_REQUEST_WINDOW_MS || '900000', 10),
      maxPerIP: parseInt(process.env.RATE_LIMIT_OTP_REQUEST_MAX_IP || '5', 10),
      maxPerEmail: parseInt(process.env.RATE_LIMIT_OTP_REQUEST_MAX_EMAIL || '3', 10),
      maxPerEmailDaily: parseInt(process.env.RATE_LIMIT_OTP_REQUEST_MAX_EMAIL_DAILY || '10', 10),
    },
    otpVerify: {
      windowMs: parseInt(process.env.RATE_LIMIT_OTP_VERIFY_WINDOW_MS || '900000', 10),
      maxPerIP: parseInt(process.env.RATE_LIMIT_OTP_VERIFY_MAX_IP || '5', 10),
    },
  };
}

