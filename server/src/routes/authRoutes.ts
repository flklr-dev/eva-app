import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getCurrentUser, forgotPassword, verifyOTP, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { 
  otpRequestCombinedLimiter, 
  otpVerifyCombinedLimiter,
  generalRateLimiter 
} from '../middleware/rateLimiter';

const router = Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

const verifyOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

// Routes
// Apply general rate limiter to all routes
router.use(generalRateLimiter);

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authMiddleware, getCurrentUser);

// OTP endpoints with combined rate limiting
router.post(
  '/forgot-password',
  ...otpRequestCombinedLimiter, // Apply all OTP request rate limiters
  forgotPasswordValidation,
  forgotPassword
);

router.post(
  '/verify-otp',
  ...otpVerifyCombinedLimiter, // Apply OTP verification rate limiters
  verifyOTPValidation,
  verifyOTP
);

router.post('/reset-password', resetPasswordValidation, resetPassword);

export default router;
