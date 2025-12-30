import { Request, Response } from 'express';
import * as activityService from '../services/activityService';
import { IUser } from '../models/User';
import { ActivityType } from '../models/Activity';

interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Get activities for current user
 * GET /api/activities
 */
export const getActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as ActivityType | undefined;

    // Validate type if provided
    if (type && !['location_update', 'message', 'sos', 'status_change', 'home_arrival'].includes(type)) {
      res.status(400).json({ message: 'Invalid activity type' });
      return;
    }

    // Get combined activities (user's activities + activities visible to them)
    const activities = await activityService.getCombinedActivities(userId, limit, offset, type);

    // Format activities for response
    const formattedActivities = activities.map(activity => ({
      id: activity._id.toString(),
      userId: activity.userId._id?.toString() || activity.userId.toString(),
      userName: (activity.userId as any).name || 'Unknown',
      profilePicture: (activity.userId as any).profilePicture,
      type: activity.type,
      message: activity.message,
      location: activity.location,
      metadata: activity.metadata,
      timestamp: activity.timestamp,
      visibleTo: activity.visibleTo.map((id: any) => id.toString()),
    }));

    res.status(200).json({
      activities: formattedActivities,
      total: formattedActivities.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[ActivityController] Get activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

