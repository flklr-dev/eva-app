import { Router } from 'express';
import { body } from 'express-validator';
import * as friendController from '../controllers/friendController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation rules
const sendRequestValidation = [
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required')
    .isMongoId()
    .withMessage('Invalid recipient ID format'),
];

const respondRequestValidation = [
  body('action')
    .isIn(['accept', 'reject'])
    .withMessage('Action must be "accept" or "reject"'),
];

// Routes
// IMPORTANT: Specific routes must come before parameterized routes
router.post('/request', sendRequestValidation, friendController.sendFriendRequest);
router.get('/requests', friendController.getFriendRequests);
router.patch('/requests/:requestId', respondRequestValidation, friendController.respondToFriendRequest);
router.delete('/requests/:requestId', friendController.cancelFriendRequest);
// Root route for getting all friends - must come before /:friendId
router.get('/', friendController.getFriends);
console.log('✓ GET /api/friends route registered');
// Parameterized routes - must come after specific routes
router.get('/:friendId', friendController.getFriendDetails);
router.delete('/:friendId', friendController.removeFriend);

export default router;

