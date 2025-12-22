import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../utils/apiConfig';

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
 * Optimized for Android: tries last known location first for faster response
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // Check permission status first
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    // On Android, try to get last known location first for faster initial response
    if (Platform.OS === 'android') {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        // If last known location is less than 60 seconds old, use it
        const age = Date.now() - lastKnown.timestamp;
        if (age < 60000) {
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy || undefined,
            timestamp: lastKnown.timestamp,
          };
        }
      }
    }

    // Get current position with lower accuracy for faster response on Android
    const location = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' ? Location.Accuracy.Low : Location.Accuracy.Balanced,
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

/**
 * Upload user's location to the server
 * This allows friends to see the user's location
 */
export const uploadLocationToServer = async (
  location: LocationData,
  token: string
): Promise<boolean> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/profile/location`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      }),
    });

    if (!response.ok) {
      console.error('[Location] Failed to upload location to server:', response.status);
      return false;
    }

    console.log('[Location] Location uploaded to server successfully');
    return true;
  } catch (error) {
    console.error('[Location] Error uploading location to server:', error);
    return false;
  }
};

/**
 * Start location sharing - watches location and uploads to server periodically
 */
export const startLocationSharing = (
  token: string,
  onLocationUpdate?: (location: LocationData) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let lastUploadTime = 0;
  const UPLOAD_INTERVAL = 60000; // Upload every 60 seconds minimum

  console.log('[Location] Starting location sharing...');

  const cleanup = watchLocation(
    async (location) => {
      // Notify callback of location update
      onLocationUpdate?.(location);

      // Upload to server at intervals
      const now = Date.now();
      if (now - lastUploadTime >= UPLOAD_INTERVAL) {
        lastUploadTime = now;
        await uploadLocationToServer(location, token);
      }
    },
    (error) => {
      console.error('[Location] Location watch error:', error);
      onError?.(error);
    }
  );

  // Upload initial location immediately
  getCurrentLocation().then((location) => {
    if (location && token) {
      uploadLocationToServer(location, token);
      lastUploadTime = Date.now();
    }
  });

  return cleanup;
};

