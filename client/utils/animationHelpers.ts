import { Animated } from 'react-native';
import { ANIMATION_CONFIG } from '../constants/theme';

/**
 * Utility functions for animation management
 */

export interface PulseAnimationRefs {
  pulseAnim1: Animated.Value;
  pulseAnim2: Animated.Value;
  shouldAnimate1: React.MutableRefObject<boolean>;
  shouldAnimate2: React.MutableRefObject<boolean>;
}

/**
 * Stops and resets SOS pulse animations
 * This eliminates code duplication across multiple handlers
 */
export const stopAndResetPulseAnimations = (refs: PulseAnimationRefs): void => {
  const { pulseAnim1, pulseAnim2, shouldAnimate1, shouldAnimate2 } = refs;
  
  // Stop animation flags
  shouldAnimate1.current = false;
  shouldAnimate2.current = false;
  
  // Stop running animations
  pulseAnim1.stopAnimation();
  pulseAnim2.stopAnimation();
  
  // Reset to initial values
  pulseAnim1.setValue(1);
  pulseAnim2.setValue(1);
};

/**
 * Creates a recursive pulse animation that expands outward
 */
export const createPulseAnimation = (
  animValue: Animated.Value,
  delay: number,
  shouldAnimateRef: React.MutableRefObject<boolean>
): void => {
  let isFirstLoop = true;
  
  const expand = () => {
    // Check if we should continue animating
    if (!shouldAnimateRef.current) {
      return;
    }
    
    const animation = isFirstLoop
      ? Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: ANIMATION_CONFIG.SOS_PULSE.SCALE_MAX,
            duration: ANIMATION_CONFIG.SOS_PULSE.DURATION,
            useNativeDriver: true,
          }),
        ])
      : Animated.timing(animValue, {
          toValue: ANIMATION_CONFIG.SOS_PULSE.SCALE_MAX,
          duration: ANIMATION_CONFIG.SOS_PULSE.DURATION,
          useNativeDriver: true,
        });
    
    isFirstLoop = false;
    
    animation.start((finished) => {
      // Only continue if animation finished and we should still animate
      if (finished && shouldAnimateRef.current) {
        // Instantly reset to 1 (not animated) and loop again
        animValue.setValue(1);
        expand();
      }
    });
  };
  
  expand();
};

