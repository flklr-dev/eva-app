import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCleanedApiBaseUrl } from '../utils/apiConfig';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationService {
  registerForPushNotifications: () => Promise<string | null>;
  subscribeToPushNotifications: (token: string, apiToken: string) => Promise<boolean>;
  unsubscribeFromPushNotifications: (token: string, apiToken: string) => Promise<boolean>;
}

// Request permission and get Expo Push Token
export const registerForPushNotifications = async (): Promise<string | null> => {
  let token = null;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#86EFAC',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });
    }
  } else {
    console.log('Must use physical device for Push Notifications');
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
