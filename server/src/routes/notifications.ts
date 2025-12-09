import express from 'express';
import {
  subscribe,
  unsubscribe,
  getStatus,
  getAllSubscriptions,
  getAllUsers,
  sendNotification,
} from '../controllers/notificationController';
import { authMiddleware as authenticateToken } from '../middleware/authMiddleware';
import { adminAuthMiddleware as adminAuthenticateToken } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// User routes (require authentication)
router.post('/subscribe', authenticateToken, subscribe);
router.post('/unsubscribe', authenticateToken, unsubscribe);
router.get('/status', authenticateToken, getStatus);

// Admin routes (require admin authentication)
router.get('/admin/subscriptions', adminAuthenticateToken, getAllSubscriptions);
router.get('/admin/users', adminAuthenticateToken, getAllUsers);
router.post('/admin/send', adminAuthenticateToken, sendNotification);

export default router;
