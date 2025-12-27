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
    console.log(`[Notifications] ========== SENDING PUSH NOTIFICATION ==========`);
    console.log(`[Notifications] Target user ID: ${userId}`);
    console.log(`[Notifications] Title: ${title}`);
    console.log(`[Notifications] Body: ${body}`);
    console.log(`[Notifications] Data:`, data);
    
    // Find active subscription for the user
    const subscription = await NotificationSubscription.findOne({
      userId,
      isActive: true,
    });

    if (!subscription) {
      console.log(`[Notifications] No active subscription found for user ${userId}`);
      console.log(`[Notifications] ================================================`);
      return;
    }
    
    console.log(`[Notifications] Found subscription for user ${userId}`);
    console.log(`[Notifications] Push token: ${subscription.pushToken.substring(0, 30)}...`);
    console.log(`[Notifications] Device type: ${subscription.deviceType}`);

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
    
    console.log(`[Notifications] Sending to Expo push service...`);

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
    console.log(`[Notifications] Expo response:`, JSON.stringify(responseData, null, 2));
    
    if (responseData.errors) {
      console.error('[Notifications] Expo push notification errors:', responseData.errors);
      // Log specific error details
      responseData.errors.forEach((error: any) => {
        console.error(`[Notifications] Expo error - ${error.code}: ${error.message}`);
      });
    } else if (responseData.data) {
      // Check individual ticket status
      responseData.data.forEach((ticket: any, index: number) => {
        if (ticket.status === 'ok') {
          console.log(`[Notifications] ✓ Ticket ${index}: OK - ID: ${ticket.id}`);
        } else {
          console.error(`[Notifications] ✗ Ticket ${index}: ERROR - ${ticket.message}`);
          if (ticket.details?.error) {
            console.error(`[Notifications] Error details: ${ticket.details.error}`);
          }
        }
      });
      console.log(`[Notifications] Push notification sent successfully to user ${userId}`);
    }
    console.log(`[Notifications] ================================================`);
  } catch (error) {
    console.error(`[Notifications] Error sending push notification to user ${userId}:`, error);
    console.log(`[Notifications] ================================================`);
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