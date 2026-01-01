import { Router } from 'express';
import { body } from 'express-validator';
import {
  sendSOS,
  getMySOSAlerts,
  getReceivedSOS,
  cancelSOS,
  resolveSOS,
} from '../controllers/sosController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation rules
const sendSOSValidation = [
  body('latitude')
    .isNumeric()
    .withMessage('Latitude must be a number')
    .custom((value) => {
      if (value < -90 || value > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),
  body('longitude')
    .isNumeric()
    .withMessage('Longitude must be a number')
    .custom((value) => {
      if (value < -180 || value > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      return true;
    }),
  body('message')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters'),
];

// Routes
router.post('/', sendSOSValidation, sendSOS);
router.get('/my', getMySOSAlerts);
router.get('/received', getReceivedSOS);
router.patch('/:alertId/cancel', cancelSOS);
router.patch('/:alertId/resolve', resolveSOS);

export default router;


