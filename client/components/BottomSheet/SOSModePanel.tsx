import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES, ANIMATION_CONFIG } from '../../constants/theme';

interface SOSModePanelProps {
  pulseAnim1: Animated.Value;
  pulseAnim2: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * SOS Mode Panel - Displays the large red SOS button with pulse animation
 */
export const SOSModePanel: React.FC<SOSModePanelProps> = ({
  pulseAnim1,
  pulseAnim2,
  onPressIn,
  onPressOut,
}) => {
  return (
    <View style={styles.sosButtonContainer}>
      <Animated.View
        style={[
          styles.sosPulseRing,
          {
            transform: [{ scale: pulseAnim1 }],
            opacity: pulseAnim1.interpolate({
              inputRange: [1, ANIMATION_CONFIG.SOS_PULSE.SCALE_MAX],
              outputRange: [
                ANIMATION_CONFIG.SOS_PULSE.OPACITY_START,
                ANIMATION_CONFIG.SOS_PULSE.OPACITY_END,
              ],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.sosPulseRing,
          {
            transform: [{ scale: pulseAnim2 }],
            opacity: pulseAnim2.interpolate({
              inputRange: [1, ANIMATION_CONFIG.SOS_PULSE.SCALE_MAX],
              outputRange: [
                ANIMATION_CONFIG.SOS_PULSE.OPACITY_START,
                ANIMATION_CONFIG.SOS_PULSE.OPACITY_END,
              ],
            }),
          },
        ]}
      />
      <TouchableOpacity
        style={styles.sosLargeButton}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        delayPressIn={0}
        delayPressOut={0}
        delayLongPress={5000}
      >
        <Text style={styles.sosLargeButtonText}>Tap and hold to send SOS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sosButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    marginTop: 32,
    position: 'relative',
  },
  sosPulseRing: {
    position: 'absolute',
    width: SIZES.SOS_PULSE_RING,
    height: SIZES.SOS_PULSE_RING,
    borderRadius: SIZES.SOS_PULSE_RING / 2,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  sosLargeButton: {
    width: SIZES.SOS_BUTTON,
    height: SIZES.SOS_BUTTON,
    borderRadius: SIZES.SOS_BUTTON / 2,
    backgroundColor: COLORS.SOS_RED,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.SOS_RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  sosLargeButtonText: {
    color: COLORS.BACKGROUND_WHITE,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
});

