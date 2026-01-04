import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  addDevice,
  getDevices,
  updateDevice,
  removeDevice,
  getDeviceById,
} from '../controllers/deviceController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/devices
 * @desc    Add a new device
 * @access  Private
 */
router.post('/', addDevice);

/**
 * @route   GET /api/devices
 * @desc    Get all devices for the authenticated user
 * @access  Private
 */
router.get('/', getDevices);

/**
 * @route   GET /api/devices/:deviceId
 * @desc    Get a specific device by ID
 * @access  Private
 */
router.get('/:deviceId', getDeviceById);

/**
 * @route   PATCH /api/devices/:deviceId
 * @desc    Update device information
 * @access  Private
 */
router.patch('/:deviceId', updateDevice);

/**
 * @route   DELETE /api/devices/:deviceId
 * @desc    Remove a device
 * @access  Private
 */
router.delete('/:deviceId', removeDevice);

export default router;

