import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import BluetoothService from '../services/bluetoothService';
import { BluetoothProtocol, DeviceInfo } from '../services/bluetoothProtocol';
import { setOnFriendRequestReceived, setOnFriendRequestResponded, setOnActivityRefresh, setOnSOSAlertReceived } from '../services/webSocketService';

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  isDeviceConnected: boolean;
  deviceInfo: DeviceInfo | null;
  connectToDevice: () => Promise<boolean>;
  disconnectFromDevice: () => Promise<void>;
  triggerSOSOnDevice: () => Promise<boolean>;
  queryDeviceInfo: () => Promise<void>;
  requestBluetoothPermissions: () => Promise<boolean>;
  refreshBluetoothStatus: () => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  // We'll use the WebSocket service directly instead of a context

  // Initialize Bluetooth
  useEffect(() => {
    const initBluetooth = async () => {
      const permissions = await BluetoothService.requestPermissions();
      setIsBluetoothEnabled(permissions);
    };

    initBluetooth();

    // Set up WebSocket listener for SOS alerts from friends
    const cleanupSOSAlert = setOnSOSAlertReceived(() => {
      // This callback is triggered when an SOS alert is received from a friend
      console.log('SOS alert received from friend via WebSocket');
      // Trigger the SOS alarm on the connected Bluetooth device
      if (isDeviceConnected) {
        BluetoothProtocol.triggerSOSAlarm()
          .then(success => {
            if (success) {
              console.log('SOS alarm triggered on Bluetooth device successfully');
            } else {
              console.error('Failed to trigger SOS alarm on Bluetooth device');
            }
          })
          .catch(error => {
            console.error('Error triggering SOS alarm on Bluetooth device:', error);
          });
      }
    });
    
    // Set up WebSocket listener for friend events
    const cleanupFriendRequestReceived = setOnFriendRequestReceived(() => {
      // This callback is triggered when a friend request is received
      console.log('Friend request received via WebSocket');
    });
    
    const cleanupFriendRequestResponded = setOnFriendRequestResponded(() => {
      // This callback is triggered when a friend request is responded to
      console.log('Friend request responded via WebSocket');
    });
    
    // Cleanup functions to remove the listeners
    return () => {
      cleanupSOSAlert();
      cleanupFriendRequestReceived();
      cleanupFriendRequestResponded();
    };
  }, []);

  // Monitor device connection status
  useEffect(() => {
    const interval = setInterval(async () => {
      const connected = await BluetoothService.isConnectedToDevice();
      setIsDeviceConnected(connected);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const connectToDevice = useCallback(async (): Promise<boolean> => {
    try {
      const device = await BluetoothService.scanAndConnect();
      if (device) {
        setIsDeviceConnected(true);
        // Query device info after connection
        await queryDeviceInfo();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }, []);

  const disconnectFromDevice = useCallback(async (): Promise<void> => {
    await BluetoothService.disconnect();
    setIsDeviceConnected(false);
    setDeviceInfo(null);
  }, []);

  const triggerSOSOnDevice = useCallback(async (): Promise<boolean> => {
    if (!isDeviceConnected) {
      console.log('No device connected to trigger SOS');
      return false;
    }
    
    try {
      const result = await BluetoothProtocol.triggerSOSAlarm();
      return result;
    } catch (error) {
      console.error('Error triggering SOS on device:', error);
      return false;
    }
  }, [isDeviceConnected]);

  const queryDeviceInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await BluetoothProtocol.queryDeviceInfo();
      if (info) {
        setDeviceInfo(info);
      }
    } catch (error) {
      console.error('Error querying device info:', error);
    }
  }, []);

  const refreshBluetoothStatus = useCallback(async (): Promise<void> => {
    const permissions = await BluetoothService.requestPermissions();
    setIsBluetoothEnabled(permissions);
  }, []);

  const value = {
    isBluetoothEnabled,
    isDeviceConnected,
    deviceInfo,
    connectToDevice,
    disconnectFromDevice,
    triggerSOSOnDevice,
    queryDeviceInfo,
    requestBluetoothPermissions: BluetoothService.requestPermissions,
    refreshBluetoothStatus,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = (): BluetoothContextType => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};