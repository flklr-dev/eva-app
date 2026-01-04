import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { bluetoothService, ConnectionStatus, DeviceInfo } from '../services/bluetoothService';

interface BluetoothContextType {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  connectedDevice: Device | null;
  batteryLevel: number | null;
  
  // Mock mode for testing
  mockMode: boolean;
  setMockMode: (enabled: boolean) => void;
  
  // Actions
  scanForDevices: () => Promise<Device[]>;
  connectToDevice: (device: Device) => Promise<boolean>;
  disconnect: () => Promise<void>;
  
  // Device commands
  sendSOSAlarm: (enable: boolean) => Promise<boolean>;
  sendTestSiren: (enable: boolean) => Promise<boolean>;
  queryDeviceInfo: () => Promise<DeviceInfo | null>;
  
  // Device SOS event (when device is physically pulled)
  onDeviceSOSTriggered: (callback: () => void) => () => void;
  
  // Error state
  lastError: Error | null;
  clearError: () => void;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [mockMode, setMockModeState] = useState(false);
  
  // Refs to track cleanup
  const connectionCleanupRef = useRef<(() => void) | null>(null);
  const batteryCleanupRef = useRef<(() => void) | null>(null);
  const errorCleanupRef = useRef<(() => void) | null>(null);
  const deviceSOSCleanupRef = useRef<(() => void) | null>(null);
  const deviceSOSCallbackRef = useRef<(() => void) | null>(null);

  // Setup event listeners on mount
  useEffect(() => {
    console.log('[BluetoothContext] Setting up event listeners');

    // Connection status listener
    connectionCleanupRef.current = bluetoothService.addConnectionListener((status, device) => {
      console.log('[BluetoothContext] Connection status changed:', status);
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      setConnectedDevice(device || null);
      
      if (status === 'error') {
        setIsConnected(false);
        setConnectedDevice(null);
        setBatteryLevel(null);
      }
    });

    // Battery level listener
    batteryCleanupRef.current = bluetoothService.addBatteryListener((level) => {
      console.log('[BluetoothContext] Battery level updated:', level);
      setBatteryLevel(level);
    });

    // Error listener
    errorCleanupRef.current = bluetoothService.addErrorListener((error) => {
      console.error('[BluetoothContext] Error:', error.message);
      setLastError(error);
    });

    // Device SOS listener (when device is physically pulled)
    deviceSOSCleanupRef.current = bluetoothService.addDeviceSOSListener(() => {
      console.log('[BluetoothContext] ⚠️ DEVICE SOS TRIGGERED - EVA device was pulled!');
      // Call the registered callback if exists
      if (deviceSOSCallbackRef.current) {
        deviceSOSCallbackRef.current();
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[BluetoothContext] Cleaning up event listeners');
      if (connectionCleanupRef.current) connectionCleanupRef.current();
      if (batteryCleanupRef.current) batteryCleanupRef.current();
      if (errorCleanupRef.current) errorCleanupRef.current();
      if (deviceSOSCleanupRef.current) deviceSOSCleanupRef.current();
    };
  }, []);

  // Handle app state changes (background/foreground) for BLE reconnection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[BluetoothContext] App state changed:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - attempt reconnection if not connected
        if (!isConnected && !mockMode) {
          console.log('[BluetoothContext] App active, attempting reconnection...');
          bluetoothService.attemptReconnection().catch(error => {
            console.error('[BluetoothContext] Reconnection on foreground failed:', error);
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isConnected, mockMode]);

  // Enable/disable mock mode
  const setMockMode = useCallback((enabled: boolean) => {
    console.log(`[BluetoothContext] ${enabled ? 'Enabling' : 'Disabling'} mock mode`);
    bluetoothService.enableMockMode(enabled);
    setMockModeState(enabled);
    
    if (enabled) {
      Alert.alert(
        'Mock Mode Enabled',
        'You can now test Bluetooth features without a physical device. All commands will be simulated.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Scan for devices
  const scanForDevices = useCallback(async (): Promise<Device[]> => {
    try {
      console.log('[BluetoothContext] Starting device scan...');
      setLastError(null);
      const devices = await bluetoothService.scanForDevices(10000);
      console.log(`[BluetoothContext] Found ${devices.length} devices`);
      return devices;
    } catch (error) {
      console.error('[BluetoothContext] Scan error:', error);
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Connect to device
  const connectToDevice = useCallback(async (device: Device): Promise<boolean> => {
    try {
      console.log('[BluetoothContext] Connecting to device:', device.name);
      setLastError(null);
      const success = await bluetoothService.connectToDevice(device);
      
      if (success) {
        console.log('[BluetoothContext] Successfully connected');
      } else {
        console.error('[BluetoothContext] Connection failed');
        throw new Error('Failed to connect to device');
      }
      
      return success;
    } catch (error) {
      console.error('[BluetoothContext] Connection error:', error);
      const err = error as Error;
      setLastError(err);
      throw err;
    }
  }, []);

  // Disconnect from device
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      console.log('[BluetoothContext] Disconnecting from device');
      await bluetoothService.disconnect();
      setIsConnected(false);
      setConnectedDevice(null);
      setBatteryLevel(null);
    } catch (error) {
      console.error('[BluetoothContext] Disconnect error:', error);
      const err = error as Error;
      setLastError(err);
    }
  }, []);

  // Send SOS alarm command
  const sendSOSAlarm = useCallback(async (enable: boolean): Promise<boolean> => {
    try {
      console.log(`[BluetoothContext] ${enable ? 'Starting' : 'Stopping'} SOS alarm`);
      setLastError(null);
      return await bluetoothService.sendSOSAlarm(enable);
    } catch (error) {
      console.error('[BluetoothContext] SOS alarm error:', error);
      const err = error as Error;
      setLastError(err);
      return false;
    }
  }, []);

  // Send test siren command
  const sendTestSiren = useCallback(async (enable: boolean): Promise<boolean> => {
    try {
      console.log(`[BluetoothContext] ${enable ? 'Starting' : 'Stopping'} test siren`);
      setLastError(null);
      return await bluetoothService.sendFindAlarm(enable);
    } catch (error) {
      console.error('[BluetoothContext] Test siren error:', error);
      const err = error as Error;
      setLastError(err);
      return false;
    }
  }, []);

  // Query device info
  const queryDeviceInfo = useCallback(async (): Promise<DeviceInfo | null> => {
    try {
      console.log('[BluetoothContext] Querying device info');
      setLastError(null);
      return await bluetoothService.queryDeviceInfo();
    } catch (error) {
      console.error('[BluetoothContext] Device info query error:', error);
      const err = error as Error;
      setLastError(err);
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Register callback for device SOS event
  const onDeviceSOSTriggered = useCallback((callback: () => void) => {
    console.log('[BluetoothContext] Registering device SOS callback');
    deviceSOSCallbackRef.current = callback;
    // Return cleanup function
    return () => {
      deviceSOSCallbackRef.current = null;
    };
  }, []);

  const value: BluetoothContextType = {
    isConnected,
    connectionStatus,
    connectedDevice,
    batteryLevel,
    mockMode,
    setMockMode,
    scanForDevices,
    connectToDevice,
    disconnect,
    sendSOSAlarm,
    sendTestSiren,
    queryDeviceInfo,
    onDeviceSOSTriggered,
    lastError,
    clearError,
  };

  return (
    <BluetoothContext.Provider value={value}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = (): BluetoothContextType => {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};

