import { Request, Response } from 'express';
import * as friendService from '../services/friendService';

import { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Send a friend request
 * POST /api/friends/request
 */
export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('[FriendController] ========== SEND FRIEND REQUEST ==========');
    const userId = req.user?._id?.toString();
    console.log('[FriendController] Requester userId:', userId);
    
    if (!userId) {
      console.log('[FriendController] Unauthorized - no userId');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { recipientId } = req.body;
    console.log('[FriendController] Recipient ID from body:', recipientId);

    // Input validation
    if (!recipientId) {
      console.log('[FriendController] Missing recipient ID');
      res.status(400).json({ message: 'Recipient ID is required' });
      return;
    }

    if (typeof recipientId !== 'string' || recipientId.trim() === '') {
      console.log('[FriendController] Invalid recipient ID format');
      res.status(400).json({ message: 'Invalid recipient ID' });
      return;
    }

    if (userId === recipientId) {
      console.log('[FriendController] Cannot send to self');
      res.status(400).json({ message: 'Cannot send friend request to yourself' });
      return;
    }

    console.log('[FriendController] Calling friendService.sendFriendRequest');
    const friendRequest = await friendService.sendFriendRequest(userId, recipientId);
    console.log('[FriendController] ✓ Friend request created:', friendRequest._id);

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendRequest: {
        id: friendRequest._id,
        requesterId: friendRequest.requesterId,
        recipientId: friendRequest.recipientId,
        status: friendRequest.status,
        createdAt: friendRequest.createdAt,
      },
    });
    console.log('[FriendController] =============================================');
  } catch (error: any) {
    console.error('[FriendController] ========== ERROR ==========');
    console.error('[FriendController] Error:', error);
    console.error('[FriendController] Error message:', error.message);
    const errorMessage = error.message || 'Server error';

    // Map specific error messages to appropriate HTTP status codes
    if (errorMessage.includes('not found')) {
      console.log('[FriendController] Error type: Not found (404)');
      res.status(404).json({ message: errorMessage });
    } else if (errorMessage.includes('already') ||
               errorMessage.includes('pending') ||
               errorMessage.includes('yourself') ||
               errorMessage.includes('active') ||
               errorMessage.includes('Unable')) {
      console.log('[FriendController] Error type: Bad request (400):', errorMessage);
      res.status(400).json({ message: errorMessage });
    } else if (errorMessage.includes('Invalid user ID')) {
      console.log('[FriendController] Error type: Invalid user ID (400)');
      res.status(400).json({ message: errorMessage });
    } else {
      console.log('[FriendController] Error type: Server error (500)');
      res.status(500).json({ message: 'Server error' });
    }
    console.error('[FriendController] =====================================');
  }
};

/**
 * Get friend requests (sent and received)
 * GET /api/friends/requests
 */
export const getFriendRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const requests = await friendService.getFriendRequests(userId);

    res.status(200).json({
      sent: requests.sent,
      received: requests.received,
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Accept or reject a friend request
 * PATCH /api/friends/requests/:requestId
 */
export const respondToFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { requestId } = req.params;
    const { action } = req.body;

    if (!action || (action !== 'accept' && action !== 'reject')) {
      res.status(400).json({ message: 'Action must be "accept" or "reject"' });
      return;
    }

    const friendRequest = await friendService.respondToFriendRequest(userId, requestId, action);

    res.status(200).json({
      message: `Friend request ${action}ed successfully`,
      friendRequest: {
        id: friendRequest._id,
        requesterId: friendRequest.requesterId,
        recipientId: friendRequest.recipientId,
        status: friendRequest.status,
      },
    });
  } catch (error: any) {
    console.error('Respond to friend request error:', error);
    if (error.message === 'Friend request not found') {
      res.status(404).json({ message: error.message });
    } else if (error.message === 'Unauthorized' || error.message === 'Friend request is not pending') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

/**
 * Get all friends
 * GET /api/friends
 */
export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('[Friends] GET /api/friends called');
    const userId = req.user?._id?.toString();
    if (!userId) {
      console.log('[Friends] Unauthorized - no userId');
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    console.log('[Friends] Fetching friends for userId:', userId);
    const friends = await friendService.getFriends(userId);
    console.log('[Friends] Found', friends.length, 'friends');

    res.status(200).json({
      friends,
    });
  } catch (error) {
    console.error('[Friends] Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove a friend (unfriend)
 * DELETE /api/friends/:friendId
 */
export const removeFriend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { friendId } = req.params;

    await friendService.removeFriend(userId, friendId);

    res.status(200).json({
      message: 'Friend removed successfully',
    });
  } catch (error: any) {
    console.error('Remove friend error:', error);
    if (error.message === 'Friendship not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

/**
 * Get friend details
 * GET /api/friends/:friendId
 */
export const getFriendDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { friendId } = req.params;

    const friend = await friendService.getFriendDetails(userId, friendId);

    res.status(200).json({
      friend,
    });
  } catch (error: any) {
    console.error('Get friend details error:', error);
    if (error.message === 'Friendship not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

/**
 * Cancel a sent friend request
 * DELETE /api/friends/requests/:requestId
 */
export const cancelFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { requestId } = req.params;

    await friendService.cancelFriendRequest(userId, requestId);

    res.status(200).json({
      message: 'Friend request cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel friend request error:', error);
    if (error.message === 'Friend request not found') {
      res.status(404).json({ message: error.message });
    } else if (error.message === 'Unauthorized' || error.message === 'Friend request is not pending') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

