import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FriendWithDistance } from '../../types/friends';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_PANEL_HEIGHT = Math.min(380, SCREEN_HEIGHT * 0.5);

interface ContactDetailsPanelProps {
  friend: FriendWithDistance;
  onClose: () => void;
  onBackToDetails?: () => void;
}

/**
 * Contact Details Panel - Displays friend's contact information and communication options
 * Slides in when the Contact Details button is clicked from Friend Details Panel
 */
export const ContactDetailsPanel: React.FC<ContactDetailsPanelProps> = ({
  friend,
  onClose,
  onBackToDetails,
}) => {
  // Animation for slide-in effect from bottom
  const slideAnim = useRef(new Animated.Value(DEFAULT_PANEL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in when component mounts - slide up from bottom
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    // Animate out before closing - slide down
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DEFAULT_PANEL_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onBackToDetails) {
        onBackToDetails();
      } else {
        onClose();
      }
    });
  };

  const handleMessage = () => {
    console.log('Message pressed for:', friend.name);
    if (friend.phone) {
      try {
        // Format phone number by removing any non-digit characters except + at the beginning
        const formattedPhone = friend.phone.replace(/[^+\d]/g, '');
        Linking.openURL(`sms:${formattedPhone}`);
      } catch (error) {
        console.error('Error opening messaging app:', error);
        // Fallback: try opening without formatting if the first attempt fails
        try {
          Linking.openURL(`sms:${friend.phone}`);
        } catch (fallbackError) {
          console.error('Fallback messaging attempt also failed:', fallbackError);
        }
      }
    } else {
      console.log('No phone number available for messaging');
      // Optionally show an alert to the user
    }
  };

  const handleCall = () => {
    console.log('Call pressed for:', friend.name);
    if (friend.phone) {
      Linking.openURL(`tel:${friend.phone}`);
    }
  };

  const handleVideo = () => {
    console.log('Video pressed for:', friend.name);
    // TODO: Implement video call functionality
  };

  const handlePhoneNumberPress = () => {
    if (friend.phone) {
      Linking.openURL(`tel:${friend.phone}`);
    }
  };

  const handleFaceTime = () => {
    console.log('FaceTime pressed for:', friend.name);
    if (friend.phone && Platform.OS === 'ios') {
      Linking.openURL(`facetime:${friend.phone}`);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          height: DEFAULT_PANEL_HEIGHT,
        },
      ]}
    >
      {/* Handle Bar */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header with Close Button */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Friend Name */}
      <Text style={styles.friendName}>{friend.name}</Text>

      {/* Communication Mode Buttons */}
      <View style={styles.modeButtonsContainer}>
        <View style={styles.modeButtonWrapper}>
          <BlurView intensity={60} tint="light" style={styles.modeButtonBlur}>
            <TouchableOpacity
              style={friend.phone ? styles.modeButton : [styles.modeButton, styles.modeButtonDisabled]}
              onPress={handleMessage}
              activeOpacity={0.7}
              disabled={!friend.phone}
            >
              <MaterialCommunityIcons
                name="message-text"
                size={24}
                color={friend.phone ? COLORS.TEXT_SECONDARY : COLORS.TEXT_TERTIARY}
              />
            </TouchableOpacity>
          </BlurView>
        </View>

        <View style={styles.modeButtonWrapper}>
          <BlurView intensity={60} tint="light" style={styles.modeButtonBlur}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="phone"
                size={24}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </BlurView>
        </View>

        <View style={styles.modeButtonWrapper}>
          <BlurView intensity={60} tint="light" style={styles.modeButtonBlur}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleVideo}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="video"
                size={24}
                color={COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>

      {/* Phone Number Section */}
      <View style={styles.phoneNumberSectionContainer}>
        <BlurView intensity={60} tint="light" style={styles.phoneNumberSectionBlur}>
          <View style={styles.phoneNumberSectionContent}>
            <Text style={styles.phoneNumberLabel}>Phone Number</Text>
            <TouchableOpacity onPress={handlePhoneNumberPress} activeOpacity={0.7}>
              <Text style={styles.phoneNumberText}>
                {friend.phone || 'No phone number available'}
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      {/* FaceTime Button */}
      <View style={styles.faceTimeButtonContainer}>
        <BlurView intensity={60} tint="light" style={styles.faceTimeButtonBlur}>
          <TouchableOpacity
            style={styles.faceTimeButtonContent}
            onPress={handleFaceTime}
            activeOpacity={0.7}
            disabled={!friend.phone || Platform.OS !== 'ios'}
          >
            <Text style={styles.faceTimeText}>FaceTime</Text>
            <View style={styles.faceTimeIconsContainer}>
              <View style={styles.iconCircleContainer}>
                <MaterialCommunityIcons name="video" size={16} color={COLORS.TEXT_PRIMARY} />
              </View>
              <View style={styles.iconCircleContainer}>
                <MaterialCommunityIcons name="phone" size={16} color={COLORS.TEXT_PRIMARY} />
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.SM,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerSpacer: {
    width: 36,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  modeButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  modeButtonWrapper: {
    flex: 1,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  modeButtonBlur: {
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  modeButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonDisabled: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  phoneNumberSectionContainer: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    marginBottom: SPACING.MD,
  },
  phoneNumberSectionBlur: {
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  phoneNumberSectionContent: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  phoneNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.XS,
    textAlign: 'left',
  },
  phoneNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.PRIMARY_BLUE,
    textAlign: 'left',
    textDecorationLine: 'underline',
  },
  faceTimeButtonContainer: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    marginBottom: SPACING.MD,
  },
  faceTimeButtonBlur: {
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  faceTimeButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: SPACING.MD,
  },
  faceTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  faceTimeIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  iconCircleContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
