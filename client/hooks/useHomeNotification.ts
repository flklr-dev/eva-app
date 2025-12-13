import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { ANIMATION_CONFIG } from '../constants/theme';

/**
 * Custom hook to manage home notification lifecycle
 * Fixes memory leak by properly cleaning up setTimeout
 */
export const useHomeNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Trigger animation when notification becomes visible
  useEffect(() => {
    if (isVisible) {
      // Reset and animate in
      animValue.setValue(0);
      requestAnimationFrame(() => {
        Animated.spring(animValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: ANIMATION_CONFIG.NOTIFICATION.TENSION,
          friction: ANIMATION_CONFIG.NOTIFICATION.FRICTION,
        }).start();
      });

      // Auto-dismiss after configured time
      timeoutRef.current = setTimeout(() => {
        Animated.timing(animValue, {
          toValue: 0,
          duration: ANIMATION_CONFIG.NOTIFICATION.DURATION,
          useNativeDriver: true,
        }).start(() => {
          setIsVisible(false);
        });
      }, ANIMATION_CONFIG.NOTIFICATION.AUTO_DISMISS_MS);
    } else {
      // Reset animation when hidden
      animValue.setValue(0);
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isVisible, animValue]);

  const show = () => {
    setIsVisible(true);
  };

  const dismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    Animated.timing(animValue, {
      toValue: 0,
      duration: ANIMATION_CONFIG.NOTIFICATION.DURATION,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });
  };

  return {
    isVisible,
    animValue,
    show,
    dismiss,
  };
};

