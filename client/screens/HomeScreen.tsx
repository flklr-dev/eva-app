import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, Modal, Platform, Animated, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/Button';
import { BottomNavBar, BottomTab } from '../components/BottomNavBar';
import { MapView, LatLng, Marker } from '../components/MapView';
import { useAuth } from '../context/AuthContext';
import { 
  registerForPushNotifications, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  addNotificationListeners,
  getSubscriptionStatus
} from '../services/notificationService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocationService from '../services/locationService';
import { Alert } from 'react-native';
import { ACTION_BUTTONS } from '../constants/quickActions';
import { COLORS, ANIMATION_CONFIG, SPACING } from '../constants/theme';
import { useSOSAnimation } from '../hooks/useSOSAnimation';
import { useHomeNotification } from '../hooks/useHomeNotification';
import { useQuickActionMode } from '../hooks/useQuickActionMode';
import type { QuickActionKey, HomeStatus } from '../types/quickActions';
import { QuickActionButton } from '../components/QuickActions';
import { SOSModePanel, LocationModePanel, MessageModePanel, FriendsListPanel, FriendRequestsPanel, FriendDetailsPanel, RoutePanel, ContactDetailsPanel, ActivityListPanel, DevicePanel } from '../components/BottomSheet';
import {
  StatusChip,
  BluetoothIndicator,
  HomeNotification,
  LocationPermissionModal,
  NotificationCancelModal,
} from '../components/LocationTab';
import { FriendsTab, FriendsTabRef } from '../components/FriendsTab';
import { ActivityTab } from '../components/ActivityTab';
import { DeviceTab } from '../components/DeviceTab';
import { ProfileTab } from '../components/ProfileTab';
import { Friend, FriendWithDistance } from '../types/friends';
import { Activity } from '../types/activity';
import { calculateDistance } from '../utils/distanceCalculator';
import { shareFriendInvite } from '../utils/shareUtils';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { getFriendRequests, getFriendsWithToken, removeFriend } from '../services/friendService';
import { reverseGeocode } from '../utils/geocoding';
import { initializeWebSocket, disconnectWebSocket, setOnFriendRequestReceived, setOnFriendRequestResponded, emitSafeHome } from '../services/webSocketService';

const backgroundImage = require('../assets/background.png');
const { width, height } = Dimensions.get('window');

const TABS: BottomTab[] = [
  { key: 'LOCATION', label: 'Location', icon: 'home-variant', iconFilled: 'home-variant' },
  { key: 'FRIENDS', label: 'Friends', icon: 'account-multiple', iconFilled: 'account-multiple' },
  { key: 'ACTIVITY', label: 'Activity', icon: 'bell', iconFilled: 'bell' },
  { key: 'DEVICE', label: 'Device', icon: 'bluetooth', iconFilled: 'bluetooth' },
  { key: 'PROFILE', label: 'Profile', icon: 'account', iconFilled: 'account' },
];

const PlaceholderTab: React.FC<{ name: string }> = ({ name }) => (
  <View style={styles.placeholderTab}>
    <View style={styles.placeholderIcon}><Text style={{ fontSize: 28 }}>🚧</Text></View>
    <Text style={styles.placeholderTitle}>{name}</Text>
    <Text style={styles.placeholderDesc}>This feature will be available in the full version.</Text>
  </View>
);

// Mock friend data - Located near Mati City, Davao Oriental
// Mock friends removed - now using real API data

// Mock activity data
const mockActivities: Activity[] = [
  {
    id: 'activity-1',
    userId: 'friend-1',
    userName: 'Emma',
    message: 'Message: Walking Alone',
    timeAgo: '5hr',
    location: 'Downtown',
    timestamp: new Date(),
  },
  {
    id: 'activity-2',
    userId: 'user',
    userName: 'You',
    message: 'You send Arrived Home to your contacts',
    timeAgo: '2hr',
    location: 'Home',
    timestamp: new Date(),
  },
  {
    id: 'activity-3',
    userId: 'friend-2',
    userName: 'Lucas',
    message: 'Message: Walking Alone',
    timeAgo: '1hr',
    location: 'Downtown',
    timestamp: new Date(),
  },
  {
    id: 'activity-4',
    userId: 'friend-3',
    userName: 'Maya',
    message: 'You send Arrived Home to your contacts',
    timeAgo: '30min',
    location: 'Home',
    timestamp: new Date(),
  },
];

// Friend markers will be generated from friendsWithDistance state

// ACTION_BUTTONS now imported from constants/quickActions.ts

const LocationTab: React.FC<{ 
  showHomeNotification?: boolean; 
  homeNotificationAnim?: Animated.Value; 
  onDismissNotification?: () => void;
  sharedUserLocation?: { latitude: number; longitude: number } | null;
  sharedLocationPermissionGranted?: boolean;
  onUserLocationChange?: (location: { latitude: number; longitude: number } | null) => void;
  onLocationPermissionChange?: (granted: boolean) => void;
  sharedInitialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  friends?: FriendWithDistance[];
}> = ({ 
  showHomeNotification = false, 
  homeNotificationAnim, 
  onDismissNotification,
  sharedUserLocation,
  sharedLocationPermissionGranted = false,
  onUserLocationChange,
  onLocationPermissionChange,
  sharedInitialRegion,
  friends = [],
}) => {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isNotified, setIsNotified] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use shared location state if provided, otherwise use local state
  const [localUserLocation, setLocalUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [localLocationPermissionGranted, setLocalLocationPermissionGranted] = useState(false);
  const userLocation = sharedUserLocation !== undefined ? sharedUserLocation : localUserLocation;
  const locationPermissionGranted = sharedLocationPermissionGranted !== undefined ? sharedLocationPermissionGranted : localLocationPermissionGranted;
  
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [locationPermissionMessage, setLocationPermissionMessage] = useState<string>('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(true);
  
  // Bluetooth state
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false); // false = red, true = green

  // Calculate online friends count (real-time)
  const onlineFriendsCount = useMemo(() => {
    return (friends || []).filter(friend => friend.status === 'online').length;
  }, [friends]);

  // Calculate initial region - always call useMemo to satisfy Rules of Hooks
  const calculatedInitialRegion = useMemo(() => {
    // ALWAYS focus on user location when available (LocationTab default view)
    // Friend markers will still be visible on the map
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    // Default fallback - generic Philippines location while loading
    // This will be updated once user's real location is obtained
    return {
      latitude: 14.5995, // Manila, Philippines
      longitude: 120.9842,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation]);

  // Use shared initial region if provided, otherwise use calculated region
  const initialRegion = sharedInitialRegion || calculatedInitialRegion;

  const loadNotificationState = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('pushToken');
      if (savedToken) setPushToken(savedToken);

      if (token) {
        const serverStatus = await getSubscriptionStatus(token);
        if (serverStatus !== null) {
          setIsNotified(serverStatus);
          await AsyncStorage.setItem('notificationState', JSON.stringify(serverStatus));
        } else {
          const savedState = await AsyncStorage.getItem('notificationState');
          if (savedState) setIsNotified(JSON.parse(savedState));
        }
      } else {
        const savedState = await AsyncStorage.getItem('notificationState');
        if (savedState) setIsNotified(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error loading notification state:', error);
      const savedState = await AsyncStorage.getItem('notificationState');
      if (savedState) setIsNotified(JSON.parse(savedState));
    }
  };



  // Request location permission and get location on mount
  useEffect(() => {
    requestLocationPermissionAndFetch();
  }, []);

  const requestLocationPermissionAndFetch = async () => {
    try {
      setIsRequestingLocation(true);
      
      // Request permission
      const permissionStatus = await LocationService.requestLocationPermission();
      
      if (permissionStatus.granted) {
        const granted = true;
        if (onLocationPermissionChange) {
          onLocationPermissionChange(granted);
        } else {
          setLocalLocationPermissionGranted(granted);
        }
        
        // Get current location
        const location = await LocationService.getCurrentLocation();
        
        if (location) {
          const locationData = {
            latitude: location.latitude,
            longitude: location.longitude,
          };
          if (onUserLocationChange) {
            onUserLocationChange(locationData);
          } else {
            setLocalUserLocation(locationData);
          }
        } else {
          // Location fetch failed but permission granted - show error
          setLocationPermissionMessage('Unable to get your location. Please ensure location services are enabled.');
          setShowLocationPermissionModal(true);
        }
      } else {
        // Permission denied
        const granted = false;
        if (onLocationPermissionChange) {
          onLocationPermissionChange(granted);
        } else {
          setLocalLocationPermissionGranted(granted);
        }
        setLocationPermissionMessage(
          permissionStatus.message || 
          'Location permission is required for EVA Alert to work. Please enable it in your device settings.'
        );
        setShowLocationPermissionModal(true);
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      setLocationPermissionMessage('An error occurred while requesting location access.');
      setShowLocationPermissionModal(true);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleOpenSettings = async () => {
    await LocationService.openLocationSettings();
    setShowLocationPermissionModal(false);
  };

  const handleRetryLocation = async () => {
    setShowLocationPermissionModal(false);
    await requestLocationPermissionAndFetch();
  };



  const handleNotifyToggle = async () => {
    if (isNotified) {
      setShowCancelModal(true);
    } else {
      await enableNotifications();
    }
  };

  const enableNotifications = async () => {
    try {
      setIsProcessing(true);
      let expoPushToken = pushToken;
      if (!expoPushToken) {
        expoPushToken = await registerForPushNotifications();
        if (!expoPushToken) {
          console.error('Failed to get push token');
          setIsProcessing(false);
          return;
        }
        setPushToken(expoPushToken);
        await AsyncStorage.setItem('pushToken', expoPushToken);
      }

      if (token) {
        const success = await subscribeToPushNotifications(expoPushToken, token);
        if (success) {
          setIsNotified(true);
          await AsyncStorage.setItem('notificationState', 'true');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmCancel = async () => {
    try {
      setIsProcessing(true);
      if (pushToken && token) {
        const success = await unsubscribeFromPushNotifications(pushToken, token);
        if (success) {
          setIsNotified(false);
          await AsyncStorage.setItem('notificationState', 'false');
        }
      }
    } catch (error) {
      console.error('Error canceling notifications:', error);
    } finally {
      setIsProcessing(false);
      setShowCancelModal(false);
    }
  };

  const dismissModal = () => {
    setShowCancelModal(false);
  };

  return (
    <>
      <View style={styles.mapWrapper}>
        {isRequestingLocation ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Requesting location access...</Text>
      </View>
        ) : (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation={locationPermissionGranted}
            userLocation={userLocation}
            userProfilePicture={user?.profilePicture}
            userName={user?.name}
            markers={(friends || []).map((friend: FriendWithDistance) => ({
              id: friend.id,
              coordinate: friend.coordinate,
              name: friend.name,
              status: friend.status,
              profilePicture: friend.profilePicture,
            }))}
          />
        )}

        {locationPermissionGranted && (
          <>
            {/* Home Notification - Above status chip */}
            {showHomeNotification && homeNotificationAnim && (
              <HomeNotification
                animValue={homeNotificationAnim}
                onDismiss={() => onDismissNotification?.()}
                topOffset={insets.top + 8 - 15}
              />
            )}

              <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
                <StatusChip
                  friendCount={onlineFriendsCount}
                  onDropdownPress={() => console.log('Dropdown pressed')}
                />
              <BluetoothIndicator isConnected={isBluetoothConnected} />
            </View>
          </>
        )}
          </View>

      <LocationPermissionModal
        visible={showLocationPermissionModal}
        message={locationPermissionMessage}
        onRequestClose={() => setShowLocationPermissionModal(false)}
        onRetry={handleRetryLocation}
        onOpenSettings={handleOpenSettings}
      />

      <NotificationCancelModal
        visible={showCancelModal}
        onRequestClose={dismissModal}
        onConfirm={confirmCancel}
      />
    </>
  );
};


export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('LOCATION');
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const websocketInitializedRef = useRef(false);
  
  // Shared user location state - used by all tabs for consistent map view
  const [sharedUserLocation, setSharedUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sharedLocationPermissionGranted, setSharedLocationPermissionGranted] = useState(false);
  
  // Shared map region calculation - same for all tabs (consistent zoom level)
  const sharedInitialRegion = useMemo(() => {
    if (sharedUserLocation) {
      return {
        latitude: sharedUserLocation.latitude,
        longitude: sharedUserLocation.longitude,
        latitudeDelta: 0.01, // Consistent zoom level across all tabs
        longitudeDelta: 0.01, // Consistent zoom level across all tabs
      };
    }
    // Return null when no user location - let tabs handle the empty state
    return undefined;
  }, [sharedUserLocation]);
  
  // Friends with distance state (loaded from API)
  const [friendsWithDistance, setFriendsWithDistance] = useState<FriendWithDistance[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  const handleFriendsWithDistanceChange = useCallback((friends: FriendWithDistance[]) => {
    setFriendsWithDistance(friends);
  }, []);
  
  const friendsTabRef = React.useRef<FriendsTabRef | null>(null);
  
  // Selected friend state for showing FriendDetailsPanel
  const [selectedFriend, setSelectedFriend] = useState<FriendWithDistance | null>(null);
  
  // Route state for showing RoutePanel
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [routeFriend, setRouteFriend] = useState<FriendWithDistance | null>(null);
  
  // Contact details state for showing ContactDetailsPanel
  const [showContactDetailsPanel, setShowContactDetailsPanel] = useState(false);
  const [contactDetailsFriend, setContactDetailsFriend] = useState<FriendWithDistance | null>(null);
  
  const handleFriendPress = (friend: FriendWithDistance) => {
    // Navigate map to friend location
    if (friendsTabRef.current) {
      friendsTabRef.current.navigateToFriend(friend);
    }
    // Set selected friend to show details panel
    setSelectedFriend(friend);
  };
  
  const handleCloseFriendDetails = () => {
    // Clear selected friend
    setSelectedFriend(null);
    // Reset map view to show all friends after a small delay
    // This ensures the panel animation completes before map reset
    setTimeout(() => {
      if (friendsTabRef.current) {
        friendsTabRef.current.resetMapView();
      }
    }, 50);
  };
  
  const handleContactDetails = (friend: FriendWithDistance) => {
    console.log('Contact details pressed for:', friend.name);
    // Keep the selected friend to allow navigation back to details
    setContactDetailsFriend(friend);
    setShowContactDetailsPanel(true);
  };
  
  const handleRoute = (friend: FriendWithDistance) => {
    console.log('Route pressed for:', friend.name);
    // Keep the selected friend to allow navigation back to details
    setRouteFriend(friend);
    setShowRoutePanel(true);
    
    // Show initial route with default mode (car) after panel animation starts
    setTimeout(() => {
      if (friendsTabRef.current && sharedUserLocation) {
        friendsTabRef.current.showRoute(
          sharedUserLocation,
          friend.coordinate,
          'car'
        );
      }
    }, 100);
  };
  
  const handleTransportModeChange = (mode: string, routeData: any) => {
    // Update route on map when transport mode changes
    if (friendsTabRef.current && sharedUserLocation && routeFriend) {
      friendsTabRef.current.showRoute(
        sharedUserLocation,
        routeFriend.coordinate,
        mode
      );
    }
  };
  
  const handleCloseRoutePanel = () => {
    setShowRoutePanel(false);
    setRouteFriend(null);
    // Clear route from map and reset map view
    if (friendsTabRef.current) {
      friendsTabRef.current.clearRoute();
    }
    // Reset map view to default after a small delay
    setTimeout(() => {
      if (friendsTabRef.current) {
        friendsTabRef.current.resetMapView();
      }
    }, 50);
  };
  
  const handleBackToDetailsFromRoute = () => {
    setShowRoutePanel(false);
    // Set the selected friend to the route friend to show the details panel
    if (routeFriend) {
      setSelectedFriend(routeFriend);
    }
    // Reset map view to focus on the friend
    setTimeout(() => {
      if (friendsTabRef.current && routeFriend) {
        friendsTabRef.current.navigateToFriend(routeFriend);
      }
    }, 50);
  };
  
  const handleCloseContactDetailsPanel = () => {
    setShowContactDetailsPanel(false);
    setContactDetailsFriend(null);
    // Reset map view to default after a small delay
    setTimeout(() => {
      if (friendsTabRef.current) {
        friendsTabRef.current.resetMapView();
      }
    }, 50);
  };
  
  const handleBackToDetailsFromContact = () => {
    setShowContactDetailsPanel(false);
    // Set the selected friend to the contact details friend to show the details panel
    if (contactDetailsFriend) {
      setSelectedFriend(contactDetailsFriend);
    }
    // Reset map view to focus on the friend
    setTimeout(() => {
      if (friendsTabRef.current && contactDetailsFriend) {
        friendsTabRef.current.navigateToFriend(contactDetailsFriend);
      }
    }, 50);
  };
  
  const handleRemoveFriend = async (friend: FriendWithDistance) => {
    console.log('Remove friend pressed for:', friend.name);
    
    // Show confirmation dialog before removing
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name} from your friends list? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call the API to remove the friend
              await removeFriend(friend.id);
              
              // Show success message
              Alert.alert('Success', `${friend.name} has been removed from your friends list.`);
              
              // Close the panel and reset map view
              setSelectedFriend(null);
              if (friendsTabRef.current) {
                friendsTabRef.current.resetMapView();
              }
              
              // Refresh the friends list to reflect the change
              await loadFriends();
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', `Failed to remove ${friend.name}. Please try again.`);
            }
          },
        },
      ]
    );
  };
  
  // Bluetooth state (shared across tabs)
  const [isBluetoothConnected] = useState(false);
  
  // Centralized state management using reducer
  const {
    // State
    isSOSMode,
    isLocationMode,
    isMessageMode,
    isHoldingSOS,
    sosSent,
    shareMyLocation,
    shareWithEveryone,
    // Actions
    activateMode,
    setSOSHolding,
    setSOSSent,
    resetSOSState,
    setShareMyLocation,
    setShareWithEveryone,
  } = useQuickActionMode();
  
  // Use custom hooks for complex logic
  const {
    pulseAnim1,
    pulseAnim2,
    sosSentRef,
    startPulse,
    stopPulse,
    markSOSSent,
    resetSOSState: resetSOSAnimation,
  } = useSOSAnimation();
  
  const {
    isVisible: homeNotificationVisible,
    animValue: homeNotificationAnim,
    show: showHomeNotificationFn,
    dismiss: dismissHomeNotification,
  } = useHomeNotification();

  // Sync SOS state when mode changes - only reset when exiting SOS mode
  const prevSOSModeRef = useRef(isSOSMode);
  useEffect(() => {
    // Only reset if we're transitioning from SOS mode to non-SOS mode
    if (prevSOSModeRef.current && !isSOSMode) {
      resetSOSAnimation();
      resetSOSState();
    }
    prevSOSModeRef.current = isSOSMode;
  }, [isSOSMode, resetSOSAnimation, resetSOSState]);

  // Location button handler
  const handleLocationPress = () => {
    activateMode('LOCATION');
    // Reset SOS animation if switching from SOS mode
    if (isSOSMode) {
      resetSOSAnimation();
    }
  };

  // Message button handler
  const handleMessagePress = () => {
    activateMode('MESSAGE');
    // Reset SOS animation if switching from SOS mode
    if (isSOSMode) {
      resetSOSAnimation();
    }
  };

  // Home button handler - shows notification and sends to friends
  const handleHomePress = () => {
    console.log('Home button pressed - showing notification and sending to friends');
    showHomeNotificationFn();
    // Emit safe home event to all friends via WebSocket
    emitSafeHome('has arrived home safely');
  };

  // Dismiss notification callback
  const handleDismissNotification = () => {
    dismissHomeNotification();
  };

  // Handle sending home status messages
  const handleSendHomeStatus = (statusType: HomeStatus) => {
    console.log(`Sending home status: ${statusType}`);
    
    // Format message based on status type
    let message = '';
    switch (statusType) {
      case 'arrived':
        message = 'has arrived home safely';
        break;
      case 'walking':
        message = 'is walking home';
        break;
      case 'biking':
        message = 'is biking away';
        break;
      case 'onMyWay':
        message = 'is on the way';
        break;
      default:
        message = statusType;
    }
    
    // Emit safe home notification to friends via WebSocket
    emitSafeHome(message);
  };

  // Toggle handlers - now using ToggleSwitch component which handles its own animation
  const handleToggleShareMyLocation = (value: boolean) => {
    setShareMyLocation(value);
  };

  const handleToggleShareWithEveryone = (value: boolean) => {
    setShareWithEveryone(value);
  };

  // SOS button handlers
  const handleSOSPress = () => {
    activateMode('SOS');
    // Reset SOS animation state when toggling
    resetSOSAnimation();
  };

  const handleSOSPressIn = () => {
    setSOSHolding(true);
    startPulse();
  };

  const handleSOSPressOut = () => {
    // Don't cancel if SOS was already sent
    if (sosSentRef.current || sosSent) {
      return;
    }
    
    stopPulse();
    
    // If user was holding, send SOS when they release
    if (isHoldingSOS) {
      sendSOS();
    }
    
    setSOSHolding(false);
  };

  const sendSOS = () => {
    // Prevent multiple calls
    if (sosSentRef.current || sosSent) {
      return;
    }
    
    // Mark SOS as sent in both animation hook and reducer
    markSOSSent();
    setSOSSent(true);
    
    // TODO: Implement actual SOS sending logic
    console.log('SOS sent!');
    // Don't exit SOS mode - user must click SOS button again to exit
    setSOSHolding(false);
};


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
    };
  }, [pulseAnim1, pulseAnim2]);

  // Location sharing - upload user's location to server when enabled
  useEffect(() => {
    if (!token || !sharedLocationPermissionGranted || !shareMyLocation) {
      return;
    }

    console.log('[Location] Starting location sharing to server...');
    
    const cleanup = LocationService.startLocationSharing(
      token,
      (location) => {
        // Update shared user location state
        setSharedUserLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
      },
      (error) => {
        console.error('[Location] Location sharing error:', error);
      }
    );

    return () => {
      console.log('[Location] Stopping location sharing...');
      cleanup();
    };
  }, [token, sharedLocationPermissionGranted, shareMyLocation]);
  
  const handleAddFriend = () => {
    console.log('Add friend pressed');
    // TODO: Implement add friend functionality
  };

  // QR Code Display state
  const [showQRCode, setShowQRCode] = useState(false);

  const handleShareFriend = async () => {
    try {
      // Get current user from auth context
      if (!user || !user.id) {
        Alert.alert('Error', 'Unable to get user information');
        return;
      }
      
      console.log('[Share] Opening share sheet for user:', user.id, user.name);
      
      // Open native OS share sheet with friend invite link
      await shareFriendInvite(user.id, user.name);
      
      console.log('[Share] Share sheet opened successfully');
    } catch (error: any) {
      console.error('[Share] Error in handleShareFriend:', error);
      // Only show alert if it's not a user cancellation
      if (error?.message && !error.message.includes('cancelled') && !error.message.includes('dismissed')) {
        Alert.alert('Error', 'Failed to open share sheet. Please try again.');
      }
    }
  };

  const handleMessageFriend = () => {
    // TODO: Implement message friend functionality (open messaging)
    console.log('Message friend pressed');
    Alert.alert('Coming Soon', 'Messaging feature will be available soon');
  };

  const handleScanFriend = () => {
    // Now shows QR code instead of scanner
    setShowQRCode(true);
  };

  const handleShowQRCode = () => {
    setShowQRCode(true);
  };

  // Friend Requests state
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  // Refs for functions that need to be accessed from event listeners
  const loadFriendsRef = useRef<(() => Promise<void>) | null>(null);
  const loadPendingRequestsCountRef = useRef<(() => Promise<void>) | null>(null);
  const setActiveTabRef = useRef<(tab: string) => void>(setActiveTab);
  const setShowFriendRequestsRef = useRef<(show: boolean) => void>(setShowFriendRequests);

  const setupNotificationListeners = () => {
    return addNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
        
        // Handle friend request notifications
        const data = notification.request.content.data;
        if (data.eventType === 'friend_request_received') {
          console.log('[HomeScreen] Friend request notification received, refreshing requests count...');
          if (loadPendingRequestsCountRef.current) {
            loadPendingRequestsCountRef.current();
          }
        } else if (data.eventType === 'friend_request_accepted') {
          console.log('[HomeScreen] Friend request accepted notification received, refreshing friends list...');
          if (loadFriendsRef.current) {
            loadFriendsRef.current();
          }
          if (loadPendingRequestsCountRef.current) {
            loadPendingRequestsCountRef.current();
          }
        } else if (data.eventType === 'friend_request_rejected') {
          console.log('[HomeScreen] Friend request rejected notification received, refreshing requests count...');
          if (loadPendingRequestsCountRef.current) {
            loadPendingRequestsCountRef.current();
          }
        }
      },
      (response) => {
        console.log('Notification response:', response);
        
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data.eventType === 'friend_request_received') {
          console.log('[HomeScreen] Friend request notification tapped, showing friend requests panel...');
          if (setActiveTabRef.current && setShowFriendRequestsRef.current) {
            setActiveTabRef.current('FRIENDS');
            setShowFriendRequestsRef.current(true);
          }
        }
      }
    );
  };

  // Refs to prevent concurrent API calls
  const isLoadingFriendsRef = useRef(false);
  const isLoadingRequestsRef = useRef(false);
  const lastFriendsLoadRef = useRef<number>(0);
  const lastRequestsLoadRef = useRef<number>(0);
  const hasLoadedFriendsRef = useRef(false);
  const friendsTabActiveRef = useRef(false);

  // Reset friend requests panel and selected friend when navigating away from friends tab
  useEffect(() => {
    if (activeTab !== 'FRIENDS') {
      setShowFriendRequests(false);
      setSelectedFriend(null);
    }
  }, [activeTab]);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    if (!token) return;
    
    // Initialize WebSocket
    if (!websocketInitializedRef.current) {
      console.log('[HomeScreen] Initializing WebSocket connection...');
      initializeWebSocket();
      websocketInitializedRef.current = true;
    }
    
    // Register callbacks using refs to avoid stale closures
    const cleanupFriendRequestReceived = setOnFriendRequestReceived(() => {
      console.log('[HomeScreen] Friend request received via WebSocket, refreshing...');
      // Use refs to avoid stale closures
      if (loadPendingRequestsCountRef.current) {
        loadPendingRequestsCountRef.current();
      }
    });
    
    const cleanupFriendRequestResponded = setOnFriendRequestResponded(() => {
      console.log('[HomeScreen] Friend request responded via WebSocket, refreshing...');
      // Use refs to avoid stale closures
      if (loadPendingRequestsCountRef.current) {
        loadPendingRequestsCountRef.current();
      }
      if (loadFriendsRef.current) {
        loadFriendsRef.current();
      }
    });

    return () => {
      console.log('[HomeScreen] Cleaning up WebSocket callbacks...');
      // Clean up callbacks
      cleanupFriendRequestReceived();
      cleanupFriendRequestResponded();
    };
  }, [token]); // Only depend on token, not on the callback functions
  
  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocketInitializedRef.current) {
        console.log('[HomeScreen] Component unmounting, disconnecting WebSocket...');
        disconnectWebSocket();
        websocketInitializedRef.current = false;
      }
    };
  }, []);

  // Load pending friend requests count
  const loadPendingRequestsCount = useCallback(async (forceRefresh = false) => {
    if (!user || !token) {
      // console.log('[FriendRequests] Skipping load - no user or token');
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastRequestsLoadRef.current < 3000) { // Minimum 3 seconds between calls
      // console.log('[FriendRequests] Too frequent, skipping...');
      return;
    }

    if (isLoadingRequestsRef.current) {
      // console.log('[FriendRequests] Already loading requests, skipping...');
      return;
    }

    try {
      lastRequestsLoadRef.current = now;
      isLoadingRequestsRef.current = true;
      console.log('[FriendRequests] Loading pending requests count...');
      // Pass token from context to avoid AsyncStorage timing issues
      const data = await getFriendRequests(token);
      const receivedPending = data.received.filter(r => r.status === 'pending');
      setPendingRequestsCount(receivedPending.length);
      console.log('[FriendRequests] Pending requests count:', receivedPending.length);
    } catch (error: any) {
      console.error('[FriendRequests] Error loading pending requests count:', error);
      // Don't show error to user, just log it - might be auth timing issue
      if (error?.message?.includes('Not authenticated')) {
        console.warn('[FriendRequests] Auth token not ready yet, will retry');
      }
    } finally {
      isLoadingRequestsRef.current = false;
    }
  }, [user?.id, token]);

  // Load friends list from API
  const loadFriends = useCallback(async (forceRefresh = false) => {
    if (!user || !token) {
      // console.log('[Friends] Skipping load - no user or token');
      return;
    }

    const now = Date.now();
    if (!forceRefresh && now - lastFriendsLoadRef.current < 5000) { // Minimum 5 seconds between calls
      // console.log('[Friends] Too frequent, skipping...');
      return;
    }

    if (isLoadingFriendsRef.current) {
      // console.log('[Friends] Already loading, skipping...');
      return;
    }

    try {
      lastFriendsLoadRef.current = now;
      isLoadingFriendsRef.current = true;
      setIsLoadingFriends(true);
      console.log('[Friends] Loading friends from API...', { userId: user.id, hasToken: !!token });
      
      // Use token from context directly instead of AsyncStorage
      const friends = await getFriendsWithToken(token);
      // console.log('[Friends] Loaded friends:', friends.length);

      // Transform API response to FriendWithDistance format
      // Note: sharedUserLocation is read directly, not in dependencies to avoid infinite loops
      
      const friendsWithDistanceData: FriendWithDistance[] = await Promise.all(
        friends.map(async (friend) => {
          // Use friend's lastKnownLocation if available (even for offline friends)
          const hasLastKnownLocation = !!friend.lastKnownLocation?.coordinates?.lat && 
                                      !!friend.lastKnownLocation?.coordinates?.lng;
          
          const friendLocation = hasLastKnownLocation
            ? { 
                latitude: friend.lastKnownLocation!.coordinates.lat, 
                longitude: friend.lastKnownLocation!.coordinates.lng 
              }
            : null;
          
          // Calculate distance only if both user and friend have location data
          let distance = NaN;
          if (sharedUserLocation && friendLocation) {
            distance = calculateDistance(
              sharedUserLocation.latitude,
              sharedUserLocation.longitude,
              friendLocation.latitude,
              friendLocation.longitude
            );
          }
          
          // Get human-readable location name using reverse geocoding
          // Show last known location for both online and offline friends
          let locationDisplay = 'Location not shared';
          if (hasLastKnownLocation) {
            try {
              const geocodingResult = await reverseGeocode(
                friend.lastKnownLocation!.coordinates.lat,
                friend.lastKnownLocation!.coordinates.lng
              );
              locationDisplay = geocodingResult.displayName;
            } catch (error) {
              // Fallback to coordinates if geocoding fails
              const lat = friend.lastKnownLocation!.coordinates.lat.toFixed(4);
              const lng = friend.lastKnownLocation!.coordinates.lng.toFixed(4);
              locationDisplay = `${lat}, ${lng}`;
            }
          }
          
          return {
            id: friend.id,
            name: friend.name,
            email: friend.email,
            phone: friend.phone, // Include phone number
            profilePicture: friend.profilePicture,
            country: locationDisplay,
            // Use isOnline from server if available, otherwise fall back to isActive for backward compatibility
            status: friend.isOnline ? 'online' : 'offline',
            coordinate: friendLocation || { latitude: 0, longitude: 0 }, // Default for mapping (won't be shown on map)
            distance: distance,
          };
        })
      );

      setFriendsWithDistance(friendsWithDistanceData);
    } catch (error: any) {
      console.error('[Friends] Error loading friends:', error);
      // Set empty array on error to show empty state
      setFriendsWithDistance([]);
    } finally {
      setIsLoadingFriends(false);
      isLoadingFriendsRef.current = false;
    }
  }, [user?.id, token]); // Only include stable dependencies

  // Store functions in refs to avoid dependency issues
  useEffect(() => {
    loadFriendsRef.current = loadFriends;
    loadPendingRequestsCountRef.current = loadPendingRequestsCount;
    setActiveTabRef.current = setActiveTab;
    setShowFriendRequestsRef.current = setShowFriendRequests;
  }, [loadFriends, loadPendingRequestsCount, setActiveTab, setShowFriendRequests]);

  // Setup notification listeners
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return () => {
      cleanup();
    };
  }, []);

  // Listen for navigation events from global notifications
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('navigateToFriendsTab', () => {
      console.log('[HomeScreen] Received navigate to friends tab event');
      // Set active tab to friends and show friend requests panel
      if (setActiveTabRef.current && setShowFriendRequestsRef.current) {
        setActiveTabRef.current('FRIENDS');
        setShowFriendRequestsRef.current(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Load friends when user/token becomes available (regardless of tab) - only once
  useEffect(() => {
    if (user?.id && token && !hasLoadedFriendsRef.current) {
      hasLoadedFriendsRef.current = true;
      // Small delay to ensure token is fully available
      const timer = setTimeout(() => {
        // Call function directly without including in dependencies
        if (loadFriendsRef.current) {
          loadFriendsRef.current();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, token]); // Only depend on user?.id and token

  // Load friends and requests count when Friends tab is active
  useEffect(() => {
    const isFriendsTab = activeTab === 'FRIENDS';
    const wasFriendsTab = friendsTabActiveRef.current;
    
    // Only load when transitioning TO Friends tab, not on every render
    if (isFriendsTab && !wasFriendsTab && user?.id && token && loadFriendsRef.current && loadPendingRequestsCountRef.current) {
      friendsTabActiveRef.current = true;
      hasLoadedFriendsRef.current = false;
      // Add small delay to ensure token is fully available
      const timer = setTimeout(() => {
        loadFriendsRef.current?.();
        loadPendingRequestsCountRef.current?.();
        hasLoadedFriendsRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    } else if (!isFriendsTab) {
      friendsTabActiveRef.current = false;
    }
  }, [activeTab, user?.id, token]); // Removed functions from dependencies to prevent infinite loops

  // Poll for friends updates regardless of tab (for real-time online count across all tabs)
  // Reduced frequency to avoid excessive reloading
  useEffect(() => {
    if (!user?.id || !token || !loadFriendsRef.current) return;

    // Poll every 5 minutes instead of every minute to reduce API calls and UI flicker
    const friendsInterval = setInterval(() => {
      loadFriendsRef.current?.();
    }, 300000); // Poll every 5 minutes (300000ms)

    return () => clearInterval(friendsInterval);
  }, [user?.id, token]); // Only restart if user or token changes

  // Poll for requests updates only when Friends tab is active
  // Reduced frequency to avoid excessive reloading
  useEffect(() => {
    if (activeTab !== 'FRIENDS' || !user?.id || !token || !loadPendingRequestsCountRef.current) return;

    // Poll every 2 minutes instead of every minute
    const requestsInterval = setInterval(() => {
      loadPendingRequestsCountRef.current?.();
    }, 120000); // Poll every 2 minutes (120000ms)

    return () => clearInterval(requestsInterval);
  }, [activeTab, user?.id, token]); // Restart when tab changes or user/token changes

  // Refresh friends list when a request is accepted
  const handleRequestAccepted = useCallback(() => {
    loadPendingRequestsCount();
    loadFriends(); // Reload friends list after accepting request
  }, [loadPendingRequestsCount, loadFriends]);

  const renderContent = () => {
    switch (activeTab) {
      case 'LOCATION': return (
        <LocationTab 
          showHomeNotification={homeNotificationVisible} 
          homeNotificationAnim={homeNotificationAnim} 
          onDismissNotification={handleDismissNotification}
          sharedUserLocation={sharedUserLocation}
          sharedLocationPermissionGranted={sharedLocationPermissionGranted}
          onUserLocationChange={setSharedUserLocation}
          onLocationPermissionChange={setSharedLocationPermissionGranted}
          sharedInitialRegion={sharedInitialRegion}
          friends={friendsWithDistance}
        />
      );
      case 'FRIENDS': return (
        <FriendsTab 
          ref={friendsTabRef} 
          friends={friendsWithDistance} 
          isBluetoothConnected={isBluetoothConnected} 
          onFriendsWithDistanceChange={handleFriendsWithDistanceChange} 
          onFriendPress={handleFriendPress}
          sharedUserLocation={sharedUserLocation}
          sharedLocationPermissionGranted={sharedLocationPermissionGranted}
          onUserLocationChange={setSharedUserLocation}
          onLocationPermissionChange={setSharedLocationPermissionGranted}
          sharedInitialRegion={sharedInitialRegion}
        />
      );
      case 'ACTIVITY': return (
        <ActivityTab 
          friends={friendsWithDistance} 
          isBluetoothConnected={isBluetoothConnected}
          sharedUserLocation={sharedUserLocation}
          sharedLocationPermissionGranted={sharedLocationPermissionGranted}
          sharedInitialRegion={sharedInitialRegion}
        />
      );
      case 'DEVICE': return (
        <DeviceTab 
          friends={friendsWithDistance} 
          isBluetoothConnected={isBluetoothConnected}
          sharedUserLocation={sharedUserLocation}
          sharedLocationPermissionGranted={sharedLocationPermissionGranted}
          sharedInitialRegion={sharedInitialRegion}
        />
      );
      case 'PROFILE': return <ProfileTab />;
      default: return (
        <LocationTab 
          showHomeNotification={homeNotificationVisible} 
          homeNotificationAnim={homeNotificationAnim} 
          onDismissNotification={handleDismissNotification}
          sharedUserLocation={sharedUserLocation}
          sharedLocationPermissionGranted={sharedLocationPermissionGranted}
          onUserLocationChange={setSharedUserLocation}
          onLocationPermissionChange={setSharedLocationPermissionGranted}
          sharedInitialRegion={sharedInitialRegion}
          friends={friendsWithDistance}
        />
      );
    }
  };

  const bottomSheetInner = (
    <>
             {/* Bottom Sheet Handle - Hidden in Profile tab and when Friend Details Panel, Route Panel, or Contact Details Panel is shown */}
             {activeTab !== 'PROFILE' && !(activeTab === 'FRIENDS' && (selectedFriend || showRoutePanel || showContactDetailsPanel)) && <View style={styles.bottomSheetHandle} />}
             
             {/* Quick Actions - Hidden when Friends, Activity, Device, or Profile tab is active */}
             {activeTab !== 'FRIENDS' && activeTab !== 'ACTIVITY' && activeTab !== 'DEVICE' && activeTab !== 'PROFILE' && (
             <View style={styles.quickActionsRow}>
                {ACTION_BUTTONS.map(action => {
                  const isActive =
                    (action.key === 'SOS' && isSOSMode) ||
                    (action.key === 'LOCATION' && isLocationMode) ||
                    (action.key === 'MESSAGE' && isMessageMode) ||
                    (action.key === 'HOME' && homeNotificationVisible);

                  const handlePress = () => {
                    if (action.key === 'SOS') {
                      handleSOSPress();
                    } else if (action.key === 'LOCATION') {
                      handleLocationPress();
                    } else if (action.key === 'HOME') {
                      handleHomePress();
                    } else if (action.key === 'MESSAGE') {
                      handleMessagePress();
                    } else {
                      console.log(`Pressed ${action.key}`);
                    }
                  };

                  return (
                    <QuickActionButton
                      key={action.key}
                      action={action}
                      isActive={isActive}
                      onPress={handlePress}
                    />
                  );
                })}
        </View>
             )}

             {/* Friends List Panel - Shown when Friends tab is active and no friend selected and no route panel and no contact details panel */}
             {activeTab === 'FRIENDS' && !showFriendRequests && !selectedFriend && !showRoutePanel && !showContactDetailsPanel && (
               <FriendsListPanel
                 friends={friendsWithDistance}
                 onAddFriend={handleAddFriend}
                 onFriendPress={handleFriendPress}
                 onShare={handleShareFriend}
                 onMessage={handleMessageFriend}
                 onScan={handleScanFriend}
                 pendingRequestsCount={pendingRequestsCount}
                 onShowRequests={() => setShowFriendRequests(true)}
                 isLoading={isLoadingFriends}
               />
             )}

             {/* Friend Details Panel - Shown when a friend is selected */}
             {activeTab === 'FRIENDS' && !showFriendRequests && selectedFriend && !showRoutePanel && !showContactDetailsPanel && (
               <FriendDetailsPanel
                 friend={selectedFriend}
                 onClose={handleCloseFriendDetails}
                 onContactDetails={handleContactDetails}
                 onRoute={handleRoute}
                 onRemoveFriend={handleRemoveFriend}
               />
             )}

             {/* Route Panel - Shown when route button is clicked */}
             {activeTab === 'FRIENDS' && showRoutePanel && routeFriend && sharedUserLocation && (
               <RoutePanel
                 friend={routeFriend}
                 onClose={handleCloseRoutePanel}
                 onBackToDetails={handleBackToDetailsFromRoute}
                 onTransportModeChange={handleTransportModeChange}
                 userLocation={sharedUserLocation}
               />
             )}

             {/* Contact Details Panel - Shown when contact details button is clicked */}
             {activeTab === 'FRIENDS' && showContactDetailsPanel && contactDetailsFriend && (
               <ContactDetailsPanel
                 friend={contactDetailsFriend}
                 onClose={handleCloseContactDetailsPanel}
                 onBackToDetails={handleBackToDetailsFromContact}
               />
             )}

             {/* Friend Requests Panel - Shown when user clicks on requests badge */}
             {activeTab === 'FRIENDS' && showFriendRequests && (
               <FriendRequestsPanel
                 visible={showFriendRequests}
                 onClose={() => setShowFriendRequests(false)}
                 onRequestAccepted={handleRequestAccepted}
               />
             )}

             {/* Activity List Panel - Shown when Activity tab is active */}
             {activeTab === 'ACTIVITY' && (
               <ActivityListPanel
                 activities={mockActivities}
                 onActivityPress={(activity) => console.log('Activity pressed:', activity)}
               />
             )}

             {/* Device Panel - Shown when Device tab is active */}
             {activeTab === 'DEVICE' && (
               <DevicePanel
                 isBluetoothConnected={isBluetoothConnected}
                 batteryLevel={85}
                 onAddDevice={() => console.log('Add device pressed')}
                 onTestSirenToggle={(enabled) => console.log('Test siren toggled:', enabled)}
                 onConnectDevice={() => console.log('Connect device pressed')}
               />
             )}

             {/* SOS Hold Button - Shown when in SOS mode, above separator (hidden in Friends, Activity, Device, and Profile tab) */}
             {isSOSMode && activeTab !== 'FRIENDS' && activeTab !== 'ACTIVITY' && activeTab !== 'DEVICE' && activeTab !== 'PROFILE' && (
               <SOSModePanel
                 pulseAnim1={pulseAnim1}
                 pulseAnim2={pulseAnim2}
                 onPressIn={handleSOSPressIn}
                 onPressOut={handleSOSPressOut}
               />
             )}

             {/* Location Settings - Shown when location mode is active, above separator (hidden in Friends, Activity, Device, and Profile tab) */}
             {isLocationMode && activeTab !== 'FRIENDS' && activeTab !== 'ACTIVITY' && activeTab !== 'DEVICE' && activeTab !== 'PROFILE' && (
               <LocationModePanel
                 shareMyLocation={shareMyLocation}
                 shareWithEveryone={shareWithEveryone}
                 onToggleShareMyLocation={handleToggleShareMyLocation}
                 onToggleShareWithEveryone={handleToggleShareWithEveryone}
               />
             )}

             {/* Message Settings - Shown when message mode is active, above separator (hidden in Friends, Activity, Device, and Profile tab) */}
             {isMessageMode && activeTab !== 'FRIENDS' && activeTab !== 'ACTIVITY' && activeTab !== 'DEVICE' && activeTab !== 'PROFILE' && (
               <MessageModePanel onSendHomeStatus={handleSendHomeStatus} />
             )}

             {/* Separator Line - Only show when not in Friends, Activity, Device, or Profile tab */}
             {activeTab !== 'FRIENDS' && activeTab !== 'ACTIVITY' && activeTab !== 'DEVICE' && activeTab !== 'PROFILE' && <View style={styles.separator} />}

        {/* Bottom Navigation - Hidden when FriendDetailsPanel, RoutePanel, or ContactDetailsPanel is shown */}
        {!(activeTab === 'FRIENDS' && (selectedFriend || showRoutePanel || showContactDetailsPanel)) && (
          <BottomNavBar
            tabs={TABS}
            activeKey={activeTab}
            onTabPress={setActiveTab}
            safeAreaBottom={insets.bottom}
          />
        )}
    </>
  );

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>

      <View style={styles.root}>
        {/* Main Content */}
        <View style={styles.content}>{renderContent()}</View>

        {/* Unified Bottom Sheet */}
        <View
          style={[
            styles.bottomSheetWrapper,
            { 
              bottom: Platform.OS === 'android' 
                ? Math.max(insets.bottom + 8, 32) // Move higher on Android to account for navigation bar
                : 24 
            },
            Platform.OS === 'android' && activeTab === 'PROFILE' && styles.bottomSheetWrapperAndroidProfile,
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={100} tint="light" style={styles.bottomSheetContainer}>
              <View style={styles.bottomSheetBorder} />
              <View style={styles.bottomSheetContent}>
                {bottomSheetInner}
              </View>
            </BlurView>
          ) : (
            <View
              style={[
                styles.bottomSheetContainer,
                styles.bottomSheetContainerAndroid,
                activeTab === 'PROFILE' && styles.bottomSheetContainerAndroidProfile,
              ]}
            >
              <View style={styles.bottomSheetContent}>
                {bottomSheetInner}
              </View>
            </View>
          )}
        </View>
      </View>
      </SafeAreaView>
      
      {/* QR Code Display Modal */}
      {user && (
        <QRCodeDisplay
          visible={showQRCode}
          onClose={() => setShowQRCode(false)}
          userId={user.id}
          userName={user.name}
        />
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    opacity: 1,
    fontFamily: 'Helvetica',
  },
  content: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: 'transparent',
    paddingBottom: 0,
    width: '100%',
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 64,
  },
  navLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.3,
  },
  navLabelActive: {
    color: '#111827',
    opacity: 1,
  },
  placeholderTab: {
    flex:1, alignItems:'center', justifyContent:'center', padding:32, textAlign:'center',
  },
  placeholderIcon: {
    width: 64, height: 64, backgroundColor: '#F1F1F1', borderRadius: 32, alignItems:'center', justifyContent:'center', marginBottom: 18},
  placeholderTitle: { fontSize: 32, fontWeight: '300', color:'#111827' },
  placeholderDesc: { fontSize: 14, color:'#6B7280', marginTop: 8, textAlign:'center' },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    paddingHorizontal: 24,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 180,
    overflow: 'hidden',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    marginRight: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.2,
    flexShrink: 1,
    flexGrow: 0,
  },
  statusTextMain: {
    fontWeight: '600',
    color: '#000000',
  },
  statusTextOnline: {
    fontWeight: '400',
    color: '#6B7280',
  },
  dropdownButton: {
    marginLeft: 8,
    padding: 4,
  },
  bluetoothContainer: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  homeNotificationContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 11,
    paddingHorizontal: 0,
  },
  homeNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    // iOS gets glassmorphism, Android gets solid white to avoid transparency issues
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 0, // No elevation to avoid white rectangle artifact
      },
    }),
    overflow: 'hidden',
  },
  homeNotificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  homeNotificationTextContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  homeNotificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  homeNotificationSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  actionPanel: {
    display: 'none',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    overflow: 'hidden',
    zIndex: 10,
    // iOS shadows only - Android elevation creates white rectangle artifacts
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  bottomSheetWrapperAndroidProfile: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomSheetContainer: {
    // iOS gets ultra-light glass effect via BlurView, Android gets semi-transparent white for glassmorphism
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.85)',
    width: '100%',
    position: 'relative',
    borderRadius: 36,
  },
  bottomSheetBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none',
  },
  bottomSheetContainerAndroid: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    // No elevation to avoid white rectangle artifact - use border for subtle depth
  },
  bottomSheetContainerAndroidProfile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
  },
  bottomSheetContent: {
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
    // Additional padding will be handled by BottomNavBar's safeAreaBottom
  },
  bottomSheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quickActionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sosText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'System', // Use system font to look native
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width - 80,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalButtonSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalButtonTextSecondary: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginRight: 6,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    marginLeft: 6,
  },
  modalButtonTextCancel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sosButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    marginTop: 32,
    position: 'relative',
  },
  sosPulseRing: {
    position: 'absolute',
    width: 250, // Increased from 200 to make rings larger
    height: 250, // Increased from 200 to make rings larger
    borderRadius: 125, // Increased from 100 to match new size
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  sosLargeButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  sosLargeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
  locationSettingsContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  locationSettingsHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  locationSettingsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  locationSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 56,
  },
  locationSettingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  locationSettingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  locationSettingLabelSingle: {
    marginBottom: 0,
  },
  locationSettingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 4,
  },
  toggleSwitch: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  homeSettingsContainerOld: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  homeSettingsHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  homeSettingsTitleOld: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  homeSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 56,
  },
  homeSettingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    marginRight: 0,
    marginLeft: 2, 
  },
  homeIconContainerOld: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  locationIconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});