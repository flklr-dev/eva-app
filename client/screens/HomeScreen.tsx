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

const friendMarkers: Array<{ id: string; coordinate: LatLng; name: string; status: string }> = [
  { id: 'friend-1', coordinate: { latitude: 37.426, longitude: -122.160 }, name: 'Emma', status: 'Safe' },
  { id: 'friend-2', coordinate: { latitude: 37.432, longitude: -122.145 }, name: 'Lucas', status: 'En Route' },
  { id: 'friend-3', coordinate: { latitude: 37.415, longitude: -122.148 }, name: 'Maya', status: 'Online' },
];

const ACTION_BUTTONS = [
  { key: 'SOS', label: 'SOS', iconName: null, color: '#000000', background: '#F1F8E9', isText: true },
  { key: 'LOCATION', label: 'Share Location', iconName: 'map-marker', iconNameActive: 'map-marker', color: '#000000', background: '#F1F8E9' },
  { key: 'HOME', label: "I'm Home", iconName: 'home-variant', iconNameActive: 'home-variant', color: '#000000', background: '#F1F8E9' },
  { key: 'MESSAGE', label: 'Message', iconName: 'email', iconNameActive: 'email', color: '#000000', background: '#F1F8E9' },
];

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
              <Animated.View
                style={[
                  styles.homeNotificationContainer,
                  {
                    top: insets.top + 8 - 15,
                    opacity: homeNotificationAnim,
                    transform: [
                      {
                        translateY: homeNotificationAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    if (homeNotificationAnim) {
                      Animated.timing(homeNotificationAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        onDismissNotification?.();
                      });
                    }
                  }}
                >
                  <BlurView intensity={80} tint="light" style={styles.homeNotification}>
                    <View style={styles.homeNotificationIconCircle}>
                      <MaterialCommunityIcons name="home-variant" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.homeNotificationTextContainer}>
                      <Text style={styles.homeNotificationTitle}>Send Safe home</Text>
                      <Text style={styles.homeNotificationSubtitle}>You are safely home.</Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </Animated.View>
            )}

            <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
              <BlurView intensity={80} tint="light" style={styles.statusChip}>
                <View style={[styles.statusDot, { backgroundColor: friendMarkers.length === 0 ? '#EF4444' : '#34D399' }]} />
                <Text style={styles.statusText} numberOfLines={1}>
                  <Text style={styles.statusTextMain}>{friendMarkers.length} {friendMarkers.length === 1 ? 'friend' : 'friends'}</Text>
                  <Text style={styles.statusTextOnline}> online</Text>
                </Text>
                <TouchableOpacity style={styles.dropdownButton} onPress={() => console.log('Dropdown pressed')}>
                  <MaterialCommunityIcons name="chevron-down" size={16} color="#000000" />
                </TouchableOpacity>
              </BlurView>
              
              {/* Bluetooth Status Icon - Positioned absolutely on the right */}
              <BlurView intensity={80} tint="light" style={styles.bluetoothContainer}>
                <MaterialCommunityIcons 
                  name="bluetooth" 
                  size={20} 
                  color={isBluetoothConnected ? '#34D399' : '#EF4444'} 
                />
              </BlurView>
            </View>
          </>
        )}
      </View>

      {/* Location Permission Modal */}
      <Modal
        visible={showLocationPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Location Permission Required</Text>
            <Text style={styles.modalMessage}>
              {locationPermissionMessage}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setShowLocationPermissionModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalButtonConfirm} 
                onPress={handleRetryLocation}
              >
                <Text style={styles.modalButtonTextConfirm}>Retry</Text>
              </TouchableOpacity>
      </View>
            <TouchableOpacity 
              style={styles.modalButtonSecondary} 
              onPress={handleOpenSettings}
            >
              <Text style={styles.modalButtonTextSecondary}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={dismissModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Notifications?</Text>
            <Text style={styles.modalMessage}>You will no longer receive updates.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={dismissModal}>
                <Text style={styles.modalButtonTextCancel}>Keep Notified</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonConfirm} onPress={confirmCancel}>
                <Text style={styles.modalButtonTextConfirm}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  const [isSOSMode, setIsSOSMode] = useState(false);
  const [isHoldingSOS, setIsHoldingSOS] = useState(false);
  const [isLocationMode, setIsLocationMode] = useState(false);
  const [isMessageMode, setIsMessageMode] = useState(false);
  const [showHomeNotification, setShowHomeNotification] = useState(false);
  const [shareMyLocation, setShareMyLocation] = useState(true);
  const [shareWithEveryone, setShareWithEveryone] = useState(true);
  const insets = useSafeAreaInsets();
  const toggleAnim1 = useRef(new Animated.Value(1)).current;
  const toggleAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const homeNotificationAnim = useRef(new Animated.Value(0)).current;
  const sosSentRef = useRef(false);
  const shouldAnimate1 = useRef(false);
  const shouldAnimate2 = useRef(false);

  // Location button handler
  const handleLocationPress = () => {
    // Toggle Location mode - if already in Location mode, exit it
    if (isLocationMode) {
      setIsLocationMode(false);
    } else {
      // Deactivate SOS mode if it's active
      if (isSOSMode) {
        setIsSOSMode(false);
        setIsHoldingSOS(false);
        sosSentRef.current = false;
        // Stop animations and prevent them from continuing
        shouldAnimate1.current = false;
        shouldAnimate2.current = false;
        pulseAnim1.stopAnimation();
        pulseAnim2.stopAnimation();
        pulseAnim1.setValue(1);
        pulseAnim2.setValue(1);
      }
      // Deactivate Message mode if it's active
      if (isMessageMode) {
        setIsMessageMode(false);
      }
      setIsLocationMode(true);
    }
  };

  // Message button handler
  const handleMessagePress = () => {
    // Toggle Message mode - if already in Message mode, exit it
    if (isMessageMode) {
      setIsMessageMode(false);
    } else {
      // Deactivate SOS mode if it's active
      if (isSOSMode) {
        setIsSOSMode(false);
        setIsHoldingSOS(false);
        sosSentRef.current = false;
        // Stop animations and prevent them from continuing
        shouldAnimate1.current = false;
        shouldAnimate2.current = false;
        pulseAnim1.stopAnimation();
        pulseAnim2.stopAnimation();
        pulseAnim1.setValue(1);
        pulseAnim2.setValue(1);
      }
      // Deactivate Location mode if it's active
      if (isLocationMode) {
        setIsLocationMode(false);
      }
      setIsMessageMode(true);
    }
  };

  // Home button handler - shows notification
  const handleHomePress = () => {
    console.log('Home button pressed - showing notification');
    // Show notification (animation handled in useEffect)
    setShowHomeNotification(true);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      Animated.timing(homeNotificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowHomeNotification(false);
      });
    }, 4000);
  };

  // Dismiss notification callback
  const handleDismissNotification = () => {
    setShowHomeNotification(false);
  };

  // Handle sending home status messages
  const handleSendHomeStatus = (statusType: string) => {
    console.log(`Sending home status: ${statusType}`);
    // TODO: Implement actual message sending logic
  };

  // Toggle handlers with animation
  const handleToggleShareMyLocation = () => {
    const newValue = !shareMyLocation;
    setShareMyLocation(newValue);
    Animated.spring(toggleAnim1, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleToggleShareWithEveryone = () => {
    const newValue = !shareWithEveryone;
    setShareWithEveryone(newValue);
    Animated.spring(toggleAnim2, {
      toValue: newValue ? 1 : 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Initialize toggle animations
  useEffect(() => {
    toggleAnim1.setValue(shareMyLocation ? 1 : 0);
    toggleAnim2.setValue(shareWithEveryone ? 1 : 0);
  }, []);

  // SOS button handlers
  const handleSOSPress = () => {
    // Toggle SOS mode - if already in SOS mode, exit it
    if (isSOSMode) {
      setIsSOSMode(false);
      setIsHoldingSOS(false);
      sosSentRef.current = false;
      // Stop animations and prevent them from continuing
      shouldAnimate1.current = false;
      shouldAnimate2.current = false;
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
    } else {
      // Deactivate Location mode if it's active
      if (isLocationMode) {
        setIsLocationMode(false);
      }
      // Deactivate Message mode if it's active
      if (isMessageMode) {
        setIsMessageMode(false);
      }
      setIsSOSMode(true);
      sosSentRef.current = false;
      // Reset animation flags
      shouldAnimate1.current = false;
      shouldAnimate2.current = false;
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
    }
  };

  const handleSOSPressIn = () => {
    setIsHoldingSOS(true);
    sosSentRef.current = false; // Reset SOS sent flag when starting new hold
    
    // Stop any existing animations first
    shouldAnimate1.current = false;
    shouldAnimate2.current = false;
    pulseAnim1.stopAnimation();
    pulseAnim2.stopAnimation();
    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    
    // Start new animations
    shouldAnimate1.current = true;
    shouldAnimate2.current = true;
    
    // Start pulsating animations for both rings - only expand outward, then reset instantly
    const createPulseAnimation = (animValue: Animated.Value, delay: number, shouldAnimateRef: React.MutableRefObject<boolean>) => {
      let isFirstLoop = true;
      const expand = () => {
        // Check if we should continue animating
        if (!shouldAnimateRef.current) {
          return;
        }
        
        const animation = isFirstLoop
          ? Animated.sequence([
              Animated.delay(delay),
              Animated.timing(animValue, {
                toValue: 1.8, // Expand outward
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          : Animated.timing(animValue, {
              toValue: 1.8, // Expand outward
              duration: 1000,
              useNativeDriver: true,
            });
        
        isFirstLoop = false;
        
        animation.start((finished) => {
          // Only continue if animation finished and we should still animate
          if (finished && shouldAnimateRef.current) {
            // Instantly reset to 1 (not animated) and loop again
            animValue.setValue(1);
            expand();
          }
        });
      };
      expand();
    };

    createPulseAnimation(pulseAnim1, 0, shouldAnimate1);
    createPulseAnimation(pulseAnim2, 500, shouldAnimate2);
  };

  const handleSOSPressOut = () => {
    // Don't cancel if SOS was already sent
    if (sosSentRef.current) {
      return;
    }
    
    // Stop animations
    shouldAnimate1.current = false;
    shouldAnimate2.current = false;
    pulseAnim1.stopAnimation();
    pulseAnim2.stopAnimation();
    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    
    // If user was holding, send SOS when they release
    if (isHoldingSOS) {
      sendSOS();
    }
    
    setIsHoldingSOS(false);
  };

  const sendSOS = () => {
    // Prevent multiple calls
    if (sosSentRef.current) {
      return;
    }
    
    // Mark SOS as sent to prevent cancellation
    sosSentRef.current = true;
    
    // Stop animations
    shouldAnimate1.current = false;
    shouldAnimate2.current = false;
    pulseAnim1.stopAnimation();
    pulseAnim2.stopAnimation();
    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    
    // TODO: Implement actual SOS sending logic
    console.log('SOS sent!');
    // Don't exit SOS mode - user must click SOS button again to exit
    setIsHoldingSOS(false);
  };


  // Trigger animation when notification becomes visible
  useEffect(() => {
    if (showHomeNotification) {
      console.log('Notification should be visible, starting animation');
      // Reset and animate in
      homeNotificationAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.spring(homeNotificationAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      });
    } else {
      // Reset animation when hidden
      homeNotificationAnim.setValue(0);
    }
  }, [showHomeNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pulseAnim1.stopAnimation();
      pulseAnim2.stopAnimation();
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'LOCATION': return <LocationTab showHomeNotification={showHomeNotification} homeNotificationAnim={homeNotificationAnim} onDismissNotification={handleDismissNotification} />;
      case 'FRIENDS': return <PlaceholderTab name="Friends" />;
      case 'ACTIVITY': return <PlaceholderTab name="Activity" />;
      case 'DEVICE': return <PlaceholderTab name="Device" />;
      case 'PROFILE': return <ProfileTab />;
      default: return <LocationTab showHomeNotification={showHomeNotification} homeNotificationAnim={homeNotificationAnim} onDismissNotification={handleDismissNotification} />;
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
             
             {/* Quick Actions - Always visible */}
             <View style={styles.quickActionsRow}>
                {ACTION_BUTTONS.map(action => (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.quickActionButton, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}
                    onPress={() => {
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
                    }}
                    activeOpacity={0.8}
                  >
                    {action.isText ? (
                      <Text style={[styles.sosText, isSOSMode && { color: '#007BFE' }]}>SOS</Text>
                    ) : (
                      <View style={styles.quickActionIconContainer}>
                        {action.iconName && (
                          <MaterialCommunityIcons 
                            name={action.iconName as any}
                            size={24} 
                            color={
                              (isMessageMode && action.key === 'MESSAGE') || 
                              (isLocationMode && action.key === 'LOCATION') ||
                              (showHomeNotification && action.key === 'HOME')
                                ? '#007BFE' 
                                : action.color
                            }
                          />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

             {/* SOS Hold Button - Shown when in SOS mode, above separator */}
             {isSOSMode && (
               <View style={styles.sosButtonContainer}>
                 <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: pulseAnim1 }], opacity: pulseAnim1.interpolate({ inputRange: [1, 1.8], outputRange: [0.3, 0] }) }]} />
                 <Animated.View style={[styles.sosPulseRing, { transform: [{ scale: pulseAnim2 }], opacity: pulseAnim2.interpolate({ inputRange: [1, 1.8], outputRange: [0.3, 0] }) }]} />
                 <TouchableOpacity
                   style={styles.sosLargeButton}
                   onPressIn={handleSOSPressIn}
                   onPressOut={handleSOSPressOut}
                   activeOpacity={0.9}
                   delayPressIn={0}
                   delayPressOut={0}
                   delayLongPress={5000}
                 >
                   <Text style={styles.sosLargeButtonText}>Tap and hold to send SOS</Text>
                 </TouchableOpacity>
               </View>
             )}

             {/* Location Settings - Shown when location mode is active, above separator */}
             {isLocationMode && (
               <View style={styles.locationSettingsContainer}>
                 <View style={styles.locationSettingsHeader}>
                   <Text style={styles.locationSettingsTitle}>My location</Text>
                 </View>
                 
                 {/* Share My Location Toggle */}
                 <View style={styles.locationSettingRow}>
                   <Text style={[styles.locationSettingLabel, styles.locationSettingLabelSingle]}>Share my location</Text>
                   <TouchableOpacity
                     style={[styles.toggleSwitch, shareMyLocation && styles.toggleSwitchActive]}
                     onPress={handleToggleShareMyLocation}
                     activeOpacity={0.7}
                   >
                     <Animated.View
                       style={[
                         styles.toggleThumb,
                         {
                           transform: [
                             {
                               translateX: toggleAnim1.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, 20],
                               }),
                             },
                           ],
                         },
                       ]}
                     />
                   </TouchableOpacity>
                 </View>

                 {/* Share with Everyone Toggle */}
                 <View style={styles.locationSettingRow}>
                   <View style={styles.locationSettingTextContainer}>
                     <Text style={styles.locationSettingLabel}>Share with everyone on eva</Text>
                     <Text style={styles.locationSettingSubtitle}>Send Also SOS alert with everyone</Text>
                   </View>
                   <TouchableOpacity
                     style={[styles.toggleSwitch, shareWithEveryone && styles.toggleSwitchActive]}
                     onPress={handleToggleShareWithEveryone}
                     activeOpacity={0.7}
                   >
                     <Animated.View
                       style={[
                         styles.toggleThumb,
                         {
                           transform: [
                             {
                               translateX: toggleAnim2.interpolate({
                                 inputRange: [0, 1],
                                 outputRange: [0, 20],
                               }),
                             },
                           ],
                         },
                       ]}
                     />
                   </TouchableOpacity>
                 </View>
               </View>
             )}

             {/* Message Settings - Shown when message mode is active, above separator */}
             {isMessageMode && (
               <View style={styles.homeSettingsContainer}>
                 <View style={styles.homeSettingsHeader}>
                   <Text style={styles.homeSettingsTitle}>Message</Text>
                 </View>
                 
                 {/* Arrived Home */}
                 <View style={styles.homeSettingRow}>
                   <View style={styles.homeIconContainer}>
                     <MaterialCommunityIcons name="home-variant" size={20} color="#000000" />
                   </View>
                   <Text style={styles.homeSettingLabel}>Arrived Home</Text>
                   <TouchableOpacity
                     style={styles.sendButton}
                     onPress={() => handleSendHomeStatus('arrived')}
                     activeOpacity={0.7}
                   >
                     <View style={styles.sendIconContainer}>
                       <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                     </View>
                   </TouchableOpacity>
                 </View>

                 {/* Walking Home */}
                 <View style={styles.homeSettingRow}>
                   <MaterialCommunityIcons name="walk" size={20} color="#000000" />
                   <Text style={styles.homeSettingLabel}>Walking Home</Text>
                   <TouchableOpacity
                     style={styles.sendButton}
                     onPress={() => handleSendHomeStatus('walking')}
                     activeOpacity={0.7}
                   >
                     <View style={styles.sendIconContainer}>
                       <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                     </View>
                   </TouchableOpacity>
                 </View>

                 {/* Biking Away */}
                 <View style={styles.homeSettingRow}>
                   <MaterialCommunityIcons name="bike" size={20} color="#000000" />
                   <Text style={styles.homeSettingLabel}>Biking Away</Text>
                   <TouchableOpacity
                     style={styles.sendButton}
                     onPress={() => handleSendHomeStatus('biking')}
                     activeOpacity={0.7}
                   >
                     <View style={styles.sendIconContainer}>
                       <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                     </View>
                   </TouchableOpacity>
                 </View>

                 {/* On My Way */}
                 <View style={styles.homeSettingRow}>
                   <View style={styles.locationIconContainer}>
                     <MaterialCommunityIcons name="map-marker" size={20} color="#000000" />
                   </View>
                   <Text style={styles.homeSettingLabel}>On My Way</Text>
                   <TouchableOpacity
                     style={styles.sendButton}
                     onPress={() => handleSendHomeStatus('onMyWay')}
                     activeOpacity={0.7}
                   >
                     <View style={styles.sendIconContainer}>
                       <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                     </View>
                   </TouchableOpacity>
                 </View>
               </View>
             )}

             {/* Separator Line */}
             <View style={styles.separator} />

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