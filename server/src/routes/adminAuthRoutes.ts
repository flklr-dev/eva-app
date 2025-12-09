import { Router } from 'express';
import { body } from 'express-validator';
import { adminLogin, getCurrentAdmin, changeAdminPassword } from '../controllers/adminAuthController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

// Routes
router.post('/login', loginValidation, adminLogin);
router.get('/me', adminAuthMiddleware, getCurrentAdmin);
router.post('/change-password', adminAuthMiddleware, changePasswordValidation, changeAdminPassword);

export default router;