import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  updateSettings,
  deleteAccount
} from '../controllers/profileController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
];

const updateSettingsValidation = [
  body('shareLocation')
    .optional()
    .isBoolean()
    .withMessage('shareLocation must be a boolean'),
  body('shareWithEveryone')
    .optional()
    .isBoolean()
    .withMessage('shareWithEveryone must be a boolean'),
  body('notificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('notificationsEnabled must be a boolean'),
];

// Routes
router.get('/', getProfile);
router.patch('/', updateProfileValidation, updateProfile);
router.patch('/picture', updateProfilePicture); // TODO: Implement with chosen storage strategy
router.patch('/settings', updateSettingsValidation, updateSettings);
router.delete('/', deleteAccount);

export default router;
