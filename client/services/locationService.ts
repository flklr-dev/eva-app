import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

/**
 * Request location permissions with proper error handling
 */
export const requestLocationPermission = async (): Promise<LocationPermissionStatus> => {
  try {
    // Check if location services are enabled
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        granted: false,
        canAskAgain: false,
        message: 'Location services are disabled. Please enable them in your device settings.',
      };
    }

    // Request foreground permissions
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

    if (status === 'granted') {
      return {
        granted: true,
        canAskAgain: true,
      };
    }

    if (status === 'denied' && !canAskAgain) {
      return {
        granted: false,
        canAskAgain: false,
        message: 'Location permission was denied. Please enable it in your device settings to use EVA Alert.',
      };
    }

    return {
      granted: false,
      canAskAgain: true,
      message: 'Location permission is required for EVA Alert to work properly.',
    };
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return {
      granted: false,
      canAskAgain: true,
      message: 'An error occurred while requesting location permission.',
    };
  }
};

/**
 * Get current location with error handling
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // Check permission status first
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Good balance between accuracy and battery
      timeInterval: 0,
      distanceInterval: 0,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Watch user's location (for real-time updates)
 */
export const watchLocation = (
  callback: (location: LocationData) => void,
  errorCallback?: (error: Error) => void
): (() => void) => {
  let subscription: Location.LocationSubscription | null = null;

  const startWatching = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        errorCallback?.(new Error('Location permission not granted'));
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            timestamp: location.timestamp,
          });
        }
      );
    } catch (error) {
      console.error('Error watching location:', error);
      errorCallback?.(error as Error);
    }
  };

  startWatching();

  // Return cleanup function
  return () => {
    if (subscription) {
      subscription.remove();
      subscription = null;
    }
  };
};

/**
 * Open device settings for location permissions
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Error opening settings:', error);
    Alert.alert(
      'Open Settings',
      'Please manually open your device settings and enable location permissions for EVA Alert.',
      [{ text: 'OK' }]
    );
  }
};

