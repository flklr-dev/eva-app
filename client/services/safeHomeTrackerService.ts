import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { calculateDistance } from '../utils/distanceCalculator';
import { sendSafeHomeNotification } from './friendService';

const SAFE_HOME_TASK = 'SAFE_HOME_BACKGROUND_LOCATION';
const STORAGE_KEY_STATE = '@safe_home_state';
const STORAGE_KEY_HOME = '@safe_home_address';
const STORAGE_KEY_LAST_CHECK = '@safe_home_last_check';
const STORAGE_KEY_RETURN_READINGS = '@safe_home_return_readings';

// Configuration constants
const EXIT_THRESHOLD_METERS = 200; // User must go at least 200m away
const ENTRY_THRESHOLD_METERS = 100; // User must be within 100m to be "home"
const LOCATION_UPDATE_INTERVAL = 45000; // 45 seconds
const REQUIRED_CONSECUTIVE_READINGS = 2; // Require 2 consecutive readings within threshold
const MIN_TIME_BETWEEN_NOTIFICATIONS = 3600000; // 1 hour minimum between notifications

export enum SafeHomeState {
  HOME = 'HOME',
  AWAY = 'AWAY',
  DISABLED = 'DISABLED'
}

interface HomeAddress {
  latitude: number;
  longitude: number;
  address: string;
}

interface SafeHomeTrackerState {
  currentState: SafeHomeState;
  lastNotificationTime: number;
  consecutiveHomeReadings: number;
}

/**
 * Calculate distance between two coordinates in meters
 */
function getDistanceFromHome(
  currentLat: number,
  currentLng: number,
  homeLat: number,
  homeLng: number
): number {
  return calculateDistance(
    currentLat,
    currentLng,
    homeLat,
    homeLng
  );
}

/**
 * Load home address from storage
 */
async function loadHomeAddress(): Promise<HomeAddress | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_HOME);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('[SafeHomeTracker] Error loading home address:', error);
    return null;
  }
}

/**
 * Load tracker state from storage
 */
async function loadTrackerState(): Promise<SafeHomeTrackerState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_STATE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[SafeHomeTracker] Error loading state:', error);
  }
  
  return {
    currentState: SafeHomeState.HOME,
    lastNotificationTime: 0,
    consecutiveHomeReadings: 0,
  };
}

/**
 * Save tracker state to storage
 */
async function saveTrackerState(state: SafeHomeTrackerState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch (error) {
    console.error('[SafeHomeTracker] Error saving state:', error);
  }
}

/**
 * Process location update and manage state transitions
 */
async function processLocationUpdate(
  latitude: number,
  longitude: number,
  token: string
): Promise<void> {
  console.log('[SafeHomeTracker] Processing location update:', { latitude, longitude });

  // Load home address
  const homeAddress = await loadHomeAddress();
  if (!homeAddress) {
    console.log('[SafeHomeTracker] No home address set, skipping tracking');
    return;
  }

  // Load current state
  const state = await loadTrackerState();
  
  // Calculate distance from home
  const distanceFromHome = getDistanceFromHome(
    latitude,
    longitude,
    homeAddress.latitude,
    homeAddress.longitude
  );

  console.log('[SafeHomeTracker] Distance from home:', distanceFromHome.toFixed(2), 'm');
  console.log('[SafeHomeTracker] Current state:', state.currentState);

  const previousState = state.currentState;
  
  // State machine logic
  switch (state.currentState) {
    case SafeHomeState.HOME:
      // Check if user has left home
      if (distanceFromHome > EXIT_THRESHOLD_METERS) {
        console.log('[SafeHomeTracker] User has left home (distance > exit threshold)');
        state.currentState = SafeHomeState.AWAY;
        state.consecutiveHomeReadings = 0;
        await saveTrackerState(state);
      } else {
        console.log('[SafeHomeTracker] User is still at home');
      }
      break;

    case SafeHomeState.AWAY:
      // Check if user is returning home
      if (distanceFromHome <= ENTRY_THRESHOLD_METERS) {
        console.log('[SafeHomeTracker] User within entry threshold, consecutive readings:', state.consecutiveHomeReadings + 1);
        
        state.consecutiveHomeReadings += 1;
        
        // Require consecutive readings to avoid false triggers
        if (state.consecutiveHomeReadings >= REQUIRED_CONSECUTIVE_READINGS) {
          console.log('[SafeHomeTracker] User has returned home! Triggering notification...');
          
          // Check if enough time has passed since last notification
          const timeSinceLastNotification = Date.now() - state.lastNotificationTime;
          if (timeSinceLastNotification >= MIN_TIME_BETWEEN_NOTIFICATIONS) {
            // Send safe home notification to friends
            try {
              await sendSafeHomeNotification(token);
              console.log('[SafeHomeTracker] Safe home notification sent successfully');
              
              // Update state
              state.currentState = SafeHomeState.HOME;
              state.lastNotificationTime = Date.now();
              state.consecutiveHomeReadings = 0;
              await saveTrackerState(state);
            } catch (error) {
              console.error('[SafeHomeTracker] Error sending safe home notification:', error);
              // Don't update state if notification failed
            }
          } else {
            console.log('[SafeHomeTracker] Notification cooldown active, skipping notification');
            // Still transition to HOME state, just don't send notification
            state.currentState = SafeHomeState.HOME;
            state.consecutiveHomeReadings = 0;
            await saveTrackerState(state);
          }
        } else {
          // Save incremented consecutive readings
          await saveTrackerState(state);
        }
      } else {
        // User moved away again, reset consecutive readings
        if (state.consecutiveHomeReadings > 0) {
          console.log('[SafeHomeTracker] User moved away again, resetting consecutive readings');
          state.consecutiveHomeReadings = 0;
          await saveTrackerState(state);
        }
      }
      break;
  }
}

/**
 * Define the background task for location tracking
 */
TaskManager.defineTask(SAFE_HOME_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[SafeHomeTracker] Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    if (locations && locations.length > 0) {
      const location = locations[0];
      console.log('[SafeHomeTracker] Background location update:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Get auth token
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          console.warn('[SafeHomeTracker] No auth token found, skipping processing');
          return;
        }

        // Process the location update
        await processLocationUpdate(
          location.coords.latitude,
          location.coords.longitude,
          token
        );

        // Update last check time
        await AsyncStorage.setItem(STORAGE_KEY_LAST_CHECK, Date.now().toString());
      } catch (error) {
        console.error('[SafeHomeTracker] Error in background task:', error);
      }
    }
  }
});

/**
 * Start safe home tracking
 */
export async function startSafeHomeTracking(homeAddress: {
  latitude: number;
  longitude: number;
  address: string;
}): Promise<boolean> {
  try {
    console.log('[SafeHomeTracker] Starting safe home tracking...');

    // Request background location permissions
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.warn('[SafeHomeTracker] Foreground permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.warn('[SafeHomeTracker] Background permission not granted');
      return false;
    }

    // Save home address
    await AsyncStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(homeAddress));
    
    // Initialize state
    const state: SafeHomeTrackerState = {
      currentState: SafeHomeState.HOME,
      lastNotificationTime: 0,
      consecutiveHomeReadings: 0,
    };
    await saveTrackerState(state);

    // Check if task is already running
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SAFE_HOME_TASK);
    if (isRegistered) {
      console.log('[SafeHomeTracker] Task already registered, stopping first...');
      await Location.stopLocationUpdatesAsync(SAFE_HOME_TASK);
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(SAFE_HOME_TASK, {
      accuracy: Location.Accuracy.Balanced, // Good balance of accuracy and battery
      timeInterval: LOCATION_UPDATE_INTERVAL, // 45 seconds
      distanceInterval: 50, // Update if user moves 50m
      showsBackgroundLocationIndicator: Platform.OS === 'ios',
      foregroundService: Platform.OS === 'android' ? {
        notificationTitle: 'EVA Alert - Safe Home Tracking',
        notificationBody: 'Monitoring your location for safe home notifications',
        notificationColor: '#FF6B6B',
      } : undefined,
    });

    console.log('[SafeHomeTracker] Background location tracking started successfully');
    return true;
  } catch (error) {
    console.error('[SafeHomeTracker] Error starting safe home tracking:', error);
    return false;
  }
}

/**
 * Stop safe home tracking
 */
export async function stopSafeHomeTracking(): Promise<boolean> {
  try {
    console.log('[SafeHomeTracker] Stopping safe home tracking...');

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SAFE_HOME_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(SAFE_HOME_TASK);
    }

    // Clear state but keep home address
    const state: SafeHomeTrackerState = {
      currentState: SafeHomeState.DISABLED,
      lastNotificationTime: 0,
      consecutiveHomeReadings: 0,
    };
    await saveTrackerState(state);

    console.log('[SafeHomeTracker] Safe home tracking stopped');
    return true;
  } catch (error) {
    console.error('[SafeHomeTracker] Error stopping safe home tracking:', error);
    return false;
  }
}

/**
 * Check if safe home tracking is active
 */
export async function isSafeHomeTrackingActive(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SAFE_HOME_TASK);
    if (!isRegistered) return false;

    const state = await loadTrackerState();
    return state.currentState !== SafeHomeState.DISABLED;
  } catch (error) {
    console.error('[SafeHomeTracker] Error checking tracking status:', error);
    return false;
  }
}

/**
 * Get current safe home state
 */
export async function getSafeHomeState(): Promise<SafeHomeTrackerState> {
  return loadTrackerState();
}

/**
 * Update home address (useful when user changes their home address)
 */
export async function updateHomeAddress(homeAddress: {
  latitude: number;
  longitude: number;
  address: string;
}): Promise<void> {
  try {
    console.log('[SafeHomeTracker] Updating home address...');
    await AsyncStorage.setItem(STORAGE_KEY_HOME, JSON.stringify(homeAddress));
    
    // Reset state to HOME when address changes
    const state: SafeHomeTrackerState = {
      currentState: SafeHomeState.HOME,
      lastNotificationTime: 0,
      consecutiveHomeReadings: 0,
    };
    await saveTrackerState(state);
    
    console.log('[SafeHomeTracker] Home address updated, state reset to HOME');
  } catch (error) {
    console.error('[SafeHomeTracker] Error updating home address:', error);
  }
}

/**
 * Clear all safe home tracking data
 */
export async function clearSafeHomeData(): Promise<void> {
  try {
    await stopSafeHomeTracking();
    await AsyncStorage.removeItem(STORAGE_KEY_HOME);
    await AsyncStorage.removeItem(STORAGE_KEY_STATE);
    await AsyncStorage.removeItem(STORAGE_KEY_LAST_CHECK);
    await AsyncStorage.removeItem(STORAGE_KEY_RETURN_READINGS);
    console.log('[SafeHomeTracker] All safe home data cleared');
  } catch (error) {
    console.error('[SafeHomeTracker] Error clearing safe home data:', error);
  }
}

