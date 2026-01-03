import BluetoothService from './bluetoothService';
import { Device } from 'react-native-ble-plx';

// Command IDs
const COMMANDS = {
  FIND_ALARM: 0x01,
  DISCONNECT_ALARM: 0x02,
  SOS_ALARM: 0x03,
  ALARM_STATUS_QUERY: 0x04,
  PAIRING: 0x05,
  DEVICE_INFO_QUERY: 0xCC,
} as const;

type CommandId = typeof COMMANDS[keyof typeof COMMANDS];

export interface DeviceInfo {
  batteryLevel: number;
  disconnectAlarmStatus: number;
  findAlarmStatus: number;
  sosAlarmStatus: number;
  firmwareVersion: string;
}

export class BluetoothProtocol {
  private static readonly SERVICE_UUID = 'FFF0';
  private static readonly CONTROL_CHAR_UUID = 'FFF1';
  private static readonly DATA_CHAR_UUID = 'FFF2';
  private static readonly FRAME_HEADER = 0xAA;
  private static readonly FRAME_TAIL = 0x55;

  static async sendCommand(
    commandId: CommandId,
    data: number[] = []
  ): Promise<boolean> {
    const device: Device | null = BluetoothService.getConnectedDevice();
    if (!device) {
      console.error('No connected device');
      return false;
    }

    // Create the frame
    const frame = this.createFrame(commandId, data);
    
    try {
      // Write to control characteristic (0xFFF1)
      await device.writeCharacteristicWithResponseForService(
        this.formatUUID(this.SERVICE_UUID),
        this.formatUUID(this.CONTROL_CHAR_UUID),
        this.bufferToBase64(frame)
      );
      return true;
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  private static createFrame(commandId: CommandId, data: number[]): number[] {
    const frame: number[] = [];
    
    // Add frame header
    frame.push(this.FRAME_HEADER);
    
    // Add command ID
    frame.push(commandId);
    
    // Add data length
    frame.push(data.length);
    
    // Add data payload
    frame.push(...data);
    
    // Add frame tail
    frame.push(this.FRAME_TAIL);
    
    return frame;
  }

  private static bufferToBase64(buffer: number[]): string {
    const uint8Array = new Uint8Array(buffer);
    // Convert to base64 using React Native compatible approach
    const binaryString = String.fromCharCode(...uint8Array);
    return btoa(binaryString);
  }

  private static formatUUID(uuid: string): string {
    // Format UUID properly (e.g., 'FFF0' -> 'FFF0' or '0000-FFF0-0000-1000-8000-00805F9B34FB')
    // For BLE characteristics, we typically use the 4-character format
    return uuid;
  }

  // Specific command methods
  static async startFindAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.FIND_ALARM, [0x01]);
  }

  static async stopFindAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.FIND_ALARM, [0x00]);
  }

  static async enableDisconnectAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.DISCONNECT_ALARM, [0x01]);
  }

  static async disableDisconnectAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.DISCONNECT_ALARM, [0x00]);
  }

  static async triggerSOSAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.SOS_ALARM, [0x01]);
  }

  static async stopSOSAlarm(): Promise<boolean> {
    return this.sendCommand(COMMANDS.SOS_ALARM, [0x00]);
  }

  static async queryAlarmStatus(): Promise<number | null> {
    await this.sendCommand(COMMANDS.ALARM_STATUS_QUERY, [0x00]);
    // Need to read response from data characteristic
    return this.readResponse();
  }

  static async pairDevice(pairingCode: number[]): Promise<boolean> {
    if (pairingCode.length !== 5) {
      throw new Error('Pairing code must be 5 bytes');
    }
    return this.sendCommand(COMMANDS.PAIRING, pairingCode);
  }

  static async queryDeviceInfo(): Promise<DeviceInfo | null> {
    await this.sendCommand(COMMANDS.DEVICE_INFO_QUERY, [0x00]);
    return this.readDeviceInfoResponse();
  }

  private static async readResponse(): Promise<number | null> {
    // Implementation for reading response from device
    // This would typically involve setting up notifications on the data characteristic
    const device: Device | null = BluetoothService.getConnectedDevice();
    if (!device) return null;

    try {
      const characteristic = await device.readCharacteristicForService(
        this.formatUUID(this.SERVICE_UUID),
        this.formatUUID(this.DATA_CHAR_UUID)
      );
      
      // Parse the response frame
      if (!characteristic.value) return null;
      
      const responseBuffer = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
      return this.parseResponseFrame(Array.from(responseBuffer));
    } catch (error) {
      console.error('Error reading response:', error);
      return null;
    }
  }

  private static parseResponseFrame(frame: number[]): number | null {
    if (frame.length < 5) return null; // Minimum frame size
    
    if (frame[0] !== this.FRAME_HEADER || frame[frame.length - 1] !== this.FRAME_TAIL) {
      console.error('Invalid frame format');
      return null;
    }
    
    // Return the data content (excluding header, command ID, length, and tail)
    const commandId = frame[1];
    const dataLength = frame[2];
    const dataContent = frame.slice(3, 3 + dataLength);
    
    return dataContent[0]; // Return the first byte of data content
  }

  private static async readDeviceInfoResponse(): Promise<DeviceInfo | null> {
    // Implementation for reading device info response
    const device: Device | null = BluetoothService.getConnectedDevice();
    if (!device) return null;

    try {
      const characteristic = await device.readCharacteristicForService(
        this.formatUUID(this.SERVICE_UUID),
        this.formatUUID(this.DATA_CHAR_UUID)
      );
      
      if (!characteristic.value) return null;
      
      // Parse the device info response frame
      const responseBuffer = new Uint8Array(Buffer.from(characteristic.value, 'base64'));
      return this.parseDeviceInfoFrame(Array.from(responseBuffer));
    } catch (error) {
      console.error('Error reading device info:', error);
      return null;
    }
  }

  private static parseDeviceInfoFrame(frame: number[]): DeviceInfo | null {
    if (frame.length < 13) return null; // Minimum frame size for device info
    
    if (frame[0] !== this.FRAME_HEADER || frame[frame.length - 1] !== this.FRAME_TAIL) {
      console.error('Invalid device info frame format');
      return null;
    }
    
    // Parse device info data
    const dataContent = frame.slice(3, frame.length - 1);
    
    if (dataContent.length < 10) return null; // Ensure we have enough data
    
    return {
      batteryLevel: dataContent[0],
      disconnectAlarmStatus: dataContent[1],
      findAlarmStatus: dataContent[2],
      sosAlarmStatus: dataContent[3],
      firmwareVersion: `${dataContent[4]}.${dataContent[5]}.${dataContent[6]}`,
    };
  }
}