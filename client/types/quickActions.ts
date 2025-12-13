import { Animated } from 'react-native';
import React from 'react';

/**
 * TypeScript types and interfaces for Quick Actions feature
 */

export const QUICK_ACTION_KEYS = {
  SOS: 'SOS',
  LOCATION: 'LOCATION',
  HOME: 'HOME',
  MESSAGE: 'MESSAGE',
} as const;

export type QuickActionKey = typeof QUICK_ACTION_KEYS[keyof typeof QUICK_ACTION_KEYS];

export type QuickActionMode = 'SOS' | 'LOCATION' | 'MESSAGE' | null;

export interface QuickActionButton {
  key: QuickActionKey;
  label: string;
  iconName: string | null;
  iconNameActive?: string;
  color: string;
  background: string;
  isText?: boolean;
}

export interface SOSAnimationState {
  pulseAnim1: Animated.Value;
  pulseAnim2: Animated.Value;
  shouldAnimate1: React.MutableRefObject<boolean>;
  shouldAnimate2: React.MutableRefObject<boolean>;
  sosSentRef: React.MutableRefObject<boolean>;
}

export interface HomeStatusType {
  arrived: 'arrived';
  walking: 'walking';
  biking: 'biking';
  onMyWay: 'onMyWay';
}

export type HomeStatus = 'arrived' | 'walking' | 'biking' | 'onMyWay';

