import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { useBluetooth } from '../context/BluetoothContext';
import { BluetoothProtocol } from '../services/bluetoothProtocol';

export const BluetoothDeviceManager: React.FC = () => {
  const {
    isBluetoothEnabled,
    isDeviceConnected,
    deviceInfo,
    connectToDevice,
    disconnectFromDevice,
    queryDeviceInfo,
    triggerSOSOnDevice,
    requestBluetoothPermissions,
    refreshBluetoothStatus,
  } = useBluetooth();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);

  const handleConnect = async () => {
    if (!isBluetoothEnabled) {
      Alert.alert(
        'Bluetooth Permissions Required', 
        'Bluetooth permissions are needed to connect to devices. Would you like to enable them now?', 
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              const permissionsGranted = await requestBluetoothPermissions();
              // Refresh the Bluetooth status to update the UI
              await refreshBluetoothStatus();
              if (permissionsGranted) {
                await attemptConnection();
              } else {
                Alert.alert('Permissions Denied', 'Bluetooth functionality requires permissions to be granted.');
              }
            }
          }
        ]
      );
      return;
    }

    await attemptConnection();
  };

  const attemptConnection = async () => {
    setIsConnecting(true);
    try {
      const connected = await connectToDevice();
      if (!connected) {
        Alert.alert('Connection Failed', 'Could not find or connect to the device');
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to the device');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromDevice();
    } catch (error) {
      Alert.alert('Disconnect Error', 'Failed to disconnect from the device');
    }
  };

  const handleQueryInfo = async () => {
    setIsQuerying(true);
    try {
      await queryDeviceInfo();
    } catch (error) {
      Alert.alert('Query Error', 'Failed to get device information');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleTriggerSOS = async () => {
    if (!isDeviceConnected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    setIsTriggeringSOS(true);
    try {
      const success = await triggerSOSOnDevice();
      if (success) {
        Alert.alert('Success', 'SOS alarm triggered on device');
      } else {
        Alert.alert('Failed', 'Failed to trigger SOS alarm on device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger SOS alarm on device');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  const handleEnableDisconnectAlarm = async () => {
    if (!isDeviceConnected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    try {
      const success = await BluetoothProtocol.enableDisconnectAlarm();
      if (success) {
        Alert.alert('Success', 'Disconnect alarm enabled');
        // Refresh device info to show updated status
        await queryDeviceInfo();
      } else {
        Alert.alert('Failed', 'Failed to enable disconnect alarm');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enable disconnect alarm');
    }
  };

  const handleDisableDisconnectAlarm = async () => {
    if (!isDeviceConnected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    try {
      const success = await BluetoothProtocol.disableDisconnectAlarm();
      if (success) {
        Alert.alert('Success', 'Disconnect alarm disabled');
        // Refresh device info to show updated status
        await queryDeviceInfo();
      } else {
        Alert.alert('Failed', 'Failed to disable disconnect alarm');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to disable disconnect alarm');
    }
  };

  const handleStartFindAlarm = async () => {
    if (!isDeviceConnected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    try {
      const success = await BluetoothProtocol.startFindAlarm();
      if (success) {
        Alert.alert('Success', 'Find alarm started');
      } else {
        Alert.alert('Failed', 'Failed to start find alarm');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start find alarm');
    }
  };

  const handleStopFindAlarm = async () => {
    if (!isDeviceConnected) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    try {
      const success = await BluetoothProtocol.stopFindAlarm();
      if (success) {
        Alert.alert('Success', 'Find alarm stopped');
      } else {
        Alert.alert('Failed', 'Failed to stop find alarm');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop find alarm');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bluetooth Device Manager</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>
          Bluetooth: {isBluetoothEnabled ? 'Enabled' : 'Disabled'}
        </Text>
        <Text style={styles.statusLabel}>
          Device: {isDeviceConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      {!isDeviceConnected ? (
        <TouchableOpacity 
          style={styles.connectButton} 
          onPress={handleConnect}
          disabled={isConnecting || !isBluetoothEnabled}
        >
          {isConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect to Device</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.connectedContainer}>
          <TouchableOpacity 
            style={styles.disconnectButton} 
            onPress={handleDisconnect}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.queryButton} 
            onPress={handleQueryInfo}
            disabled={isQuerying}
          >
            {isQuerying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Query Device Info</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.sosButton} 
            onPress={handleTriggerSOS}
            disabled={isTriggeringSOS}
          >
            {isTriggeringSOS ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Trigger SOS Alarm</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.alarmButton} 
            onPress={handleEnableDisconnectAlarm}
          >
            <Text style={styles.buttonText}>Enable Disconnect Alarm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.alarmButton} 
            onPress={handleDisableDisconnectAlarm}
          >
            <Text style={styles.buttonText}>Disable Disconnect Alarm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.findButton} 
            onPress={handleStartFindAlarm}
          >
            <Text style={styles.buttonText}>Start Find Alarm</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.findButton} 
            onPress={handleStopFindAlarm}
          >
            <Text style={styles.buttonText}>Stop Find Alarm</Text>
          </TouchableOpacity>
        </View>
      )}

      {deviceInfo && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Device Information:</Text>
          <Text>Battery Level: {deviceInfo.batteryLevel}%</Text>
          <Text>Firmware Version: {deviceInfo.firmwareVersion}</Text>
          <Text>Disconnect Alarm: {deviceInfo.disconnectAlarmStatus ? 'Enabled' : 'Disabled'}</Text>
          <Text>Find Alarm: {deviceInfo.findAlarmStatus ? 'Active' : 'Inactive'}</Text>
          <Text>SOS Alarm: {deviceInfo.sosAlarmStatus ? 'Active' : 'Inactive'}</Text>
        </View>
      )}

      {Platform.OS === 'android' && (
        <View style={styles.permissionNote}>
          <Text style={styles.permissionText}>
            Note: On Android, location permissions are required for Bluetooth scanning
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  queryButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  sosButton: {
    backgroundColor: '#FF2D55',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  findButton: {
    backgroundColor: '#5856D6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    marginBottom: 16,
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  permissionNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFFBE6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE58F',
  },
  permissionText: {
    fontSize: 14,
    color: '#8C6D00',
  },
});