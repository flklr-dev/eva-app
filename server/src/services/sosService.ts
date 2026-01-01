import { Types } from 'mongoose';
import SOSAlert, { ISOSAlert } from '../models/SOSAlert';
import User, { IUser } from '../models/User';
import Friend from '../models/Friend';
import { sendPushNotificationsToUsers } from './notificationService';
import { findNearbyUsers } from './profileService';

/**
 * Create and send an SOS alert
 * Includes friends and optionally nearby users (if shareWithEveryone is enabled)
 */
export const createSOSAlert = async (
  userId: string,
  latitude: number,
  longitude: number,
  message?: string
): Promise<ISOSAlert> => {
  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Invalid coordinates');
  }

  // Get user to check settings
  const user = await User.findById(userId).select('name settings');
  if (!user) {
    throw new Error('User not found');
  }

  // Get all friends
  const friendships = await Friend.find({
    $or: [
      { requesterId: userId, status: 'accepted' },
      { recipientId: userId, status: 'accepted' },
    ],
  });

  const friendIds = friendships.map((friendship) => {
    return friendship.requesterId.toString() === userId
      ? friendship.recipientId.toString()
      : friendship.requesterId.toString();
  });

  let recipientIds = [...friendIds];

  // If user has shareWithEveryone enabled, also include nearby users
  if (user.settings?.shareWithEveryone) {
    try {
      const nearbyUsers = await findNearbyUsers(userId, latitude, longitude, 5000); // 5km radius
      const nearbyUserIds = nearbyUsers.map((user) => user.id);
      
      // Combine friends and nearby users, remove duplicates
      recipientIds = [...new Set([...friendIds, ...nearbyUserIds])];
      
      console.log(`[SOS] Including ${nearbyUsers.length} nearby users in SOS alert`);
    } catch (error) {
      console.error('[SOS] Error finding nearby users:', error);
      // Continue with just friends if nearby user lookup fails
    }
  }

  // Remove self from recipients
  recipientIds = recipientIds.filter((id) => id !== userId);

  if (recipientIds.length === 0) {
    throw new Error('No recipients available for SOS alert');
  }

  // Create SOS alert
  const sosAlert = new SOSAlert({
    userId: new Types.ObjectId(userId),
    coordinates: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON format: [lng, lat]
    },
    status: 'active',
    recipients: recipientIds.map((id) => new Types.ObjectId(id)),
    message: message || undefined,
  });

  const savedAlert = await sosAlert.save();

  // Send push notifications to all recipients
  const userName = user.name || 'Someone';
  const alertMessage = message || `${userName} needs help!`;
  
  try {
    await sendPushNotificationsToUsers(
      recipientIds,
      '🚨 SOS Alert',
      alertMessage,
      {
        eventType: 'sos_alert',
        alertId: savedAlert._id.toString(),
        userId: userId,
        userName: userName,
        latitude: latitude,
        longitude: longitude,
        message: message,
      }
    );
    console.log(`[SOS] Push notifications sent to ${recipientIds.length} recipients`);
  } catch (error) {
    console.error('[SOS] Error sending push notifications:', error);
    // Don't fail the SOS creation if notifications fail
  }

  return savedAlert;
};

/**
 * Get active SOS alerts for a user (alerts they sent)
 */
export const getActiveSOSAlerts = async (userId: string): Promise<ISOSAlert[]> => {
  return await SOSAlert.find({
    userId: new Types.ObjectId(userId),
    status: 'active',
  })
    .sort({ sentAt: -1 })
    .limit(10);
};

/**
 * Get SOS alerts received by a user
 */
export const getReceivedSOSAlerts = async (userId: string): Promise<ISOSAlert[]> => {
  return await SOSAlert.find({
    recipients: new Types.ObjectId(userId),
    status: 'active',
  })
    .populate('userId', 'name profilePicture')
    .sort({ sentAt: -1 })
    .limit(20);
};

/**
 * Cancel an SOS alert
 */
export const cancelSOSAlert = async (alertId: string, userId: string): Promise<ISOSAlert> => {
  const alert = await SOSAlert.findOne({
    _id: alertId,
    userId: new Types.ObjectId(userId),
    status: 'active',
  });

  if (!alert) {
    throw new Error('SOS alert not found or already resolved/cancelled');
  }

  alert.status = 'cancelled';
  alert.cancelledAt = new Date();
  return await alert.save();
};

/**
 * Resolve an SOS alert (mark as resolved)
 */
export const resolveSOSAlert = async (alertId: string, userId: string): Promise<ISOSAlert> => {
  const alert = await SOSAlert.findOne({
    _id: alertId,
    userId: new Types.ObjectId(userId),
    status: 'active',
  });

  if (!alert) {
    throw new Error('SOS alert not found or already resolved/cancelled');
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  return await alert.save();
};


