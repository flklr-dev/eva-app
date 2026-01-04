import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Platform, ScrollView, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Device } from 'react-native-ble-plx';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { useBluetooth } from '../../context/BluetoothContext';

const { width } = Dimensions.get('window');

interface DeviceScanModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceConnected: () => void;
}

/**
 * Device Scan Modal - Shows available devices and handles connection
 */
export const DeviceScanModal: React.FC<DeviceScanModalProps> = ({
  visible,
  onClose,
  onDeviceConnected,
}) => {
  const { scanForDevices, connectToDevice, lastError, clearError } = useBluetooth();
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Request permissions and start scanning when modal opens
  useEffect(() => {
    if (visible) {
      // Request permissions first, then start scan
      requestPermissionsAndScan();
    } else {
      // Reset state when modal closes
      setDevices([]);
      setSelectedDeviceId(null);
      clearError();
    }
  }, [visible]);

  const requestPermissionsAndScan = async () => {
    try {
      // Import bluetooth service to request permissions
      const { bluetoothService } = await import('../../services/bluetoothService');
      
      // Request permissions first
      const hasPermissions = await bluetoothService.requestPermissions();
      
      if (!hasPermissions) {
        // Show error message
        console.error('[DeviceScanModal] Permissions not granted');
        return;
      }

      // Check if Bluetooth is enabled
      const isEnabled = await bluetoothService.isBluetoothEnabled();
      if (!isEnabled) {
        // Error will be shown via lastError state from service
        return;
      }

      // Start scanning after permissions are granted
      startScan();
    } catch (error) {
      console.error('[DeviceScanModal] Permission error:', error);
      // Error will be shown via lastError state
    }
  };

  const startScan = async () => {
    setIsScanning(true);
    setDevices([]);
    clearError();

    try {
      const foundDevices = await scanForDevices();
      setDevices(foundDevices);
      
      if (foundDevices.length === 0) {
        // Show helpful message if no devices found
        // This will be handled by the error state from the service
      }
    } catch (error) {
      console.error('[DeviceScanModal] Scan error:', error);
      // Error is already set in context via service
    } finally {
      setIsScanning(false);
    }
  };

  const handleDevicePress = async (device: Device) => {
    if (isConnecting || isScanning) return;
    
    setSelectedDeviceId(device.id);
    setIsConnecting(true);
    clearError();

    try {
      const success = await connectToDevice(device);
      if (success) {
        // Small delay to show success state before closing
        setTimeout(() => {
          onDeviceConnected();
          onClose();
        }, 500);
      }
    } catch (error) {
      console.error('[DeviceScanModal] Connection error:', error);
      // Error is already set in context
      setIsConnecting(false);
      setSelectedDeviceId(null);
    }
  };


  const renderDeviceItem = ({ item }: { item: Device }) => {
    const isConnectingToThis = isConnecting && selectedDeviceId === item.id;

    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={() => handleDevicePress(item)}
        disabled={isConnectingToThis || isScanning}
        activeOpacity={0.7}
      >
        <View style={styles.deviceIconContainer}>
          <MaterialCommunityIcons
            name="alarm-light"
            size={32}
            color={COLORS.PRIMARY}
          />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceId}>ID: {item.id.substring(0, 17)}...</Text>
        </View>
        {isConnectingToThis ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={COLORS.TEXT_SECONDARY}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Title */}
            <Text style={styles.modalTitle}>Connect Device</Text>

            {/* Subtitle */}
            <Text style={styles.modalSubtitle}>
              Make sure your SOS alarm device is powered on and nearby.
            </Text>

            {/* Horizontal Line */}
            <View style={styles.modalSeparator} />

            {/* Content */}
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Error Message */}
              {lastError && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.ERROR} />
                  <Text style={styles.errorText}>{lastError.message}</Text>
                </View>
              )}

              {/* Scanning State */}
              {isScanning && (
                <View style={styles.scanningContainer}>
                  <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                  <Text style={styles.scanningText}>Scanning for devices...</Text>
                </View>
              )}

              {/* Device List */}
              {!isScanning && devices.length > 0 && (
                <FlatList
                  data={devices}
                  renderItem={renderDeviceItem}
                  keyExtractor={(item) => item.id}
                  style={styles.deviceList}
                  scrollEnabled={false}
                />
              )}

              {/* No Devices Found */}
              {!isScanning && devices.length === 0 && !lastError && (
                <View style={styles.noDevicesContainer}>
                  <MaterialCommunityIcons
                    name="bluetooth-off"
                    size={48}
                    color={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.noDevicesText}>No devices found</Text>
                  <Text style={styles.noDevicesSubtext}>
                    Make sure your device is powered on and in pairing mode
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Scan Again Button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={startScan}
              disabled={isScanning || isConnecting}
              activeOpacity={0.7}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.modalButtonText}>Scan Again</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 80,
    maxWidth: 320,
    maxHeight: '80%',
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    backgroundColor: '#F2F2F2',
    ...SHADOWS.LG,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    textAlign: 'center',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: SPACING.SM,
  },
  content: {
    maxHeight: 300,
  },
  contentContainer: {
    padding: SPACING.MD,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ERROR,
    lineHeight: 20,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },
  scanningText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.MD,
  },
  deviceList: {
    marginTop: SPACING.SM,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.MD,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  noDevicesContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.XL,
  },
  noDevicesText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.MD,
  },
  noDevicesSubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  modalButton: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // System blue color
  },
});

