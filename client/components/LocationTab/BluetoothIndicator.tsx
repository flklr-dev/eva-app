import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface BluetoothIndicatorProps {
  isConnected: boolean;
}

/**
 * Bluetooth Status Indicator - Shows connection status
 */
export const BluetoothIndicator: React.FC<BluetoothIndicatorProps> = ({ isConnected }) => {
  const statusColor = isConnected ? COLORS.SUCCESS_GREEN : COLORS.ERROR;

  return (
    <BlurView intensity={80} tint="light" style={styles.bluetoothContainer}>
      <MaterialCommunityIcons name="bluetooth" size={SIZES.ICON_MD} color={statusColor} />
    </BlurView>
  );
};

const styles = StyleSheet.create({
  bluetoothContainer: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

