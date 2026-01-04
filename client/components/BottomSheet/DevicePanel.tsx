import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useBluetooth } from '../../context/BluetoothContext';
import { ToggleSwitch } from '../ToggleSwitch';

interface DevicePanelProps {
  onShowScanModal: () => void;
}

/**
 * Device Panel - Displays device status and controls
 */
export const DevicePanel: React.FC<DevicePanelProps> = ({
  onShowScanModal,
}) => {
  const { 
    isConnected, 
    batteryLevel, 
    mockMode, 
    setMockMode, 
    sendTestSiren, 
    disconnect 
  } = useBluetooth();
  
  const [testSirenEnabled, setTestSirenEnabled] = useState(false);

  const handleTestSirenToggle = async (value: boolean) => {
    setTestSirenEnabled(value);
    
    try {
      const success = await sendTestSiren(value);
      if (!success) {
        // Revert toggle if command failed
        setTestSirenEnabled(!value);
        Alert.alert('Error', 'Failed to toggle test siren. Please try again.');
      }
    } catch (error) {
      console.error('[DevicePanel] Test siren error:', error);
      setTestSirenEnabled(!value);
      Alert.alert('Error', 'Failed to toggle test siren. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Device',
      'Are you sure you want to disconnect from your SOS alarm device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
            } catch (error) {
              console.error('[DevicePanel] Disconnect error:', error);
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Device</Text>
        {mockMode && (
          <View style={styles.mockBadge}>
            <MaterialCommunityIcons name="test-tube" size={16} color={COLORS.BACKGROUND_WHITE} />
            <Text style={styles.mockBadgeText}>Mock</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {isConnected ? (
          <TouchableOpacity
            style={[styles.addButton, styles.disconnectButton]}
            onPress={handleDisconnect}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close" size={20} color={COLORS.ERROR} />
          </TouchableOpacity>
        ) : (
        <TouchableOpacity
          style={styles.addButton}
            onPress={onShowScanModal}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        )}
      </View>

      {/* Bluetooth Status Container */}
      <View style={styles.bluetoothContainer}>
        <View style={[
          styles.bluetoothIconContainer,
          { backgroundColor: isConnected ? '#E6F7E6' : '#FFE6E6' }
        ]}>
          <MaterialCommunityIcons
            name="bluetooth"
            size={32}
            color={isConnected ? COLORS.SUCCESS : COLORS.ERROR}
          />
        </View>
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        
        {/* Connect Device Button - Only show if disconnected, inside container */}
        {!isConnected && (
          <TouchableOpacity
            style={styles.connectDeviceContainer}
            onPress={onShowScanModal}
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
        {isConnected && batteryLevel !== null && (
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
      {isConnected && (
        <View style={styles.testSirenContainer}>
          <Text style={styles.testSirenLabel}>Test siren</Text>
          <ToggleSwitch
            value={testSirenEnabled}
            onValueChange={handleTestSirenToggle}
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
    alignItems: 'center',
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  mockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
    gap: 4,
  },
  mockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.BACKGROUND_WHITE,
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
  disconnectButton: {
    borderColor: COLORS.ERROR,
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
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: 14,
    paddingHorizontal: SPACING.MD,
    marginBottom: 12,
    minHeight: 56,
    ...Platform.select({
      ios: {
        backgroundColor: COLORS.OVERLAY_WHITE,
  },
      android: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      },
      default: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      },
    }),
  },
  testSirenLabel: {
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

