import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/Button';
import { BottomNavBar, BottomTab } from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';
import { 
  registerForPushNotifications, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications,
  addNotificationListeners,
  getSubscriptionStatus
} from '../services/notificationService';

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

const LocationTab: React.FC = () => {
  const { token } = useAuth();
  const [isNotified, setIsNotified] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load notification state on mount and sync with server
  useEffect(() => {
    loadNotificationState();
    setupNotificationListeners();
  }, [token]);

  const loadNotificationState = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('pushToken');
      if (savedToken) setPushToken(savedToken);

      // Sync with server if we have an auth token
      if (token) {
        const serverStatus = await getSubscriptionStatus(token);
        if (serverStatus !== null) {
          setIsNotified(serverStatus);
          await AsyncStorage.setItem('notificationState', JSON.stringify(serverStatus));
        } else {
          // Fall back to local state if server is unreachable
          const savedState = await AsyncStorage.getItem('notificationState');
          if (savedState) setIsNotified(JSON.parse(savedState));
        }
      } else {
        // No auth token, use local state
        const savedState = await AsyncStorage.getItem('notificationState');
        if (savedState) setIsNotified(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error loading notification state:', error);
      // Fall back to local state on error
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

  const handleNotifyToggle = async () => {
    if (isNotified) {
      // Show confirmation modal when canceling
      setShowCancelModal(true);
    } else {
      // Enable notification
      await enableNotifications();
    }
  };

  const enableNotifications = async () => {
    try {
      setIsProcessing(true);

      // Get push token
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

      // Subscribe via backend
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
      <View style={styles.locationTab}>
        <Text style={styles.locationTitle}>Hello!</Text>
        <Text style={styles.locationDesc}>We will release the full version of the app in the coming weeks.</Text>
        
        <Button 
          style={isNotified ? {...styles.notifyButton, ...styles.notifyButtonActive} : styles.notifyButton}
          onPress={handleNotifyToggle}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : (isNotified ? 'Notified ✓' : 'Notify Me')}
        </Button>
      </View>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={dismissModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Notification?</Text>
            <Text style={styles.modalMessage}>You will no longer receive updates about the app release.</Text>
            
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
        <SafeAreaView style={{ flex: 1 }}>

      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>EVA</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>{renderContent()}</View>

        {/* Bottom Navigation */}
        <BottomNavBar
          tabs={TABS}
          activeKey={activeTab}
          onTabPress={setActiveTab}
        />
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
    alignItems: 'stretch',
    justifyContent: 'center',
    marginBottom: 0, // Remove bottom margin
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70, // Reduced height
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderColor: 'transparent',
    borderWidth: 0,
    paddingBottom: 0, // Remove padding
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // Align to bottom edge
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.02,
    shadowRadius: 20,
    elevation: 2,
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
  locationTab: { 
    flex:1, 
    alignItems:'flex-start', 
    justifyContent:'flex-start', 
    padding:32,
    paddingTop: height * 0.25, // Position higher on screen
    width: '100%',
  },
  locationTitle: { 
    fontSize: 40, 
    color:'#111827', 
    fontWeight:'300', 
    marginBottom: 12,
    textAlign: 'left',
  },
  locationDesc: { 
    color:'#111827', 
    fontSize: 14, 
    marginBottom: 32, 
    maxWidth: width * 0.8,
    textAlign: 'left',
  },
  notifyButton: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
    maxWidth: 320,
    alignSelf: 'center',
  },
  notifyButtonActive: {
    backgroundColor: '#D4F4DD',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
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