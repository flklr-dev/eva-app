import { Request, Response } from 'express';
import Device from '../models/Device';
import User, { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Add a new device
 * POST /api/devices
 */
export const addDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { deviceId, deviceType, name, metadata } = req.body;

    // Validate required fields
    if (!deviceId || !name) {
      res.status(400).json({ message: 'Device ID and name are required' });
      return;
    }

    // Check if device already exists for this user
    const existingDevice = await Device.findOne({ userId, deviceId });
    if (existingDevice) {
      res.status(409).json({ message: 'Device already added' });
      return;
    }

    // Create new device
    const device = new Device({
      userId,
      deviceId,
      deviceType: deviceType || 'bluetooth',
      name,
      isConnected: false,
      metadata: metadata || {},
    });

    await device.save();

    res.status(201).json({
      message: 'Device added successfully',
      device: {
        id: device._id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        name: device.name,
        isConnected: device.isConnected,
        batteryLevel: device.batteryLevel,
        lastConnectedAt: device.lastConnectedAt,
        createdAt: device.createdAt,
      },
    });
  } catch (error) {
    console.error('[DeviceController] Error adding device:', error);
    res.status(500).json({ message: 'Failed to add device' });
  }
};

/**
 * Get all devices for the authenticated user
 * GET /api/devices
 */
export const getDevices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const devices = await Device.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      devices: devices.map((device) => ({
        id: device._id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        name: device.name,
        isConnected: device.isConnected,
        batteryLevel: device.batteryLevel,
        lastConnectedAt: device.lastConnectedAt,
        createdAt: device.createdAt,
      })),
    });
  } catch (error) {
    console.error('[DeviceController] Error getting devices:', error);
    res.status(500).json({ message: 'Failed to get devices' });
  }
};

/**
 * Get a specific device by ID
 * GET /api/devices/:deviceId
 */
export const getDeviceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { deviceId } = req.params;

    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    res.status(200).json({
      device: {
        id: device._id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        name: device.name,
        isConnected: device.isConnected,
        batteryLevel: device.batteryLevel,
        lastConnectedAt: device.lastConnectedAt,
        metadata: device.metadata,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      },
    });
  } catch (error) {
    console.error('[DeviceController] Error getting device:', error);
    res.status(500).json({ message: 'Failed to get device' });
  }
};

/**
 * Update device information
 * PATCH /api/devices/:deviceId
 */
export const updateDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { deviceId } = req.params;
    const { name, isConnected, batteryLevel, metadata } = req.body;

    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    // Update fields
    if (name !== undefined) device.name = name;
    if (isConnected !== undefined) {
      device.isConnected = isConnected;
      if (isConnected) {
        device.lastConnectedAt = new Date();
      }
    }
    if (batteryLevel !== undefined) device.batteryLevel = batteryLevel;
    if (metadata !== undefined) {
      device.metadata = { ...device.metadata, ...metadata };
    }

    await device.save();

    res.status(200).json({
      message: 'Device updated successfully',
      device: {
        id: device._id,
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        name: device.name,
        isConnected: device.isConnected,
        batteryLevel: device.batteryLevel,
        lastConnectedAt: device.lastConnectedAt,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
      },
    });
  } catch (error) {
    console.error('[DeviceController] Error updating device:', error);
    res.status(500).json({ message: 'Failed to update device' });
  }
};

/**
 * Remove a device
 * DELETE /api/devices/:deviceId
 */
export const removeDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { deviceId } = req.params;

    const device = await Device.findOneAndDelete({ _id: deviceId, userId });
    if (!device) {
      res.status(404).json({ message: 'Device not found' });
      return;
    }

    res.status(200).json({
      message: 'Device removed successfully',
    });
  } catch (error) {
    console.error('[DeviceController] Error removing device:', error);
    res.status(500).json({ message: 'Failed to remove device' });
  }
};

