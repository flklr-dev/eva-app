import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, Modal, Platform } from 'react-native';
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
import { MapPin, Home, Mail, ChevronDown, Bluetooth } from 'lucide-react-native';
import * as LocationService from '../services/locationService';
import { Alert } from 'react-native';

const backgroundImage = require('../assets/background.png');
const { width, height } = Dimensions.get('window');

const TABS: BottomTab[] = [
  { key: 'LOCATION', label: 'Location', icon: 'home', iconFilled: 'home' },
  { key: 'FRIENDS', label: 'Friends', icon: 'people-outline', iconFilled: 'people' },
  { key: 'ACTIVITY', label: 'Activity', icon: 'notifications-outline', iconFilled: 'notifications' },
  { key: 'DEVICE', label: 'Device', icon: 'bluetooth-outline', iconFilled: 'bluetooth' },
  { key: 'PROFILE', label: 'Profile', icon: 'person-outline', iconFilled: 'person' },
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
  { key: 'SOS', label: 'SOS', icon: null, color: '#000000', background: '#F1F8E9', isText: true },
  { key: 'LOCATION', label: 'Share Location', icon: MapPin, color: '#000000', background: '#F1F8E9' },
  { key: 'HOME', label: "I'm Home", icon: Home, color: '#000000', background: '#F1F8E9' },
  { key: 'MESSAGE', label: 'Message', icon: Mail, color: '#000000', background: '#F1F8E9' },
];

const LocationTab: React.FC = () => {
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
          <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
            <BlurView intensity={80} tint="light" style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: friendMarkers.length === 0 ? '#EF4444' : '#34D399' }]} />
              <Text style={styles.statusText} numberOfLines={1}>
                <Text style={styles.statusTextMain}>{friendMarkers.length} {friendMarkers.length === 1 ? 'friend' : 'friends'}</Text>
                <Text style={styles.statusTextOnline}> online</Text>
              </Text>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => console.log('Dropdown pressed')}>
                <ChevronDown size={16} color="#000000" />
              </TouchableOpacity>
            </BlurView>
            
            {/* Bluetooth Status Icon - Positioned absolutely on the right */}
            <BlurView intensity={80} tint="light" style={styles.bluetoothContainer}>
              <Bluetooth 
                size={20} 
                color={isBluetoothConnected ? '#34D399' : '#EF4444'} 
                strokeWidth={2.5}
              />
            </BlurView>
          </View>
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
  const insets = useSafeAreaInsets();

  const renderContent = () => {
    switch (activeTab) {
      case 'LOCATION': return <LocationTab />;
      case 'FRIENDS': return <PlaceholderTab name="Friends" />;
      case 'ACTIVITY': return <PlaceholderTab name="Activity" />;
      case 'DEVICE': return <PlaceholderTab name="Device" />;
      case 'PROFILE': return <ProfileTab />;
      default: return <LocationTab />;
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
             
             {/* Quick Actions */}
             <View style={styles.quickActionsRow}>
                {ACTION_BUTTONS.map(action => (
                  <TouchableOpacity
                    key={action.key}
                    style={[styles.quickActionButton, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}
                    onPress={() => console.log(`Pressed ${action.key}`)}
                    activeOpacity={0.8}
                  >
                    {action.isText ? (
                      <Text style={styles.sosText}>SOS</Text>
                    ) : (
                       action.icon && <action.icon 
                         size={24} 
                         color={action.color} 
                         fill="none"
                         strokeWidth={2}
                       />
                    )}
                  </TouchableOpacity>
                ))}
             </View>

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
});