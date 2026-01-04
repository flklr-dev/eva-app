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

  // Use BlurView on iOS, regular View on Android to avoid octagon artifact
  const Container = Platform.OS === 'ios' ? BlurView : View;
  const containerProps = Platform.OS === 'ios' 
    ? { intensity: 80, tint: 'light' as const }
    : {};

  return (
    <Container {...containerProps} style={styles.bluetoothContainer}>
      <MaterialCommunityIcons name="bluetooth" size={SIZES.ICON_MD} color={statusColor} />
    </Container>
  );
};

const styles = StyleSheet.create({
  bluetoothContainer: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    // Increased opacity for better visibility, matching other UI components
    backgroundColor: Platform.OS === 'ios' 
      ? 'rgba(255, 255, 255, 0.4)' // More visible on iOS while keeping glass effect
      : 'rgba(255, 255, 255, 0.6)', // Match quick action buttons and other components on Android
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    // Only apply shadow on iOS - Android elevation creates octagon artifact
    ...Platform.select({
      ios: {
    ...SHADOWS.MD,
      },
      android: {
        elevation: 0, // No elevation to avoid octagon
      },
    }),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

