import { Types } from 'mongoose';
import Friend, { IFriend } from '../models/Friend';
import User, { IUser } from '../models/User';

export interface FriendRequest {
  requesterId: string;
  recipientId: string;
}

export interface FriendWithDetails {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  isRequester: boolean;
  createdAt: Date;
  isActive?: boolean;
  lastSeen?: Date;
}

/**
 * Send a friend request
 */
export const sendFriendRequest = async (requesterId: string, recipientId: string): Promise<IFriend> => {
  // Validate both users exist
  const [requester, recipient] = await Promise.all([
    User.findById(requesterId),
    User.findById(recipientId),
  ]);

  if (!requester || !recipient) {
    throw new Error('User not found');
  }

  // Check if friend request already exists (in either direction)
  const existingRequest = await Friend.findOne({
    $or: [
      { requesterId: requesterId, recipientId: recipientId },
      { requesterId: recipientId, recipientId: requesterId },
    ],
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      throw new Error('Already friends');
    }
    if (existingRequest.status === 'pending') {
      throw new Error('Friend request already pending');
    }
    if (existingRequest.status === 'blocked') {
      throw new Error('Cannot send friend request');
    }
    // If previously rejected, update to pending
    existingRequest.status = 'pending';
    existingRequest.requesterId = new Types.ObjectId(requesterId);
    existingRequest.recipientId = new Types.ObjectId(recipientId);
    return await existingRequest.save();
  }

  // Create new friend request
  const friendRequest = new Friend({
    requesterId: new Types.ObjectId(requesterId),
    recipientId: new Types.ObjectId(recipientId),
    status: 'pending',
  });

  return await friendRequest.save();
};

/**
 * Get friend requests (sent and received)
 */
export const getFriendRequests = async (userId: string): Promise<{
  sent: FriendWithDetails[];
  received: FriendWithDetails[];
}> => {
  const [sentRequests, receivedRequests] = await Promise.all([
    Friend.find({ requesterId: userId, status: 'pending' }).populate('recipientId', 'name email profilePicture'),
    Friend.find({ recipientId: userId, status: 'pending' }).populate('requesterId', 'name email profilePicture'),
  ]);

  const sent = sentRequests.map((request) => {
    const recipient = request.recipientId as unknown as IUser;
    return {
      id: recipient._id.toString(),
      name: recipient.name,
      email: recipient.email,
      profilePicture: recipient.profilePicture,
      status: request.status,
      isRequester: true,
      createdAt: request.createdAt,
    };
  });

  const received = receivedRequests.map((request) => {
    const requester = request.requesterId as unknown as IUser;
    return {
      id: requester._id.toString(),
      name: requester.name,
      email: requester.email,
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

  if (friendRequest.status !== 'pending') {
    throw new Error('Friend request is not pending');
  }

  friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
  return await friendRequest.save();
};

/**
 * Get all friends for a user
 */
export const getFriends = async (userId: string): Promise<FriendWithDetails[]> => {
  const friendships = await Friend.find({
    $or: [
      { requesterId: userId, status: 'accepted' },
      { recipientId: userId, status: 'accepted' },
    ],
  })
    .populate('requesterId', 'name email profilePicture isActive lastSeen')
    .populate('recipientId', 'name email profilePicture isActive lastSeen')
    .sort({ updatedAt: -1 });

  const friends = friendships.map((friendship) => {
    const isRequester = friendship.requesterId.toString() === userId;
    const friendUser = isRequester 
      ? (friendship.recipientId as unknown as IUser)
      : (friendship.requesterId as unknown as IUser);

    return {
      id: friendUser._id.toString(),
      name: friendUser.name,
      email: friendUser.email,
      profilePicture: friendUser.profilePicture,
      status: friendship.status as 'accepted',
      isRequester,
      createdAt: friendship.createdAt,
      isActive: friendUser.isActive,
      lastSeen: friendUser.lastSeen,
    };
  });

  return friends;
};

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
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
  const friendship = await Friend.findOne({
    $or: [
      { requesterId: userId, recipientId: friendId, status: 'accepted' },
      { requesterId: friendId, recipientId: userId, status: 'accepted' },
    ],
  })
    .populate('requesterId', 'name email profilePicture isActive lastSeen')
    .populate('recipientId', 'name email profilePicture isActive lastSeen');

  if (!friendship) {
    throw new Error('Friendship not found');
  }

  const isRequester = friendship.requesterId.toString() === userId;
  const friendUser = isRequester 
    ? (friendship.recipientId as unknown as IUser)
    : (friendship.requesterId as unknown as IUser);

  return {
    id: friendUser._id.toString(),
    name: friendUser.name,
    email: friendUser.email,
    profilePicture: friendUser.profilePicture,
    status: friendship.status as 'accepted',
    isRequester,
    createdAt: friendship.createdAt,
    isActive: friendUser.isActive,
    lastSeen: friendUser.lastSeen,
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

