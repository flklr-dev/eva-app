import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import * as LocationService from '../services/locationService';
import { registerForPushNotifications } from '../services/notificationService';
import { bluetoothService } from '../services/bluetoothService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;

interface PermissionItem {
  id: 'location' | 'notifications' | 'bluetooth';
  title: string;
  description: string;
  icon: string;
  granted: boolean;
  requesting: boolean;
}

interface PermissionsOnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

/**
 * Permissions Onboarding Modal
 * Appears on first app launch after login
 * Requests all necessary permissions with iOS-inspired UI
 */
export const PermissionsOnboardingModal: React.FC<PermissionsOnboardingModalProps> = ({
  visible,
  onComplete,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [permissions, setPermissions] = useState<PermissionItem[]>([
    {
      id: 'location',
      title: 'Location',
      description: 'Share your location with friends and enable SOS alerts',
      icon: 'map-marker',
      granted: false,
      requesting: false,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Receive SOS alerts and friend requests',
      icon: 'bell',
      granted: false,
      requesting: false,
    },
    {
      id: 'bluetooth',
      title: 'Bluetooth',
      description: 'Connect to your SOS alarm device',
      icon: 'bluetooth',
      granted: false,
      requesting: false,
    },
  ]);

  // Animate modal slide up
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Check current permission status
  useEffect(() => {
    if (visible) {
      checkPermissionStatus();
    }
  }, [visible]);

  const checkPermissionStatus = async () => {
    // Check location
    try {
      const locationStatus = await LocationService.getLocationPermissionStatus();
      updatePermissionStatus('location', locationStatus.granted);
    } catch (error) {
      console.error('[PermissionsModal] Error checking location:', error);
    }

    // Check notifications
    try {
      const { getPermissionsAsync } = await import('expo-notifications');
      const { status } = await getPermissionsAsync();
      updatePermissionStatus('notifications', status === 'granted');
    } catch (error) {
      console.error('[PermissionsModal] Error checking notifications:', error);
    }

    // Check Bluetooth (iOS handles automatically, Android needs explicit check)
    if (Platform.OS === 'android') {
      try {
        const { PermissionsAndroid } = await import('react-native');
        if (Platform.Version >= 31) {
          const bluetoothScan = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
          );
          const bluetoothConnect = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
          updatePermissionStatus('bluetooth', bluetoothScan && bluetoothConnect);
        } else {
          const location = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          updatePermissionStatus('bluetooth', location);
        }
      } catch (error) {
        console.error('[PermissionsModal] Error checking Bluetooth:', error);
      }
    } else {
      // iOS - Bluetooth permissions are handled automatically by the system
      // Check if Bluetooth is available (state will be checked when requesting)
      // For now, we'll check if location is granted as a proxy
      // iOS will show permission dialog when BLE is first used
      try {
        const locationStatus = await LocationService.getLocationPermissionStatus();
        // On iOS, if location is granted, Bluetooth permission is typically available
        // The actual permission dialog appears when BLE is first used
        updatePermissionStatus('bluetooth', locationStatus.granted);
      } catch (error) {
        console.error('[PermissionsModal] Error checking iOS Bluetooth:', error);
      }
    }
  };

  const updatePermissionStatus = (id: PermissionItem['id'], granted: boolean) => {
    setPermissions((prev) =>
      prev.map((perm) => (perm.id === id ? { ...perm, granted } : perm))
    );
  };

  const requestPermission = async (permission: PermissionItem) => {
    if (permission.granted || permission.requesting) return;

    setPermissions((prev) =>
      prev.map((perm) =>
        perm.id === permission.id ? { ...perm, requesting: true } : perm
      )
    );

    try {
      let granted = false;

      switch (permission.id) {
        case 'location':
          const locationResult = await LocationService.requestLocationPermission();
          granted = locationResult.granted;
          break;

        case 'notifications':
          const token = await registerForPushNotifications();
          granted = token !== null;
          break;

        case 'bluetooth':
          granted = await bluetoothService.requestPermissions();
          break;
      }

      updatePermissionStatus(permission.id, granted);
    } catch (error) {
      console.error(`[PermissionsModal] Error requesting ${permission.id}:`, error);
    } finally {
      setPermissions((prev) =>
        prev.map((perm) =>
          perm.id === permission.id ? { ...perm, requesting: false } : perm
        )
      );
    }
  };

  const handleDone = () => {
    onComplete();
  };

  const renderPermissionItem = (permission: PermissionItem) => {
    const isGranted = permission.granted;
    const isRequesting = permission.requesting;

    return (
      <TouchableOpacity
        key={permission.id}
        style={styles.permissionItem}
        onPress={() => !isGranted && !isRequesting && requestPermission(permission)}
        disabled={isGranted || isRequesting}
        activeOpacity={0.7}
      >
        <View style={styles.permissionLeft}>
          <View
            style={[
              styles.permissionIconContainer,
              isGranted && styles.permissionIconContainerGranted,
            ]}
          >
            <MaterialCommunityIcons
              name={permission.icon}
              size={24}
              color={isGranted ? COLORS.BACKGROUND_WHITE : COLORS.PRIMARY}
            />
          </View>
          <View style={styles.permissionTextContainer}>
            <Text style={styles.permissionTitle}>{permission.title}</Text>
            <Text style={styles.permissionDescription}>{permission.description}</Text>
          </View>
        </View>
        {isRequesting ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        ) : isGranted ? (
          <MaterialCommunityIcons
            name="check-circle"
            size={24}
            color={COLORS.SUCCESS}
          />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.TEXT_SECONDARY}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDone}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Enable Permissions</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>
              To get the most out of EVA Alert, please enable these permissions:
            </Text>

            <View style={styles.permissionsList}>
              {permissions.map(renderPermissionItem)}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY_DARK,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderTopLeftRadius: BORDER_RADIUS.XL,
    borderTopRightRadius: BORDER_RADIUS.XL,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_LIGHT,
  },
  headerSpacer: {
    width: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  doneButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.LG,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: SPACING.XL,
    textAlign: 'center',
  },
  permissionsList: {
    gap: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    minHeight: 72,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.MD,
  },
  permissionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
  },
  permissionIconContainerGranted: {
    backgroundColor: COLORS.SUCCESS,
    borderColor: COLORS.SUCCESS,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    gap: SPACING.SM,
    marginTop: SPACING.MD,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});

