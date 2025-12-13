import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, Modal, Platform, Animated } from 'react-native';
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
import { COLORS, ANIMATION_CONFIG } from '../constants/theme';
import { useSOSAnimation } from '../hooks/useSOSAnimation';
import { useHomeNotification } from '../hooks/useHomeNotification';
import { useQuickActionMode } from '../hooks/useQuickActionMode';
import type { QuickActionKey, HomeStatus } from '../types/quickActions';
import { QuickActionButton } from '../components/QuickActions';
import { SOSModePanel, LocationModePanel, MessageModePanel, FriendsListPanel } from '../components/BottomSheet';
import {
  StatusChip,
  BluetoothIndicator,
  HomeNotification,
  LocationPermissionModal,
  NotificationCancelModal,
} from '../components/LocationTab';
import { FriendsTab } from '../components/FriendsTab';
import { Friend, FriendWithDistance } from '../types/friends';
import { calculateDistance } from '../utils/distanceCalculator';

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

// Mock friend data
const mockFriends: Friend[] = [
  { id: 'friend-1', name: 'Emma', country: 'Netherlands', coordinate: { latitude: 37.426, longitude: -122.160 }, status: 'online' },
  { id: 'friend-2', name: 'Lucas', country: 'Germany', coordinate: { latitude: 37.432, longitude: -122.145 }, status: 'online' },
  { id: 'friend-3', name: 'Maya', country: 'France', coordinate: { latitude: 37.415, longitude: -122.148 }, status: 'online' },
  { id: 'friend-4', name: 'Alex', country: 'Spain', coordinate: { latitude: 37.440, longitude: -122.150 }, status: 'online' },
];

// Convert to markers format for LocationTab
const friendMarkers: Array<{ id: string; coordinate: LatLng; name: string; status: string }> = mockFriends.map(friend => ({
  id: friend.id,
  coordinate: friend.coordinate,
  name: friend.name,
  status: friend.status,
}));

// ACTION_BUTTONS now imported from constants/quickActions.ts

const LocationTab: React.FC<{ showHomeNotification?: boolean; homeNotificationAnim?: Animated.Value; onDismissNotification?: () => void }> = ({ showHomeNotification = false, homeNotificationAnim, onDismissNotification }) => {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [isNotified, setIsNotified] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [locationPermissionMessage, setLocationPermissionMessage] = useState<string>('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(true);
  
  // Bluetooth state
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false); // false = red, true = green

  const initialRegion = useMemo(() => {
    // Use user location if available, otherwise default
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 37.426,
      longitude: -122.163,
      latitudeDelta: 0.07,
      longitudeDelta: 0.07,
    };
  }, [userLocation]);

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

  const setupNotificationListeners = () => {
    return addNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        console.log('Notification response:', response);
      }
    );
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
        setLocationPermissionGranted(true);
        
        // Get current location
        const location = await LocationService.getCurrentLocation();
        
        if (location) {
          setUserLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        } else {
          // Location fetch failed but permission granted - show error
          setLocationPermissionMessage('Unable to get your location. Please ensure location services are enabled.');
          setShowLocationPermissionModal(true);
        }
      } else {
        // Permission denied
        setLocationPermissionGranted(false);
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

  useEffect(() => {
    loadNotificationState();
    const cleanup = setupNotificationListeners();
    return () => {
      cleanup();
    };
  }, [token]);

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
            markers={friendMarkers}
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
                friendCount={friendMarkers.length}
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

const ProfileTab: React.FC = () => {
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.profileTab}>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'email@example.com'}</Text>
      </View>

      <View style={styles.profileActions}>
        <Button 
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging Out...' : 'Logout'}
        </Button>
      </View>
    </View>
  );
};

export const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('LOCATION');
  const insets = useSafeAreaInsets();
  
  // Mock user location (in real app, get from location service)
  const userLocation = { latitude: 37.426, longitude: -122.163 };
  
  // Calculate distances for friends
  const friendsWithDistance: FriendWithDistance[] = React.useMemo(() => {
    return mockFriends.map(friend => ({
      ...friend,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        friend.coordinate.latitude,
        friend.coordinate.longitude
      ),
    }));
  }, []);
  
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

  // Home button handler - shows notification
  const handleHomePress = () => {
    console.log('Home button pressed - showing notification');
    showHomeNotificationFn();
  };

  // Dismiss notification callback
  const handleDismissNotification = () => {
    dismissHomeNotification();
  };

  // Handle sending home status messages
  const handleSendHomeStatus = (statusType: HomeStatus) => {
    console.log(`Sending home status: ${statusType}`);
    // TODO: Implement actual message sending logic
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
  
  const handleAddFriend = () => {
    console.log('Add friend pressed');
    // TODO: Implement add friend functionality
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'LOCATION': return <LocationTab showHomeNotification={homeNotificationVisible} homeNotificationAnim={homeNotificationAnim} onDismissNotification={handleDismissNotification} />;
      case 'FRIENDS': return <FriendsTab friends={mockFriends} isBluetoothConnected={isBluetoothConnected} />;
      case 'ACTIVITY': return <PlaceholderTab name="Activity" />;
      case 'DEVICE': return <PlaceholderTab name="Device" />;
      case 'PROFILE': return <ProfileTab />;
      default: return <LocationTab showHomeNotification={homeNotificationVisible} homeNotificationAnim={homeNotificationAnim} onDismissNotification={handleDismissNotification} />;
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>

      <View style={styles.root}>
        {/* Main Content */}
        <View style={styles.content}>{renderContent()}</View>

        {/* Unified Bottom Sheet */}
        <View style={styles.bottomSheetWrapper}>
          <BlurView intensity={100} tint="light" style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetBorder} />
            <View style={styles.bottomSheetContent}>
             <View style={styles.bottomSheetHandle} />
             
             {/* Quick Actions - Hidden when Friends tab is active */}
             {activeTab !== 'FRIENDS' && (
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

             {/* Friends List Panel - Shown when Friends tab is active */}
             {activeTab === 'FRIENDS' && (
               <FriendsListPanel
                 friends={friendsWithDistance}
                 onAddFriend={handleAddFriend}
               />
             )}

             {/* SOS Hold Button - Shown when in SOS mode, above separator */}
             {isSOSMode && (
               <SOSModePanel
                 pulseAnim1={pulseAnim1}
                 pulseAnim2={pulseAnim2}
                 onPressIn={handleSOSPressIn}
                 onPressOut={handleSOSPressOut}
               />
             )}

             {/* Location Settings - Shown when location mode is active, above separator */}
             {isLocationMode && (
               <LocationModePanel
                 shareMyLocation={shareMyLocation}
                 shareWithEveryone={shareWithEveryone}
                 onToggleShareMyLocation={handleToggleShareMyLocation}
                 onToggleShareWithEveryone={handleToggleShareWithEveryone}
               />
             )}

             {/* Message Settings - Shown when message mode is active, above separator */}
             {isMessageMode && (
               <MessageModePanel onSendHomeStatus={handleSendHomeStatus} />
             )}

             {/* Separator Line - Only show when not in Friends tab */}
             {activeTab !== 'FRIENDS' && <View style={styles.separator} />}

        {/* Bottom Navigation */}
        <BottomNavBar
          tabs={TABS}
          activeKey={activeTab}
          onTabPress={setActiveTab}
        />
            </View>
          </BlurView>
        </View>
      </View>
      </SafeAreaView>
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
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  profileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 32,
    paddingTop: height * 0.15,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#111827',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileActions: {
    width: '100%',
    marginBottom: 80,
  },
  logoutButton: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  bottomSheetWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.15)', // Ultra-light glass effect
    width: '100%',
    position: 'relative',
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
  bottomSheetContent: {
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
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
  homeSettingsContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  homeSettingsHeader: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  homeSettingsTitle: {
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
  homeIconContainer: {
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