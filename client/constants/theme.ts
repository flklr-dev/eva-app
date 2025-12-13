/**
 * Theme constants for consistent styling across the app
 */

export const COLORS = {
  // Primary colors
  PRIMARY: '#007BFE',
  PRIMARY_BLUE: '#007BFE',
  
  // Status colors
  SOS_RED: '#EF4444',
  SUCCESS: '#34C759',
  SUCCESS_GREEN: '#34D399',
  ERROR: '#FF3B30',
  
  // Text colors
  TEXT_PRIMARY: '#000000',
  TEXT_SECONDARY: '#6B7280',
  TEXT_TERTIARY: '#9CA3AF',
  
  // Background colors
  BACKGROUND_LIGHT: '#F8FAFC',
  BACKGROUND_WHITE: '#FFFFFF',
  BACKGROUND_GRAY: '#F3F4F6',
  BACKGROUND_LIGHT_GREEN: '#F1F8E9',
  
  // Border colors
  BORDER_LIGHT: '#E5E7EB',
  BORDER_WHITE: 'rgba(255, 255, 255, 0.3)',
  BORDER_OPACITY: 'rgba(0, 0, 0, 0.08)',
  
  // Overlay colors
  OVERLAY_DARK: 'rgba(0, 0, 0, 0.5)',
  OVERLAY_WHITE: 'rgba(255, 255, 255, 0.6)',
  OVERLAY_WHITE_LIGHT: 'rgba(255, 255, 255, 0.15)',
  OVERLAY_WHITE_MEDIUM: 'rgba(255, 255, 255, 0.2)',
  OVERLAY_BLACK: 'rgba(0, 0, 0, 0.2)',
  
  // Glass effect
  GLASS_BACKGROUND_IOS: 'rgba(255, 255, 255, 0.12)',
  GLASS_BACKGROUND_ANDROID: 'rgba(255, 255, 255, 0.15)',
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

export const BORDER_RADIUS = {
  SM: 12,
  MD: 20,
  LG: 24,
  XL: 36,
  CIRCLE: 9999,
} as const;

export const ANIMATION_CONFIG = {
  SOS_PULSE: {
    SCALE_MAX: 1.8,
    DURATION: 1000,
    DELAY_1: 0,
    DELAY_2: 500,
    OPACITY_START: 0.3,
    OPACITY_END: 0,
  },
  TOGGLE: {
    TENSION: 100,
    FRICTION: 8,
    THUMB_TRANSLATE: 20,
  },
  NOTIFICATION: {
    AUTO_DISMISS_MS: 4000,
    DURATION: 300,
    TENSION: 50,
    FRICTION: 8,
    TRANSLATE_Y_START: -20,
    TRANSLATE_Y_END: 0,
  },
  SPRING: {
    TENSION: 50,
    FRICTION: 8,
  },
} as const;

export const SIZES = {
  // Icons
  ICON_SM: 16,
  ICON_MD: 20,
  ICON_LG: 24,
  
  // Buttons
  BUTTON_SM: 36,
  BUTTON_MD: 48,
  BUTTON_LG: 60,
  SOS_BUTTON: 200,
  SOS_PULSE_RING: 250,
  
  // Status
  STATUS_DOT: 12,
  
  // Toggle
  TOGGLE_WIDTH: 51,
  TOGGLE_HEIGHT: 31,
  TOGGLE_THUMB: 27,
} as const;

export const SHADOWS = {
  SM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  MD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  LG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

