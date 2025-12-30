import mongoose, { Types } from 'mongoose';
import Activity, { IActivity, ActivityType } from '../models/Activity';
import User from '../models/User';

export interface CreateActivityParams {
  userId: string;
  type: ActivityType;
  message: string;
  location?: {
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, any>;
  visibleTo: string[];
}

/**
 * Create a new activity
 */
export const createActivity = async (params: CreateActivityParams): Promise<IActivity> => {
  const { userId, type, message, location, metadata, visibleTo } = params;

  // Convert visibleTo strings to ObjectIds
  const visibleToObjectIds = visibleTo.map(id => new Types.ObjectId(id));

  const activity = new Activity({
    userId: new Types.ObjectId(userId),
    type,
    message,
    location,
    metadata: metadata || {},
    visibleTo: visibleToObjectIds,
    timestamp: new Date(),
  });

  const savedActivity = await activity.save();
  console.log('[ActivityService] Activity created:', {
    id: savedActivity._id,
    type,
    userId,
    visibleToCount: visibleTo.length,
  });

  return savedActivity;
};

/**
 * Get activities visible to a user (from visibleTo array)
 */
export const getActivitiesForUser = async (
  userId: string,
  limit: number = 50,
  offset: number = 0,
  type?: ActivityType
): Promise<IActivity[]> => {
  const query: any = {
    visibleTo: new Types.ObjectId(userId),
  };

  if (type) {
    query.type = type;
  }

  const activities = await Activity.find(query)
    .populate('userId', 'name profilePicture')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset)
    .lean();

  return activities as unknown as IActivity[];
};

/**
 * Get activities created by a user
 */
export const getUserActivities = async (
  userId: string,
  limit: number = 50,
  offset: number = 0,
  type?: ActivityType
): Promise<IActivity[]> => {
  const query: any = {
    userId: new Types.ObjectId(userId),
  };

  if (type) {
    query.type = type;
  }

  const activities = await Activity.find(query)
    .populate('userId', 'name profilePicture')
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset)
    .lean();

  return activities as unknown as IActivity[];
};

/**
 * Get combined activities (user's activities + activities visible to them)
 * Returns unique activities sorted by timestamp
 */
export const getCombinedActivities = async (
  userId: string,
  limit: number = 50,
  offset: number = 0,
  type?: ActivityType
): Promise<IActivity[]> => {
  const userObjectId = new Types.ObjectId(userId);

  // Build query for visible activities
  const visibleQuery: any = {
    visibleTo: userObjectId,
  };
  if (type) {
    visibleQuery.type = type;
  }

  // Build query for user's own activities
  const userQuery: any = {
    userId: userObjectId,
  };
  if (type) {
    userQuery.type = type;
  }

  // Fetch both sets of activities
  const [visibleActivities, userActivities] = await Promise.all([
    Activity.find(visibleQuery)
      .populate('userId', 'name profilePicture')
      .sort({ timestamp: -1 })
      .lean(),
    Activity.find(userQuery)
      .populate('userId', 'name profilePicture')
      .sort({ timestamp: -1 })
      .lean(),
  ]);

  // Combine and deduplicate by _id
  const activityMap = new Map<string, IActivity>();

  // Add visible activities
  visibleActivities.forEach(activity => {
    activityMap.set(activity._id.toString(), activity as unknown as IActivity);
  });

  // Add user's own activities (will overwrite duplicates if any)
  userActivities.forEach(activity => {
    activityMap.set(activity._id.toString(), activity as unknown as IActivity);
  });

  // Convert map to array and sort by timestamp
  const combinedActivities = Array.from(activityMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply pagination
  const paginatedActivities = combinedActivities.slice(offset, offset + limit);

  return paginatedActivities;
};

