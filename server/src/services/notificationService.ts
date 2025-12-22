import { NotificationSubscription } from '../models/NotificationSubscription';

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  channelId?: string;
}

/**
 * Send push notification to a specific user via Expo Push Notification service
 */
export const sendPushNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // Find active subscription for the user
    const subscription = await NotificationSubscription.findOne({
      userId,
      isActive: true,
    });

    if (!subscription) {
      console.log(`[Notifications] No active subscription found for user ${userId}`);
      return;
    }

    // Prepare Expo push notification
    const message: PushMessage = {
      to: subscription.pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      channelId: 'default',
    };

    // Send to Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([message]), // Expo expects an array of messages
    });

    const responseData: any = await response.json();
    
    if (responseData.errors) {
      console.error('[Notifications] Expo push notification errors:', responseData.errors);
      // Log specific error details
      responseData.errors.forEach((error: any) => {
        console.error(`[Notifications] Expo error - ${error.code}: ${error.message}`);
      });
    } else {
      console.log(`[Notifications] Push notification sent successfully to user ${userId}`);
    }
  } catch (error) {
    console.error(`[Notifications] Error sending push notification to user ${userId}:`, error);
  }
};

/**
 * Send push notifications to multiple users
 */
export const sendPushNotificationsToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    // Find active subscriptions for the users
    const subscriptions = await NotificationSubscription.find({
      userId: { $in: userIds },
      isActive: true,
    });

    if (subscriptions.length === 0) {
      console.log(`[Notifications] No active subscriptions found for users`, userIds);
      return;
    }

    // Prepare Expo push notifications
    const messages: PushMessage[] = subscriptions.map(sub => ({
      to: sub.pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      badge: 1,
      channelId: 'default',
    }));

    // Send to Expo Push Notification service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const responseData: any = await response.json();
    
    if (responseData.errors) {
      console.error('[Notifications] Expo push notification errors:', responseData.errors);
      // Log specific error details
      responseData.errors.forEach((error: any) => {
        console.error(`[Notifications] Expo error - ${error.code}: ${error.message}`);
      });
    } else {
      console.log(`[Notifications] Push notifications sent successfully to ${subscriptions.length} users`);
    }
  } catch (error) {
    console.error(`[Notifications] Error sending push notifications to users:`, error);
  }
};