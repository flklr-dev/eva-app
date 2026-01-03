import { BleManager, Device, BleError, State } from 'react-native-ble-plx';
import { Platform, Alert } from 'react-native';
import { PermissionsAndroid } from 'react-native';

class BluetoothService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Check Android version for different permission requirements
      if (Platform.Version >= 31) { // Android 12 (API 31) and above
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        const grantedResults = await PermissionsAndroid.requestMultiple(permissions);
        const grantedValues = Object.values(grantedResults);
        
        return grantedValues.every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      } else { // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Bluetooth requires location permission to scan for devices',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  async scanAndConnect(): Promise<Device | null> {
    return new Promise((resolve, reject) => {
      const subscription = this.manager.onStateChange((state: State) => {
        if (state === 'PoweredOn') {
          subscription.remove();
          this.scanForDevice(resolve, reject);
        } else if (state === 'PoweredOff' || state === 'Unsupported') {
          subscription.remove();
          reject(new Error('Bluetooth is not available'));
        }
      }, true);
    });
  }

  private scanForDevice(resolve: (device: Device | null) => void, reject: (error: any) => void) {
    const scanTimeout = setTimeout(() => {
      this.manager.stopDeviceScan();
      resolve(null);
    }, 10000); // 10 second timeout

    this.manager.startDeviceScan(null, null, (error: BleError | null, device: Device | null) => {
      if (error) {
        clearTimeout(scanTimeout);
        this.manager.stopDeviceScan();
        reject(error);
        return;
      }

      if (device && device.name?.toLowerCase().includes('sos personal alarm')) {
        clearTimeout(scanTimeout);
        this.manager.stopDeviceScan();
        this.connectToDevice(device)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private async connectToDevice(device: Device): Promise<Device> {
    try {
      const connectedDevice = await this.manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      this.connectedDevice = connectedDevice;
      this.isConnected = true;
      return connectedDevice;
    } catch (error) {
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.connectedDevice = null;
      this.isConnected = false;
    }
  }

  async isConnectedToDevice(): Promise<boolean> {
    if (!this.connectedDevice) return false;
    return this.connectedDevice.isConnected();
  }

  // Getters for connected device and connection status
  getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export default new BluetoothService();