import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

interface DevicePanelProps {
  isBluetoothConnected: boolean;
  batteryLevel?: number; // 0-100
  onAddDevice?: () => void;
  onTestSirenToggle?: (enabled: boolean) => void;
  onConnectDevice?: () => void;
}

/**
 * Device Panel - Displays device status and controls
 */
export const DevicePanel: React.FC<DevicePanelProps> = ({
  isBluetoothConnected,
  batteryLevel = 85,
  onAddDevice,
  onTestSirenToggle,
  onConnectDevice,
}) => {
  const [testSirenEnabled, setTestSirenEnabled] = useState(false);

  const handleTestSirenToggle = (value: boolean) => {
    setTestSirenEnabled(value);
    onTestSirenToggle?.(value);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Device</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddDevice}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Bluetooth Status Container */}
      <View style={styles.bluetoothContainer}>
        <View style={[
          styles.bluetoothIconContainer,
          { backgroundColor: isBluetoothConnected ? '#E6F7E6' : '#FFE6E6' }
        ]}>
          <MaterialCommunityIcons
            name="bluetooth"
            size={32}
            color={isBluetoothConnected ? COLORS.SUCCESS : COLORS.ERROR}
          />
        </View>
        <Text style={styles.statusText}>
          {isBluetoothConnected ? 'Connected' : 'Disconnected'}
        </Text>
        
        {/* Connect Device Button - Only show if disconnected, inside container */}
        {!isBluetoothConnected && (
          <TouchableOpacity
            style={styles.connectDeviceContainer}
            onPress={onConnectDevice}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="sync"
              size={20}
              color={COLORS.TEXT_PRIMARY}
            />
            <Text style={styles.connectDeviceText}>Connect Device</Text>
          </TouchableOpacity>
        )}

        {/* Battery Level - Only show if connected, inside container */}
        {isBluetoothConnected && (
          <View style={styles.batteryContainer}>
            <MaterialCommunityIcons
              name="battery-charging"
              size={24}
              color={COLORS.SUCCESS_GREEN}
              style={styles.batteryIconRotated}
            />
            <Text style={styles.batteryLabel}>Battery Level</Text>
            <Text style={styles.batteryPercentage}>{batteryLevel}%</Text>
          </View>
        )}
      </View>

      {/* Test Siren Container - Only show if connected, outside container */}
      {isBluetoothConnected && (
        <View style={styles.testSirenContainer}>
          <View style={styles.testSirenLeft}>
            <View style={styles.exclamationCircle}>
              <MaterialCommunityIcons
                name="exclamation"
                size={16}
                color={COLORS.BACKGROUND_WHITE}
              />
            </View>
            <Text style={styles.testSirenText}>Test siren</Text>
          </View>
          <Switch
            value={testSirenEnabled}
            onValueChange={handleTestSirenToggle}
            trackColor={{ false: COLORS.BACKGROUND_GRAY, true: COLORS.SUCCESS }}
            thumbColor={COLORS.BACKGROUND_WHITE}
          />
        </View>
      )}

      {/* Separator Line - Between device panel and bottom navbar */}
      <View style={styles.bottomSeparator} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: SPACING.MD,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bluetoothContainer: {
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.LG,
    paddingBottom: SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: COLORS.BORDER_WHITE,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        elevation: 6,
        shadowColor: 'rgba(0,0,0,0.12)',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
  },
  connectDeviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    paddingHorizontal: SPACING.XL,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    gap: SPACING.SM,
    width: '100%',
    alignSelf: 'stretch',
  },
  connectDeviceText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  bluetoothIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    paddingHorizontal: SPACING.XL,
    paddingLeft: SPACING.SM,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
    marginLeft: -SPACING.SM,
    marginRight: -SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    gap: SPACING.MD,
    alignSelf: 'stretch',
  },
  batteryIconRotated: {
    transform: [{ rotate: '-90deg' }], // Rotate to horizontal
  },
  batteryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  batteryPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  testSirenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Platform.select({ ios: 'rgba(255, 255, 255, 0.5)', android: '#FFFFFF', default: '#FFFFFF' }),
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    paddingHorizontal: SPACING.XL,
    marginBottom: SPACING.LG,
    width: '100%',
    alignSelf: 'stretch',
  },
  testSirenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    flex: 1,
  },
  exclamationCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testSirenText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  bottomSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginLeft: 0,
    marginBottom: 0,
  },
});

