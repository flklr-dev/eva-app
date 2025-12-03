import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

export type BottomTab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
};

interface BottomNavBarProps {
  tabs: BottomTab[];
  activeKey: string;
  onTabPress: (key: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  tabs,
  activeKey,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();
  const Container: React.ComponentType<any> =
    Platform.OS === 'ios' ? BlurView : View;

  const containerProps =
    Platform.OS === 'ios'
      ? { intensity: 80, tint: 'light' as const }
      : {};

  return (
    <Container style={styles.navBar} {...containerProps}>
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        const iconName = isActive ? tab.iconFilled : tab.icon;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.navBtn}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={iconName}
              size={22}
              color="#111827"
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Container>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    backgroundColor:
      Platform.OS === 'ios'
        ? 'rgba(255, 255, 255, 0.25)'
        : 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderColor: 'transparent',
    borderWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -30,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.02,
    shadowRadius: 20,
    elevation: 4,
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 64,
  },
  navLabel: {
    fontSize: 10,
    color: '#111827',
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.5,
  },
  navLabelActive: {
    color: '#111827',
    opacity: 1,
  },
});


