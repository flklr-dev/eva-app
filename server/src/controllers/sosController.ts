import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User, { IUser } from '../models/User';
import {
  createSOSAlert,
  getActiveSOSAlerts,
  getReceivedSOSAlerts,
  cancelSOSAlert,
  resolveSOSAlert,
} from '../services/sosService';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Create and send an SOS alert
 */
export const sendSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { latitude, longitude, message } = req.body;
    const userId = req.user?._id.toString()!;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'Valid latitude and longitude are required' });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({ message: 'Invalid coordinate values' });
      return;
    }

    const alert = await createSOSAlert(userId, latitude, longitude, message);

    res.json({
      message: 'SOS alert sent successfully',
      alert: {
        id: alert._id.toString(),
        status: alert.status,
        sentAt: alert.sentAt,
        recipientsCount: alert.recipients.length,
      },
    });
  } catch (error: any) {
    console.error('[SOS Controller] Error creating SOS alert:', error);
    res.status(500).json({ message: error.message || 'Server error while creating SOS alert' });
  }
};

/**
 * Get active SOS alerts sent by the user
 */
export const getMySOSAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    const alerts = await getActiveSOSAlerts(userId);

    res.json({
      alerts: alerts.map((alert) => ({
        id: alert._id.toString(),
        coordinates: {
          latitude: alert.coordinates.coordinates[1],
          longitude: alert.coordinates.coordinates[0],
        },
        status: alert.status,
        sentAt: alert.sentAt,
        message: alert.message,
        recipientsCount: alert.recipients.length,
      })),
    });
  } catch (error: any) {
    console.error('[SOS Controller] Error fetching SOS alerts:', error);
    res.status(500).json({ message: 'Server error while fetching SOS alerts' });
  }
};

/**
 * Get SOS alerts received by the user
 */
export const getReceivedSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id.toString()!;
    const alerts = await getReceivedSOSAlerts(userId);

    res.json({
      alerts: alerts.map((alert) => {
        const user = alert.userId as unknown as IUser;
        return {
          id: alert._id.toString(),
          sender: {
            id: user._id.toString(),
            name: user.name,
            profilePicture: user.profilePicture,
          },
          coordinates: {
            latitude: alert.coordinates.coordinates[1],
            longitude: alert.coordinates.coordinates[0],
          },
          status: alert.status,
          sentAt: alert.sentAt,
          message: alert.message,
        };
      }),
    });
  } catch (error: any) {
    console.error('[SOS Controller] Error fetching received SOS alerts:', error);
    res.status(500).json({ message: 'Server error while fetching received SOS alerts' });
  }
};

/**
 * Cancel an SOS alert
 */
export const cancelSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    const userId = req.user?._id.toString()!;

    const alert = await cancelSOSAlert(alertId, userId);

    res.json({
      message: 'SOS alert cancelled successfully',
      alert: {
        id: alert._id.toString(),
        status: alert.status,
        cancelledAt: alert.cancelledAt,
      },
    });
  } catch (error: any) {
    console.error('[SOS Controller] Error cancelling SOS alert:', error);
    res.status(400).json({ message: error.message || 'Server error while cancelling SOS alert' });
  }
};

/**
 * Resolve an SOS alert
 */
export const resolveSOS = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;
    const userId = req.user?._id.toString()!;

    const alert = await resolveSOSAlert(alertId, userId);

    res.json({
      message: 'SOS alert resolved successfully',
      alert: {
        id: alert._id.toString(),
        status: alert.status,
        resolvedAt: alert.resolvedAt,
      },
    });
  } catch (error: any) {
    console.error('[SOS Controller] Error resolving SOS alert:', error);
    res.status(400).json({ message: error.message || 'Server error while resolving SOS alert' });
  }
};


