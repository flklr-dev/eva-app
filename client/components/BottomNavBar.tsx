import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type BottomTab = {
  key: string;
  label: string;
  icon: string;
  iconFilled: string;
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
  return (
    <View style={styles.navBar}>
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
            <MaterialCommunityIcons
              name={iconName as any}
              size={24}
              color={isActive ? '#007AFF' : '#000000'}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    overflow: 'visible',
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    paddingTop: 8,
    position: 'relative',
    width: '100%',
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
    color: '#007AFF',
    opacity: 1,
  },
});


