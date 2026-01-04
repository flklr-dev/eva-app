import { getApiBaseUrl } from '../utils/apiConfig';

export interface DeviceData {
  id: string;
  deviceId: string;
  deviceType: 'bluetooth' | 'other';
  name: string;
  isConnected: boolean;
  batteryLevel?: number;
  lastConnectedAt?: Date;
  createdAt: Date;
}

export interface AddDeviceParams {
  deviceId: string;
  deviceType?: 'bluetooth' | 'other';
  name: string;
  metadata?: Record<string, any>;
}

export interface UpdateDeviceParams {
  name?: string;
  isConnected?: boolean;
  batteryLevel?: number;
  metadata?: Record<string, any>;
}

/**
 * Add a new device
 */
export const addDevice = async (
  token: string,
  params: AddDeviceParams
): Promise<DeviceData> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to add device' }));
      throw new Error(errorData.message || 'Failed to add device');
    }

    const data = await response.json();
    return data.device;
  } catch (error: any) {
    console.error('[DeviceService] Error adding device:', error);
    throw error;
  }
};

/**
 * Get all devices for the authenticated user
 */
export const getDevices = async (token: string): Promise<DeviceData[]> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/devices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get devices' }));
      throw new Error(errorData.message || 'Failed to get devices');
    }

    const data = await response.json();
    return data.devices;
  } catch (error: any) {
    console.error('[DeviceService] Error getting devices:', error);
    throw error;
  }
};

/**
 * Get a specific device by ID
 */
export const getDeviceById = async (
  token: string,
  deviceId: string
): Promise<DeviceData> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/devices/${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to get device' }));
      throw new Error(errorData.message || 'Failed to get device');
    }

    const data = await response.json();
    return data.device;
  } catch (error: any) {
    console.error('[DeviceService] Error getting device:', error);
    throw error;
  }
};

/**
 * Update device information
 */
export const updateDevice = async (
  token: string,
  deviceId: string,
  params: UpdateDeviceParams
): Promise<DeviceData> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/devices/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update device' }));
      throw new Error(errorData.message || 'Failed to update device');
    }

    const data = await response.json();
    return data.device;
  } catch (error: any) {
    console.error('[DeviceService] Error updating device:', error);
    throw error;
  }
};

/**
 * Remove a device
 */
export const removeDevice = async (
  token: string,
  deviceId: string
): Promise<void> => {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to remove device' }));
      throw new Error(errorData.message || 'Failed to remove device');
    }
  } catch (error: any) {
    console.error('[DeviceService] Error removing device:', error);
    throw error;
  }
};

