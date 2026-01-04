import { BleManager, Device, State, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bluetooth SOS Alarm Service
 * 
 * Protocol Implementation based on Bluetooth_SOS_Alarm_Protocol_EN.txt
 * 
 * Service UUID: 0xFFF0
 * Write Characteristic: 0xFFF1 (Write, WriteNoRSP)
 * Read/Notify Characteristic: 0xFFF2 (Read, Notify)
 * 
 * Frame Format: 0xAA [CMD] [LEN] [DATA] 0x55
 */

// BLE Constants
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Standard UUID format for 0xFFF0
const WRITE_CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb'; // 0xFFF1
const NOTIFY_CHARACTERISTIC_UUID = '0000fff2-0000-1000-8000-00805f9b34fb'; // 0xFFF2
const DEVICE_NAME = 'sos personal alarm';

// Protocol Commands
export enum BLECommand {
  FIND_ALARM = 0x01,
  DISCONNECT_ALARM = 0x02,
  SOS_ALARM = 0x03,
  ALARM_STATUS = 0x04,
  PAIRING = 0x05,
  DEVICE_INFO = 0xCC,
}

// Frame bytes
const FRAME_HEADER = 0xAA;
const FRAME_TAIL = 0x55;

// Device Info Interface
export interface DeviceInfo {
  batteryLevel: number; // 0-100
  disconnectAlarmEnabled: boolean;
  searchAlarmStatus: boolean;
  sosAlarmStatus: boolean;
  firmwareVersion: string;
}

// Connection Status
export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

// Event Listeners
type ConnectionListener = (status: ConnectionStatus, device?: Device) => void;
type BatteryListener = (level: number) => void;
type ErrorListener = (error: Error) => void;
type DeviceSOSListener = () => void; // Called when device is physically pulled/triggered

// Storage keys
const STORAGE_KEY_DEVICE = 'ble_connected_device';
const STORAGE_KEY_PAIRING_CODE = 'ble_pairing_code';

interface StoredDevice {
  id: string;
  name: string | null;
  connectedAt: number;
}

class BluetoothService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private batteryListeners: Set<BatteryListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private deviceSOSListeners: Set<DeviceSOSListener> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private pairingCode: Buffer | null = null;
  private isScanning: boolean = false;
  private mockMode: boolean = false; // Mock mode for testing without physical device
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.manager = new BleManager();
    this.loadPairingCode();
    this.initializeBluetoothState();
  }

  /**
   * Enable mock mode for testing without physical device
   */
  public enableMockMode(enabled: boolean = true): void {
    this.mockMode = enabled;
    console.log(`[BLE] Mock mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if mock mode is enabled
   */
  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Request Bluetooth permissions (Android 12+)
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const allGranted = Object.values(granted).every(
            (status) => status === PermissionsAndroid.RESULTS.GRANTED
          );

          if (!allGranted) {
            console.error('[BLE] Bluetooth permissions not granted');
            this.notifyError(new Error('Bluetooth permissions not granted'));
            return false;
          }

          console.log('[BLE] Bluetooth permissions granted');
          return true;
        } catch (error) {
          console.error('[BLE] Error requesting permissions:', error);
          this.notifyError(error as Error);
          return false;
        }
      } else {
        // Android 11 and below - only need location
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.error('[BLE] Location permission not granted');
            this.notifyError(new Error('Location permission required for Bluetooth'));
            return false;
          }

          return true;
        } catch (error) {
          console.error('[BLE] Error requesting location permission:', error);
          this.notifyError(error as Error);
          return false;
        }
      }
    }

    // iOS - permissions are requested automatically by the system when BLE is used
    // We just need to check if Bluetooth is available
    // The system will show permission dialog automatically on first use
    try {
      const state = await this.manager.state();
      if (state === State.Unauthorized) {
        this.notifyError(new Error('Bluetooth permission denied. Please enable Bluetooth access in Settings.'));
        return false;
      }
      return true;
    } catch (error) {
      console.error('[BLE] Error checking iOS Bluetooth state:', error);
      // On iOS, permissions are requested automatically, so we assume it's OK
      return true;
    }
  }

  /**
   * Check if Bluetooth is powered on
   */
  public async isBluetoothEnabled(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      return state === State.PoweredOn;
    } catch (error) {
      console.error('[BLE] Error checking Bluetooth state:', error);
      return false;
    }
  }

  /**
   * Scan for SOS alarm devices
   */
  public async scanForDevices(timeoutMs: number = 10000): Promise<Device[]> {
    if (this.mockMode) {
      // Return mock device for testing
      console.log('[BLE] Mock mode: Returning mock device');
      return this.getMockDevices();
    }

    // Check permissions first
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    // Check if Bluetooth is enabled
    const isEnabled = await this.isBluetoothEnabled();
    if (!isEnabled) {
      throw new Error('Bluetooth is not enabled. Please turn on Bluetooth.');
    }

    this.updateConnectionStatus('scanning');
    this.isScanning = true;

    const devices: Device[] = [];
    const deviceIds = new Set<string>();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.isScanning = false;
        this.manager.stopDeviceScan();
        this.updateConnectionStatus('disconnected');
        
        if (devices.length === 0) {
          reject(new Error('No SOS alarm devices found. Make sure your device is nearby and powered on.'));
        } else {
          resolve(devices);
        }
      }, timeoutMs);

      this.manager.startDeviceScan(
        [SERVICE_UUID], // Filter by service UUID
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            this.isScanning = false;
            this.manager.stopDeviceScan();
            this.updateConnectionStatus('error');
            console.error('[BLE] Scan error:', error);
            reject(error);
            return;
          }

          if (device && !deviceIds.has(device.id)) {
            // Check if device name matches "sos personal alarm" (exact match from protocol)
            // Protocol specifies: 's','o','s',' ','p','e','r','s','o','n','a','l',' ','a','l','a','r','m'
            const deviceName = device.name?.toLowerCase() || '';
            // Match exact name "sos personal alarm" or check for all key words
            if (deviceName === 'sos personal alarm' || 
                (deviceName.includes('sos') && deviceName.includes('personal') && deviceName.includes('alarm'))) {
              console.log('[BLE] Found SOS personal alarm device:', device.name, device.id);
              deviceIds.add(device.id);
              devices.push(device);
            } else {
              console.log('[BLE] Device filtered out (not SOS personal alarm):', device.name);
            }
          }
        }
      );
    });
  }

  /**
   * Get mock devices for testing
   */
  private getMockDevices(): Device[] {
    // This is a placeholder - in mock mode we'll simulate connection
    return [];
  }

  /**
   * Connect to a device
   */
  public async connectToDevice(device: Device): Promise<boolean> {
    if (this.mockMode) {
      console.log('[BLE] Mock mode: Simulating device connection');
      this.updateConnectionStatus('connected', device);
      // Simulate battery level
      this.notifyBatteryLevel(85);
      return true;
    }

    try {
      this.updateConnectionStatus('connecting', device);

      // Stop scanning if still active
      if (this.isScanning) {
        this.manager.stopDeviceScan();
        this.isScanning = false;
      }

      // Connect to device
      console.log('[BLE] Connecting to device:', device.name, device.id);
      const connectedDevice = await this.manager.connectToDevice(device.id, {
        autoConnect: true, // Enable auto-reconnect for background persistence
        requestMTU: 512,
      });

      console.log('[BLE] Device connected, discovering services...');
      await connectedDevice.discoverAllServicesAndCharacteristics();

      this.connectedDevice = connectedDevice;
      this.updateConnectionStatus('connected', connectedDevice);
      
      // Save device info for persistence
      await this.saveDeviceInfo(device);

      // Setup disconnect listener
      this.manager.onDeviceDisconnected(connectedDevice.id, (error, disconnectedDevice) => {
        console.log('[BLE] Device disconnected:', disconnectedDevice?.name);
        this.connectedDevice = null;
        this.updateConnectionStatus('disconnected');
        
        // Clear stored device on disconnect
        this.clearDeviceInfo();
        
        if (error) {
          console.error('[BLE] Disconnect error:', error);
          this.notifyError(error);
        }
      });

      // Setup notification listener for battery updates
      await this.setupNotifications(connectedDevice);

      // Perform pairing if this is first time
      const isPaired = await this.performPairing(connectedDevice);
      if (!isPaired) {
        console.warn('[BLE] Pairing failed, but connection maintained');
      }

      // Query device info to get battery level
      await this.queryDeviceInfo();

      console.log('[BLE] Device setup complete');
      return true;
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      this.updateConnectionStatus('error');
      this.notifyError(error as Error);
      return false;
    }
  }

  /**
   * Disconnect from current device
   */
  public async disconnect(): Promise<void> {
    if (this.mockMode) {
      console.log('[BLE] Mock mode: Simulating disconnect');
      this.updateConnectionStatus('disconnected');
      this.clearDeviceInfo();
      return;
    }

    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        console.log('[BLE] Device disconnected');
      } catch (error) {
        console.error('[BLE] Disconnect error:', error);
      }
      this.connectedDevice = null;
      this.updateConnectionStatus('disconnected');
      this.clearDeviceInfo();
    }
  }

  /**
   * Check if connected to a device
   */
  public isConnected(): boolean {
    if (this.mockMode) {
      return this.connectionStatus === 'connected';
    }
    return this.connectedDevice !== null && this.connectionStatus === 'connected';
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Send SOS alarm command
   */
  public async sendSOSAlarm(enable: boolean): Promise<boolean> {
    if (this.mockMode) {
      console.log(`[BLE] Mock mode: ${enable ? 'Starting' : 'Stopping'} SOS alarm`);
      return true;
    }

    const data = enable ? 0x01 : 0x00;
    return await this.sendCommand(BLECommand.SOS_ALARM, Buffer.from([data]));
  }

  /**
   * Send find/search alarm command (test siren)
   */
  public async sendFindAlarm(enable: boolean): Promise<boolean> {
    if (this.mockMode) {
      console.log(`[BLE] Mock mode: ${enable ? 'Starting' : 'Stopping'} find alarm`);
      return true;
    }

    const data = enable ? 0x01 : 0x00;
    return await this.sendCommand(BLECommand.FIND_ALARM, Buffer.from([data]));
  }

  /**
   * Enable/disable disconnect alarm
   */
  public async setDisconnectAlarm(enable: boolean): Promise<boolean> {
    if (this.mockMode) {
      console.log(`[BLE] Mock mode: ${enable ? 'Enabling' : 'Disabling'} disconnect alarm`);
      return true;
    }

    const data = enable ? 0x01 : 0x00;
    return await this.sendCommand(BLECommand.DISCONNECT_ALARM, Buffer.from([data]));
  }

  /**
   * Query device information (battery, firmware, etc.)
   */
  public async queryDeviceInfo(): Promise<DeviceInfo | null> {
    if (this.mockMode) {
      console.log('[BLE] Mock mode: Returning mock device info');
      const mockInfo: DeviceInfo = {
        batteryLevel: 85,
        disconnectAlarmEnabled: true,
        searchAlarmStatus: false,
        sosAlarmStatus: false,
        firmwareVersion: 'v1.0.0 (Mock)',
      };
      this.notifyBatteryLevel(mockInfo.batteryLevel);
      return mockInfo;
    }

    if (!this.connectedDevice) {
      console.warn('[BLE] Cannot query device info: not connected');
      return null;
    }

    try {
      // Send device info query command
      await this.sendCommand(BLECommand.DEVICE_INFO, Buffer.from([0x00]));
      
      // Read response from notify characteristic
      // Note: In a real implementation, we'd wait for the notification callback
      // For now, we'll return null and rely on the notification handler
      return null;
    } catch (error) {
      console.error('[BLE] Error querying device info:', error);
      return null;
    }
  }

  /**
   * Setup notification listener for device responses
   */
  private async setupNotifications(device: Device): Promise<void> {
    try {
      console.log('[BLE] Setting up notifications...');
      
      await device.monitorCharacteristicForService(
        SERVICE_UUID,
        NOTIFY_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[BLE] Notification error:', error);
            return;
          }

          if (characteristic?.value) {
            this.handleNotification(characteristic);
          }
        }
      );

      console.log('[BLE] Notifications setup complete');
    } catch (error) {
      console.error('[BLE] Error setting up notifications:', error);
    }
  }

  /**
   * Handle notifications from device
   */
  private handleNotification(characteristic: Characteristic): void {
    try {
      // Check if characteristic value exists
      if (!characteristic.value) {
        console.warn('[BLE] Received notification with null value');
        return;
      }

      const data = Buffer.from(characteristic.value, 'base64');
      console.log('[BLE] Received notification:', data.toString('hex'));

      // Parse frame: 0xAA [CMD] [LEN] [DATA...] 0x55
      if (data.length < 4) {
        console.warn('[BLE] Invalid frame length');
        return;
      }

      if (data[0] !== FRAME_HEADER || data[data.length - 1] !== FRAME_TAIL) {
        console.warn('[BLE] Invalid frame header/tail');
        return;
      }

      const command = data[1];
      const length = data[2];
      const payload = data.slice(3, 3 + length);

      // Handle different response types
      switch (command) {
        case BLECommand.DEVICE_INFO:
          this.handleDeviceInfoResponse(payload);
          break;
        case BLECommand.SOS_ALARM:
          console.log('[BLE] SOS alarm response:', payload[0] === 0x00 ? 'Success' : 'Failed');
          // Check if this is an unsolicited notification (device was pulled)
          // If payload indicates alarm is active (0x01), notify listeners
          if (payload.length > 0 && payload[0] === 0x01) {
            console.log('[BLE] ⚠️ DEVICE SOS TRIGGERED - User pulled EVA device!');
            this.notifyDeviceSOS();
          }
          break;
        case BLECommand.ALARM_STATUS:
          // Alarm status query response or unsolicited notification
          if (payload.length > 0 && payload[0] === 0x01) {
            console.log('[BLE] ⚠️ DEVICE SOS TRIGGERED - Alarm is active!');
            this.notifyDeviceSOS();
          }
          break;
        case BLECommand.FIND_ALARM:
          console.log('[BLE] Find alarm response:', payload[0] === 0x00 ? 'Success' : 'Failed');
          break;
        default:
          console.log('[BLE] Unknown command response:', command);
      }
    } catch (error) {
      console.error('[BLE] Error handling notification:', error);
    }
  }

  /**
   * Handle device info response
   */
  private handleDeviceInfoResponse(payload: Buffer): void {
    if (payload.length < 10) {
      console.warn('[BLE] Invalid device info payload');
      return;
    }

    const batteryLevel = payload[0];
    const disconnectAlarmEnabled = payload[1] === 0x01;
    const searchAlarmStatus = payload[2] === 0x01;
    const sosAlarmStatus = payload[3] === 0x01;
    const firmwareBytes = payload.slice(4, 10);
    const firmwareVersion = firmwareBytes.toString('ascii');

    console.log('[BLE] Device info:', {
      batteryLevel,
      disconnectAlarmEnabled,
      searchAlarmStatus,
      sosAlarmStatus,
      firmwareVersion,
    });

    // Notify battery listeners
    this.notifyBatteryLevel(batteryLevel);
  }

  /**
   * Perform device pairing
   */
  private async performPairing(device: Device): Promise<boolean> {
    try {
      // Generate or load pairing code
      if (!this.pairingCode) {
        this.pairingCode = this.generatePairingCode();
        await this.savePairingCode();
      }

      console.log('[BLE] Sending pairing code...');
      return await this.sendCommand(BLECommand.PAIRING, this.pairingCode);
    } catch (error) {
      console.error('[BLE] Pairing error:', error);
      return false;
    }
  }

  /**
   * Generate random 5-byte pairing code
   */
  private generatePairingCode(): Buffer {
    const code = Buffer.alloc(5);
    for (let i = 0; i < 5; i++) {
      code[i] = Math.floor(Math.random() * 256);
    }
    return code;
  }

  /**
   * Save pairing code to AsyncStorage
   */
  private async savePairingCode(): Promise<void> {
    if (this.pairingCode) {
      await AsyncStorage.setItem(STORAGE_KEY_PAIRING_CODE, this.pairingCode.toString('hex'));
    }
  }

  /**
   * Load pairing code from AsyncStorage
   */
  private async loadPairingCode(): Promise<void> {
    try {
      const code = await AsyncStorage.getItem(STORAGE_KEY_PAIRING_CODE);
      if (code) {
        this.pairingCode = Buffer.from(code, 'hex');
      }
    } catch (error) {
      console.error('[BLE] Error loading pairing code:', error);
    }
  }

  /**
   * Save device info to AsyncStorage for persistence
   */
  private async saveDeviceInfo(device: Device): Promise<void> {
    try {
      const deviceInfo: StoredDevice = {
        id: device.id,
        name: device.name || null,
        connectedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(deviceInfo));
      console.log('[BLE] Device info saved:', deviceInfo);
    } catch (error) {
      console.error('[BLE] Error saving device info:', error);
    }
  }

  /**
   * Load device info from AsyncStorage
   */
  private async loadDeviceInfo(): Promise<StoredDevice | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_DEVICE);
      if (stored) {
        return JSON.parse(stored) as StoredDevice;
      }
    } catch (error) {
      console.error('[BLE] Error loading device info:', error);
    }
    return null;
  }

  /**
   * Clear device info from AsyncStorage
   */
  private async clearDeviceInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_DEVICE);
      console.log('[BLE] Device info cleared');
    } catch (error) {
      console.error('[BLE] Error clearing device info:', error);
    }
  }

  /**
   * Initialize Bluetooth state on app launch
   * Attempts to reconnect to previously connected device
   */
  private async initializeBluetoothState(): Promise<void> {
    try {
      // Wait a bit for BLE manager to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const storedDevice = await this.loadDeviceInfo();
      if (storedDevice && !this.mockMode) {
        console.log('[BLE] Found stored device, attempting reconnection:', storedDevice);
        // Attempt reconnection in background (don't block)
        this.attemptReconnection(storedDevice).catch(error => {
          console.error('[BLE] Background reconnection failed:', error);
        });
      }
    } catch (error) {
      console.error('[BLE] Error initializing Bluetooth state:', error);
    }
  }

  /**
   * Attempt to reconnect to a previously connected device
   */
  public async attemptReconnection(storedDevice?: StoredDevice): Promise<boolean> {
    if (this.mockMode) {
      console.log('[BLE] Mock mode: Skipping reconnection');
      return false;
    }

    const device = storedDevice || await this.loadDeviceInfo();
    if (!device) {
      console.log('[BLE] No stored device to reconnect to');
      return false;
    }

    // Check if already connected
    if (this.connectedDevice && this.connectionStatus === 'connected') {
      console.log('[BLE] Already connected, skipping reconnection');
      return true;
    }

    // Check reconnect attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[BLE] Max reconnection attempts reached');
      this.clearDeviceInfo();
      return false;
    }

    try {
      this.reconnectAttempts++;
      console.log(`[BLE] Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      // Check permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        console.error('[BLE] Permissions not granted for reconnection');
        return false;
      }

      // Check if Bluetooth is enabled
      const isEnabled = await this.isBluetoothEnabled();
      if (!isEnabled) {
        console.error('[BLE] Bluetooth not enabled for reconnection');
        return false;
      }

      // Try to find the device
      const devices = await this.manager.devices([device.id]);
      if (devices.length === 0) {
        console.log('[BLE] Device not found, may be out of range');
        // Don't clear device info yet - might come back in range
        return false;
      }

      const foundDevice = devices[0];
      console.log('[BLE] Found device, connecting...', foundDevice.name);

      // Connect with autoConnect enabled
      const connectedDevice = await this.manager.connectToDevice(foundDevice.id, {
        autoConnect: true,
        requestMTU: 512,
      });

      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = connectedDevice;
      this.updateConnectionStatus('connected', connectedDevice);
      this.reconnectAttempts = 0; // Reset on success

      // Setup disconnect listener
      this.manager.onDeviceDisconnected(connectedDevice.id, (error, disconnectedDevice) => {
        console.log('[BLE] Device disconnected:', disconnectedDevice?.name);
        this.connectedDevice = null;
        this.updateConnectionStatus('disconnected');
        
        if (error) {
          console.error('[BLE] Disconnect error:', error);
          this.notifyError(error);
        }
      });

      // Setup notifications
      await this.setupNotifications(connectedDevice);

      // Perform pairing
      await this.performPairing(connectedDevice);

      // Query device info
      await this.queryDeviceInfo();

      console.log('[BLE] Reconnection successful!');
      return true;
    } catch (error) {
      console.error('[BLE] Reconnection attempt failed:', error);
      
      // Retry with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        console.log(`[BLE] Retrying reconnection in ${delay}ms...`);
        setTimeout(() => {
          this.attemptReconnection(device);
        }, delay);
      } else {
        console.log('[BLE] Max reconnection attempts reached, clearing stored device');
        this.clearDeviceInfo();
      }
      
      return false;
    }
  }

  /**
   * Send command to device
   */
  private async sendCommand(command: BLECommand, data: Buffer): Promise<boolean> {
    if (!this.connectedDevice && !this.mockMode) {
      console.warn('[BLE] Cannot send command: not connected');
      return false;
    }

    if (this.mockMode) {
      console.log(`[BLE] Mock mode: Sending command ${command.toString(16)}`);
      return true;
    }

    try {
      // Build frame: 0xAA [CMD] [LEN] [DATA] 0x55
      const frame = Buffer.alloc(4 + data.length);
      frame[0] = FRAME_HEADER;
      frame[1] = command;
      frame[2] = data.length;
      data.copy(frame, 3);
      frame[frame.length - 1] = FRAME_TAIL;

      console.log('[BLE] Sending command:', frame.toString('hex'));

      // Write to device
      await this.connectedDevice!.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        WRITE_CHARACTERISTIC_UUID,
        frame.toString('base64')
      );

      return true;
    } catch (error) {
      console.error('[BLE] Error sending command:', error);
      this.notifyError(error as Error);
      return false;
    }
  }

  /**
   * Event listeners management
   */
  public addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    // Return cleanup function
    return () => this.connectionListeners.delete(listener);
  }

  public addBatteryListener(listener: BatteryListener): () => void {
    this.batteryListeners.add(listener);
    return () => this.batteryListeners.delete(listener);
  }

  public addErrorListener(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  public addDeviceSOSListener(listener: DeviceSOSListener): () => void {
    this.deviceSOSListeners.add(listener);
    return () => this.deviceSOSListeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus, device?: Device): void {
    this.connectionStatus = status;
    this.connectionListeners.forEach((listener) => listener(status, device));
  }

  private notifyBatteryLevel(level: number): void {
    this.batteryListeners.forEach((listener) => listener(level));
  }

  private notifyError(error: Error): void {
    this.errorListeners.forEach((listener) => listener(error));
  }

  private notifyDeviceSOS(): void {
    console.log('[BLE] Notifying', this.deviceSOSListeners.size, 'device SOS listeners');
    this.deviceSOSListeners.forEach((listener) => listener());
  }

  /**
   * Cleanup
   */
  public async destroy(): Promise<void> {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
    }
    await this.disconnect();
    this.manager.destroy();
  }
}

// Export singleton instance
export const bluetoothService = new BluetoothService();

