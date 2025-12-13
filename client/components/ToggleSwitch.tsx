import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { ANIMATION_CONFIG, COLORS, SIZES } from '../constants/theme';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Reusable iOS-style toggle switch component
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      tension: ANIMATION_CONFIG.TOGGLE.TENSION,
      friction: ANIMATION_CONFIG.TOGGLE.FRICTION,
    }).start();
  }, [value, animValue]);

  return (
    <TouchableOpacity
      style={[styles.toggleSwitch, value && styles.toggleSwitchActive]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.toggleThumb,
          {
            transform: [
              {
                translateX: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, ANIMATION_CONFIG.TOGGLE.THUMB_TRANSLATE],
                }),
              },
            ],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleSwitch: {
    width: SIZES.TOGGLE_WIDTH,
    height: SIZES.TOGGLE_HEIGHT,
    borderRadius: SIZES.TOGGLE_HEIGHT / 2,
    backgroundColor: COLORS.BORDER_LIGHT,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.SUCCESS,
  },
  toggleThumb: {
    width: SIZES.TOGGLE_THUMB,
    height: SIZES.TOGGLE_THUMB,
    borderRadius: SIZES.TOGGLE_THUMB / 2,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

