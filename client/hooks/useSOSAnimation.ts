import { useRef } from 'react';
import { Animated } from 'react-native';
import { stopAndResetPulseAnimations, createPulseAnimation } from '../utils/animationHelpers';
import { ANIMATION_CONFIG } from '../constants/theme';

/**
 * Custom hook to manage SOS pulse animations
 * Encapsulates all animation logic and state
 */
export const useSOSAnimation = () => {
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const shouldAnimate1 = useRef(false);
  const shouldAnimate2 = useRef(false);
  const sosSentRef = useRef(false);

  const animationRefs = {
    pulseAnim1,
    pulseAnim2,
    shouldAnimate1,
    shouldAnimate2,
  };

  const stopAndReset = () => {
    stopAndResetPulseAnimations(animationRefs);
  };

  const startPulse = () => {
    // Reset SOS sent flag when starting new hold
    sosSentRef.current = false;
    
    // Stop any existing animations first
    stopAndReset();
    
    // Start new animations
    shouldAnimate1.current = true;
    shouldAnimate2.current = true;
    
    // Start pulsating animations for both rings
    createPulseAnimation(
      pulseAnim1,
      ANIMATION_CONFIG.SOS_PULSE.DELAY_1,
      shouldAnimate1
    );
    createPulseAnimation(
      pulseAnim2,
      ANIMATION_CONFIG.SOS_PULSE.DELAY_2,
      shouldAnimate2
    );
  };

  const stopPulse = () => {
    stopAndReset();
  };

  const markSOSSent = () => {
    sosSentRef.current = true;
    stopAndReset();
  };

  const resetSOSState = () => {
    sosSentRef.current = false;
    stopAndReset();
  };

  return {
    pulseAnim1,
    pulseAnim2,
    sosSentRef,
    startPulse,
    stopPulse,
    markSOSSent,
    resetSOSState,
    stopAndReset,
  };
};

