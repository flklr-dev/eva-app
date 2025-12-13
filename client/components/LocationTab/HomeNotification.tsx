import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, ANIMATION_CONFIG } from '../../constants/theme';

interface HomeNotificationProps {
  animValue: Animated.Value;
  onDismiss: () => void;
  topOffset: number;
}

/**
 * Home Notification - Displays "Send Safe home" notification
 */
export const HomeNotification: React.FC<HomeNotificationProps> = ({
  animValue,
  onDismiss,
  topOffset,
}) => {
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
        <BlurView intensity={80} tint="light" style={styles.homeNotification}>
          <View style={styles.homeNotificationIconCircle}>
            <MaterialCommunityIcons name="home-variant" size={SIZES.ICON_MD} color={COLORS.BACKGROUND_WHITE} />
          </View>
          <View style={styles.homeNotificationTextContainer}>
            <Text style={styles.homeNotificationTitle}>Send Safe home</Text>
            <Text style={styles.homeNotificationSubtitle}>You are safely home.</Text>
          </View>
        </BlurView>
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
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.MD,
    overflow: 'hidden',
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

