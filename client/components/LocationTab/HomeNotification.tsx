import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, ANIMATION_CONFIG } from '../../constants/theme';

export type QuickActionType = 'arrived' | 'walking' | 'biking' | 'onMyWay' | 'safeHome';

interface HomeNotificationProps {
  animValue: Animated.Value;
  onDismiss: () => void;
  topOffset: number;
  actionType?: QuickActionType;
}

/**
 * Home Notification - Displays "Send Safe home" notification
 */
export const HomeNotification: React.FC<HomeNotificationProps> = ({
  animValue,
  onDismiss,
  topOffset,
  actionType = 'safeHome',
}) => {
  const isAndroid = Platform.OS === 'android';
  
  // Get notification content based on action type
  const getNotificationContent = () => {
    switch (actionType) {
      case 'arrived':
        return {
          title: 'You sent Arrived Home',
          message: 'You arrived home',
          iconName: 'home-variant',
        };
      case 'walking':
        return {
          title: 'You sent Walking Home',
          message: 'You are walking home',
          iconName: 'walk',
        };
      case 'biking':
        return {
          title: 'You sent Biking Away',
          message: 'You are biking away',
          iconName: 'bike',
        };
      case 'onMyWay':
        return {
          title: 'You sent On My Way',
          message: 'You are on your way',
          iconName: 'map-marker',
        };
      case 'safeHome':
      default:
        return {
          title: 'Send Safe home',
          message: 'You are safely home.',
          iconName: 'home-variant',
        };
    }
  };
  
  const { title, message, iconName } = getNotificationContent();
  
  const notificationContent = (
    <>
      <View style={styles.homeNotificationIconCircle}>
        <MaterialCommunityIcons name={iconName as any} size={SIZES.ICON_MD} color={COLORS.BACKGROUND_WHITE} />
      </View>
      <View style={styles.homeNotificationTextContainer}>
        <Text style={styles.homeNotificationTitle}>{title}</Text>
        <Text style={styles.homeNotificationSubtitle}>{message}</Text>
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        styles.homeNotificationContainer,
        {
          top: topOffset,
          opacity: animValue,
          transform: [
            {
              translateY: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  ANIMATION_CONFIG.NOTIFICATION.TRANSLATE_Y_START,
                  ANIMATION_CONFIG.NOTIFICATION.TRANSLATE_Y_END,
                ],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onDismiss}>
        {isAndroid ? (
          <View style={[styles.homeNotification, styles.homeNotificationAndroid]}>
            {notificationContent}
          </View>
        ) : (
          <BlurView intensity={80} tint="light" style={styles.homeNotification}>
            {notificationContent}
          </BlurView>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: COLORS.OVERLAY_WHITE_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.MD,
    overflow: 'hidden',
  },
  homeNotificationAndroid: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 0, // No elevation to avoid white rectangle artifact
    shadowColor: 'transparent',
    shadowOpacity: 0,
  },
  homeNotificationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.TEXT_PRIMARY,
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
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  homeNotificationSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
});

