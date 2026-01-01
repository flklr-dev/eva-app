import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
  updateSettings,
  deleteAccount,
  updateLocation,
  getNearbyUsers
} from '../controllers/profileController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public route to get user profile by ID (no authentication required)
// Used for displaying user info in friend invitation dialogs
router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { getUserProfile } = await import('../services/profileService');
    
    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Return only public fields (not password, sensitive settings, etc.)
    // SECURITY: Do not expose email for privacy reasons
    res.json({
      id: profile.id,
      name: profile.name,
      profilePicture: profile.profilePicture,
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// All other routes require authentication
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

const updateLocationValidation = [
  body('latitude')
    .isNumeric()
    .withMessage('Latitude must be a number'),
  body('longitude')
    .isNumeric()
    .withMessage('Longitude must be a number'),
  body('accuracy')
    .optional()
    .isNumeric()
    .withMessage('Accuracy must be a number'),
];

// Routes
router.get('/', getProfile);
router.patch('/', updateProfileValidation, updateProfile);
router.patch('/picture', updateProfilePicture); // TODO: Implement with chosen storage strategy
router.patch('/settings', updateSettingsValidation, updateSettings);
router.patch('/location', updateLocationValidation, updateLocation);
router.get('/nearby', getNearbyUsers);
router.delete('/', deleteAccount);

export default router;
