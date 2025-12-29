import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCleanedApiBaseUrl } from '../utils/apiConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[NotificationHandler] Received notification:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export interface NotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  subscribeToPushNotifications: (token: string, apiToken: string) => Promise<boolean>;
  unsubscribeFromPushNotifications: (token: string, apiToken: string) => Promise<boolean>;
}

// Request permission and get Expo Push Token
export const registerForPushNotifications = async (): Promise<string | null> => {
  let token = null;

  console.log('[Notifications] Starting push notification registration...');
  console.log('[Notifications] Is device:', Device.isDevice);
  console.log('[Notifications] Platform:', Platform.OS);

  if (Device.isDevice) {
    console.log('[Notifications] Checking current permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Notifications] Current permission status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Notifications] Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Notifications] Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.error('[Notifications] ❌ Permission denied! Status:', finalStatus);
      console.error('[Notifications] Push notifications will not work without permission');
      return null;
    }

    console.log('[Notifications] ✅ Permission granted, getting push token...');

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      console.log('[Notifications] Project ID from config:', projectId);

      if (!projectId) {
        console.error('[Notifications] ❌ No project ID found in app config!');
        console.error('[Notifications] expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));
        return null;
      }

      console.log('[Notifications] Requesting Expo push token...');
      const pushTokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
      token = pushTokenResult.data;
      console.log('[Notifications] ✅ Expo Push Token obtained:', token?.substring(0, 20) + '...');

      // Validate token format
      if (!token || !token.startsWith('ExponentPushToken[')) {
        console.error('[Notifications] ❌ Invalid token format:', token);
        return null;
      }

    } catch (error) {
      console.error('[Notifications] ❌ Error getting push token:', error);
      return null;
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      console.log('[Notifications] Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#86EFAC',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
      console.log('[Notifications] ✅ Android notification channel set up');
    }

    console.log('[Notifications] ✅ Push notification registration completed successfully');
  } else {
    console.warn('[Notifications] ⚠️ Must use physical device for Push Notifications');
    console.warn('[Notifications] Expo Go has limited push notification support');
  }

  return token;
};

// Subscribe to notifications via backend
export const subscribeToPushNotifications = async (
  pushToken: string,
  apiToken: string
): Promise<boolean> => {
  try {
    const deviceType = Platform.OS as 'ios' | 'android';
    // Use consistent API URL from shared config
    const API_URL = getCleanedApiBaseUrl();

    const response = await fetch(`${API_URL}/api/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,  // Fixed header format
      },
      body: JSON.stringify({
        pushToken,
        deviceType,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Subscribe error:', error);
      return false;
    }

    const data = await response.json();
    console.log('Subscribed to notifications:', data);
    return true;
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return false;
  }
};

// Unsubscribe from notifications via backend
export const unsubscribeFromPushNotifications = async (
  pushToken: string,
  apiToken: string
): Promise<boolean> => {
  try {
    // Use consistent API URL from shared config
    const API_URL = getCleanedApiBaseUrl();

    const response = await fetch(`${API_URL}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,  // Fixed header format
      },
      body: JSON.stringify({
        pushToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Unsubscribe error:', error);
      return false;
    }

    const data = await response.json();
    console.log('Unsubscribed from notifications:', data);
    return true;
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return false;
  }
};

// Add notification listeners
export const addNotificationListeners = (
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) => {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};

// Get subscription status from server
export const getSubscriptionStatus = async (
  apiToken: string
): Promise<boolean | null> => {
  try {
    // Use consistent API URL from shared config
    const API_URL = getCleanedApiBaseUrl();

    const response = await fetch(`${API_URL}/api/notifications/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,  // Fixed header format
      },
    });

    if (!response.ok) {
      console.error('Get status error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Subscription status from server:', data);
    return data.isSubscribed;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }
};
