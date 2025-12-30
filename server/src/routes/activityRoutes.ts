import { Router } from 'express';
import * as activityController from '../controllers/activityController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Routes
router.get('/', activityController.getActivities);

export default router;

