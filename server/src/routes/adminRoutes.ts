import { Router } from 'express';
import { body } from 'express-validator';
import { adminLogin, changeAdminPassword, getCurrentAdmin } from '../controllers/adminController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Validation rules
const adminLoginValidation = [
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
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

// Routes
router.post('/auth/login', adminLoginValidation, adminLogin);
router.post('/auth/change-password', adminAuthMiddleware, changePasswordValidation, changeAdminPassword);
router.get('/me', adminAuthMiddleware, getCurrentAdmin);

export default router;