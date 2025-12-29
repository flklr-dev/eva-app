import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Dimensions, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useQuickActionNotifications } from '../context/QuickActionNotificationContext';

const { width } = Dimensions.get('window');

/**
 * Quick Action Notification - Displays quick action notifications globally
 * Works on any screen in the app
 */
export const QuickActionNotification: React.FC = () => {
  const { activeNotification, notificationAnimValue, dismissNotification } = useQuickActionNotifications();
  
  console.log('[QuickActionNotification] ========== COMPONENT RENDER ==========');
  console.log('[QuickActionNotification] activeNotification:', activeNotification);
  console.log('[QuickActionNotification] notificationAnimValue:', notificationAnimValue);
  
  if (!activeNotification) {
    console.log('[QuickActionNotification] No active notification, returning null');
    return null;
  }
  
  console.log('[QuickActionNotification] Rendering notification for type:', activeNotification.type);
  console.log('[QuickActionNotification] ======================================');

  const handleNotificationTap = () => {
    // For quick action notifications, just dismiss (no navigation needed)
    console.log('[MessageNotification] Message notification tapped, dismissing');
    
    // Dismiss the notification
    dismissNotification();
  };

  const handleDismiss = () => {
    dismissNotification();
  };

  const getIconName = (type: string) => {
    switch (type) {
      case 'arrived':
        return 'home-variant';
      case 'walking':
        return 'walk';
      case 'biking':
        return 'bike';
      case 'onMyWay':
        return 'map-marker';
      default:
        return 'message-text';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'arrived':
        return COLORS.SUCCESS_GREEN;
      case 'walking':
        return COLORS.TEXT_PRIMARY;
      case 'biking':
        return COLORS.TEXT_PRIMARY;
      case 'onMyWay':
        return COLORS.TEXT_PRIMARY;
      default:
        return COLORS.TEXT_PRIMARY;
    }
  };

  const notificationContent = (
    <>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name={getIconName(activeNotification.type)} 
          size={SIZES.ICON_MD} 
          color={getIconColor(activeNotification.type)} 
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          Message
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {activeNotification.message}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons 
          name="close" 
          size={SIZES.ICON_SM} 
          color={COLORS.TEXT_SECONDARY} 
        />
      </TouchableOpacity>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: 60, // Default top offset
          opacity: notificationAnimValue,
          transform: [
            {
              translateX: notificationAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={handleNotificationTap}
        style={styles.touchableArea}
      >
        {Platform.OS === 'android' ? (
          <View style={[styles.notification, styles.notificationAndroid]}>
            {notificationContent}
          </View>
        ) : (
          <BlurView intensity={80} tint="light" style={styles.notification}>
            {notificationContent}
          </BlurView>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000, // High z-index to appear above everything
    paddingHorizontal: 0,
  },
  touchableArea: {
    flex: 1,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: COLORS.OVERLAY_WHITE_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  notificationAndroid: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 8,
    shadowColor: 'transparent',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
});