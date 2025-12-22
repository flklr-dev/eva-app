import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Dimensions, DeviceEventEmitter } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useGlobalNotifications } from '../context/GlobalNotificationContext';

const { width } = Dimensions.get('window');

interface GlobalFriendRequestNotificationProps {
  topOffset?: number;
}

/**
 * Global Friend Request Notification - Displays friend request notifications globally
 * Works on any screen in the app
 */
export const GlobalFriendRequestNotification: React.FC<GlobalFriendRequestNotificationProps> = ({
  topOffset = 60,
}) => {
  const { activeNotification, notificationAnimValue, dismissNotification } = useGlobalNotifications();
  
  console.log('[GlobalFriendRequestNotification] ========== COMPONENT RENDER ==========');
  console.log('[GlobalFriendRequestNotification] topOffset:', topOffset);
  console.log('[GlobalFriendRequestNotification] activeNotification:', activeNotification);
  console.log('[GlobalFriendRequestNotification] notificationAnimValue:', notificationAnimValue);
  
  if (!activeNotification) {
    console.log('[GlobalFriendRequestNotification] No active notification, returning null');
    return null;
  }
  
  console.log('[GlobalFriendRequestNotification] Rendering notification for:', activeNotification.senderName);
  console.log('[GlobalFriendRequestNotification] ======================================');

  const handleNotificationTap = () => {
    // Open the friends tab in the app
    console.log('[GlobalNotification] Notification tapped, opening friends tab');
    
    // Send a custom event to notify the app to switch to friends tab
    // Using React Native's DeviceEventEmitter for cross-component communication
    DeviceEventEmitter.emit('navigateToFriendsTab');
    
    // Dismiss the notification
    dismissNotification();
  };

  const handleDismiss = () => {
    dismissNotification();
  };

  const notificationContent = (
    <>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name="account-plus" 
          size={SIZES.ICON_MD} 
          color={COLORS.PRIMARY_BLUE} 
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>
          New Friend Request
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {activeNotification.senderName || 'Someone'} wants to be your friend
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
          top: topOffset,
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