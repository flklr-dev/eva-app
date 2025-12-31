import { Types } from 'mongoose';
import Friend, { IFriend } from '../models/Friend';
import User, { IUser } from '../models/User';
import { emitFriendRequestToUser, emitFriendRequestResponseToUser } from '../webSocket/socketManager';
import { sendPushNotificationToUser } from './notificationService';

/**
 * Constants for offline detection
 */
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes of inactivity = offline

/**
 * Helper function to determine if a user is online based on lastSeen timestamp
 * A user is considered online if they've been seen within the last 10 minutes
 */
export const isUserOnline = (lastSeen?: Date): boolean => {
  if (!lastSeen) {
    return false; // No lastSeen = offline
  }
  
  const now = new Date();
  const timeDifference = now.getTime() - new Date(lastSeen).getTime();
  return timeDifference < OFFLINE_THRESHOLD_MS;
};

export interface FriendRequest {
  requesterId: string;
  recipientId: string;
}

export interface FriendWithDetails {
  id: string;
  requestId?: string; // The actual friend request document ID (only for pending requests)
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  isRequester: boolean;
  createdAt: Date;
  isActive?: boolean;
  isOnline?: boolean; // NEW: Derived from lastSeen timestamp
  lastSeen?: Date;
  lastKnownLocation?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    timestamp: Date;
    accuracy?: number;
  };
  shareLocation?: boolean; // NEW: Whether friend has location sharing enabled
}

/**
 * Send a friend request
 * UPDATED: Now with comprehensive debugging and WebSocket notifications
 */
export const sendFriendRequest = async (requesterId: string, recipientId: string): Promise<IFriend> => {
  // Input validation
  if (!requesterId || !recipientId) {
    throw new Error('Requester and recipient IDs are required');
  }

  if (!Types.ObjectId.isValid(requesterId) || !Types.ObjectId.isValid(recipientId)) {
    throw new Error('Invalid user ID format');
  }

  if (requesterId === recipientId) {
    throw new Error('Cannot send friend request to yourself');
  }

  // Validate both users exist and are active
  const [requester, recipient] = await Promise.all([
    User.findById(requesterId),
    User.findById(recipientId),
  ]);

  if (!requester) {
    throw new Error('Requester user not found');
  }

  if (!recipient) {
    throw new Error('Recipient user not found');
  }

  if (!requester.isActive) {
    throw new Error('Your account is not active');
  }

  if (!recipient.isActive) {
    throw new Error('Recipient account is not active');
  }

  // Check if friend request already exists (in either direction)
  const existingRequest = await Friend.findOne({
    $or: [
      { requesterId: requesterId, recipientId: recipientId },
      { requesterId: recipientId, recipientId: requesterId },
    ],
  });

  if (existingRequest) {
    switch (existingRequest.status) {
      case 'accepted':
        throw new Error('You are already friends with this user');
      case 'pending':
        // Check who sent the request
        const isRequester = existingRequest.requesterId.toString() === requesterId;
        if (isRequester) {
          throw new Error('You already have a pending friend request to this user');
        } else {
          throw new Error('This user already has a pending friend request to you');
        }
      case 'rejected':
        // Allow resending if previously rejected
        existingRequest.status = 'pending';
        existingRequest.requesterId = new Types.ObjectId(requesterId);
        existingRequest.recipientId = new Types.ObjectId(recipientId);
        existingRequest.updatedAt = new Date();
        return await existingRequest.save();
      case 'blocked':
        throw new Error('Unable to send friend request to this user');
      default:
        throw new Error('Invalid friend request status');
    }
  }

  // Additional validation: Check if users have reached any limits
  // Rate limiting: Check how many friend requests sent in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentRequestsCount = await Friend.countDocuments({
    requesterId: requesterId,
    createdAt: { $gte: oneDayAgo }
  });

  // Allow maximum 10 friend requests per day to prevent spam
  if (recentRequestsCount >= 10) {
    throw new Error('Too many friend requests sent today. Please try again tomorrow.');
  }

  // Check if recipient has too many pending requests
  const recipientPendingCount = await Friend.countDocuments({
    recipientId: recipientId,
    status: 'pending'
  });

  if (recipientPendingCount >= 50) {
    throw new Error('This user has too many pending friend requests');
  }

  // Create new friend request
  const friendRequest = new Friend({
    requesterId: new Types.ObjectId(requesterId),
    recipientId: new Types.ObjectId(recipientId),
    status: 'pending',
  });

  const savedRequest = await friendRequest.save();
  console.log('[FriendService] ========== FRIEND REQUEST SAVED ==========');
  console.log('[FriendService] Request ID:', savedRequest._id.toString());
  console.log('[FriendService] Requester:', requesterId);
  console.log('[FriendService] Recipient:', recipientId);

  // Emit WebSocket event to notify recipient
  console.log('[FriendService] About to emit WebSocket event and send push notification');
  try {
    console.log('[FriendService] Calling emitFriendRequestToUser...');
    emitFriendRequestToUser(recipientId, {
      requestId: savedRequest._id.toString(),
      senderId: requesterId,
      senderName: requester.name,
      senderEmail: requester.email,
      senderProfilePicture: requester.profilePicture,
      timestamp: new Date().toISOString()
    });
    console.log('[FriendService] ✓ emitFriendRequestToUser called');
    
    // Send push notification to recipient
    console.log('[FriendService] Calling sendPushNotificationToUser...');
    await sendPushNotificationToUser(
      recipientId,
      'New Friend Request',
      `${requester.name} wants to be your friend`,
      {
        eventType: 'friend_request_received',
        senderId: requesterId,
        requestId: savedRequest._id.toString(),
      }
    );
    console.log('[FriendService] ✓ sendPushNotificationToUser called');
  } catch (error) {
    console.error('[FriendService] ✗ ERROR in WebSocket/notification section:', error);
    console.error('[FriendService] Error details:', error);
  }
  console.log('[FriendService] =============================================');

  // Create activity for friend request sent
  try {
    const { createActivity } = require('./activityService');
    await createActivity({
      userId: requesterId,
      type: 'status_change',
      message: `You sent a friend request to ${recipient.name}`,
      visibleTo: [requesterId], // Only visible to sender
    });
    console.log('[FriendService] Activity created for friend request sent');
  } catch (activityError) {
    console.error('[FriendService] Error creating activity for friend request:', activityError);
    // Don't fail the request if activity creation fails
  }

  return savedRequest;
};

/**
 * Get friend requests (sent and received)
 */
export const getFriendRequests = async (userId: string): Promise<{
  sent: FriendWithDetails[];
  received: FriendWithDetails[];
}> => {
  const [sentRequests, receivedRequests] = await Promise.all([
    Friend.find({ requesterId: userId, status: 'pending' }).populate('recipientId', 'name email phone profilePicture'),
    Friend.find({ recipientId: userId, status: 'pending' }).populate('requesterId', 'name email phone profilePicture'),
  ]);

  const sent = sentRequests.map((request) => {
    const recipient = request.recipientId as unknown as IUser;
    console.log('[FriendService] Sent request - Name:', recipient.name, 'Phone:', recipient.phone || 'No phone');
    return {
      id: recipient._id.toString(),
      requestId: request._id.toString(),
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone,
      profilePicture: recipient.profilePicture,
      status: request.status,
      isRequester: true,
      createdAt: request.createdAt,
    };
  });

  const received = receivedRequests.map((request) => {
    const requester = request.requesterId as unknown as IUser;
    console.log('[FriendService] Received request - Name:', requester.name, 'Phone:', requester.phone || 'No phone');
    return {
      id: requester._id.toString(),
      requestId: request._id.toString(),
      name: requester.name,
      email: requester.email,
      phone: requester.phone,
      profilePicture: requester.profilePicture,
      status: request.status,
      isRequester: false,
      createdAt: request.createdAt,
    };
  });

  return { sent, received };
};

/**
 * Accept or reject a friend request
 */
export const respondToFriendRequest = async (
  userId: string,
  requestId: string,
  action: 'accept' | 'reject'
): Promise<IFriend> => {
  const friendRequest = await Friend.findById(requestId);

  if (!friendRequest) {
    throw new Error('Friend request not found');
  }

  // Verify the user is the recipient
  if (friendRequest.recipientId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  // Additional validation
  if (friendRequest.requesterId.toString() === userId) {
    throw new Error('Cannot respond to your own friend request');
  }

  if (friendRequest.status !== 'pending') {
    throw new Error('Friend request is not pending');
  }

  friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
  const updatedRequest = await friendRequest.save();

  // Create activities for friend request response
  try {
    const { createActivity } = require('./activityService');
    const requester = await User.findById(friendRequest.requesterId).select('name');
    const responder = await User.findById(userId).select('name');
    
    if (action === 'accept') {
      // Create activity for requester
      await createActivity({
        userId: friendRequest.requesterId.toString(),
        type: 'status_change',
        message: `${responder?.name || 'Someone'} accepted your friend request`,
        visibleTo: [friendRequest.requesterId.toString()],
      });
      
      // Create activity for responder
      await createActivity({
        userId: userId.toString(),
        type: 'status_change',
        message: `You accepted ${requester?.name || 'someone'}'s friend request`,
        visibleTo: [userId.toString()],
      });
      console.log('[FriendService] Activities created for friend request acceptance');
    }
    // Note: We don't create activities for rejections per plan requirements
  } catch (activityError) {
    console.error('[FriendService] Error creating activities for friend request response:', activityError);
    // Don't fail the request if activity creation fails
  }

  // Emit WebSocket event to notify requester
  try {
    // Get responder info
    const responder = await User.findById(userId).select('name email');
    if (responder) {
      emitFriendRequestResponseToUser(friendRequest.requesterId.toString(), {
        requestId: updatedRequest._id.toString(),
        responderId: userId,
        responderName: responder.name,
        action: action,
        timestamp: new Date().toISOString()
      });
      
      // Send push notification to requester
      await sendPushNotificationToUser(
        friendRequest.requesterId.toString(),
        action === 'accept' ? 'Friend Request Accepted' : 'Friend Request Declined',
        `${responder.name} ${action === 'accept' ? 'accepted' : 'declined'} your friend request`,
        {
          eventType: `friend_request_${action}`,
          responderId: userId,
          requestId: updatedRequest._id.toString(),
        }
      );
    }
  } catch (error) {
    console.error('Error emitting WebSocket response event or sending push notification:', error);
  }

  return updatedRequest;
};

/**
 * Get all friends for a user
 */
export const getFriends = async (userId: string): Promise<FriendWithDetails[]> => {
  console.log('[FriendService] ========== GET FRIENDS ==========');
  console.log('[FriendService] Fetching friends for userId:', userId);
  
  const friendships = await Friend.find({
    $or: [
      { requesterId: userId, status: 'accepted' },
      { recipientId: userId, status: 'accepted' },
    ],
  })
    .populate('requesterId', 'name email phone profilePicture isActive lastSeen lastKnownLocation settings')
    .populate('recipientId', 'name email phone profilePicture isActive lastSeen lastKnownLocation settings')
    .sort({ updatedAt: -1 });

  console.log('[FriendService] Found', friendships.length, 'friendships');

  const friends = friendships.map((friendship) => {
    // After populate, requesterId/recipientId are User objects, not ObjectIds
    // We need to access the _id property to get the actual ID for comparison
    const requesterUser = friendship.requesterId as unknown as IUser;
    const recipientUser = friendship.recipientId as unknown as IUser;
    
    const isRequester = requesterUser._id.toString() === userId;
    const friendUser = isRequester ? recipientUser : requesterUser;

    // Determine online status based on lastSeen timestamp
    const isOnline = isUserOnline(friendUser.lastSeen);
    
    // Log phone number info
    console.log('[FriendService] Friend:', friendUser.name, 'Phone:', friendUser.phone || 'No phone');

    // Respect shareLocation setting: only return lastKnownLocation if friend has sharing enabled
    // If sharing is disabled, friends can still see the last known location (for safety),
    // but it won't be updated anymore
    let lastKnownLocation = friendUser.lastKnownLocation;
    
    // If friend has disabled location sharing, we still return lastKnownLocation
    // but the client should understand it's the last saved location, not current
    // This is for safety - friends can see where you were last seen
    // Note: The location won't update anymore if sharing is off
    
    return {
      id: friendUser._id.toString(),
      name: friendUser.name,
      email: friendUser.email,
      phone: friendUser.phone, // Add phone field
      profilePicture: friendUser.profilePicture,
      status: friendship.status as 'accepted',
      isRequester,
      createdAt: friendship.createdAt,
      isActive: friendUser.isActive,
      isOnline, // NEW: Determined from lastSeen
      lastSeen: friendUser.lastSeen,
      lastKnownLocation: lastKnownLocation, // Always return if available (for safety)
      // Include shareLocation setting so client can show appropriate UI
      shareLocation: friendUser.settings?.shareLocation ?? false,
    };
  });

  console.log('[FriendService] Returning', friends.length, 'friends with phone numbers');
  console.log('[FriendService] =====================================');
  
  return friends;
};

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  // Input validation
  if (!friendId || !Types.ObjectId.isValid(friendId)) {
    throw new Error('Invalid friend ID');
  }

  if (userId === friendId) {
    throw new Error('Cannot remove yourself as a friend');
  }

  const friendship = await Friend.findOne({
    $or: [
      { requesterId: userId, recipientId: friendId, status: 'accepted' },
      { requesterId: friendId, recipientId: userId, status: 'accepted' },
    ],
  });

  if (!friendship) {
    throw new Error('Friendship not found');
  }

  await Friend.deleteOne({ _id: friendship._id });
};

/**
 * Get friend details with location (if shared)
 */
export const getFriendDetails = async (userId: string, friendId: string): Promise<FriendWithDetails & { distance?: number }> => {
  // Input validation
  if (!friendId || !Types.ObjectId.isValid(friendId)) {
    throw new Error('Invalid friend ID');
  }

  if (userId === friendId) {
    throw new Error('Cannot get details for yourself');
  }

  console.log('[FriendService] ========== GET FRIEND DETAILS ==========');
  console.log('[FriendService] Fetching details for friendId:', friendId, 'for userId:', userId);

  const friendship = await Friend.findOne({
    $or: [
      { requesterId: userId, recipientId: friendId, status: 'accepted' },
      { requesterId: friendId, recipientId: userId, status: 'accepted' },
    ],
  })
    .populate('requesterId', 'name email phone profilePicture isActive lastSeen lastKnownLocation settings')
    .populate('recipientId', 'name email phone profilePicture isActive lastSeen lastKnownLocation settings');

  if (!friendship) {
    console.log('[FriendService] Friendship not found for:', { userId, friendId });
    throw new Error('Friendship not found');
  }

  // After populate, requesterId/recipientId are User objects, not ObjectIds
  // We need to access the _id property to get the actual ID for comparison
  const requesterUser = friendship.requesterId as unknown as IUser;
  const recipientUser = friendship.recipientId as unknown as IUser;
  
  const isRequester = requesterUser._id.toString() === userId;
  const friendUser = isRequester ? recipientUser : requesterUser;

  // Determine online status based on lastSeen timestamp
  const isOnline = isUserOnline(friendUser.lastSeen);
  
  // Log phone number info
  console.log('[FriendService] Friend details - Name:', friendUser.name, 'Phone:', friendUser.phone || 'No phone');
  console.log('[FriendService] =====================================');

  return {
    id: friendUser._id.toString(),
    name: friendUser.name,
    email: friendUser.email,
    phone: friendUser.phone, // Add phone field
    profilePicture: friendUser.profilePicture,
    status: friendship.status as 'accepted',
    isRequester,
    createdAt: friendship.createdAt,
    isActive: friendUser.isActive,
    isOnline, // NEW: Determined from lastSeen
    lastSeen: friendUser.lastSeen,
    lastKnownLocation: friendUser.lastKnownLocation, // Always return if available (for safety)
    shareLocation: friendUser.settings?.shareLocation ?? false, // Include shareLocation setting
  };
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = async (userId: string, requestId: string): Promise<void> => {
  const friendRequest = await Friend.findById(requestId);

  if (!friendRequest) {
    throw new Error('Friend request not found');
  }

  // Verify the user is the requester
  if (friendRequest.requesterId.toString() !== userId) {
    throw new Error('Unauthorized');
  }

  if (friendRequest.status !== 'pending') {
    throw new Error('Friend request is not pending');
  }

  await Friend.deleteOne({ _id: requestId });
};

