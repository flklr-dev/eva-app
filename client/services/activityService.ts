import { getCleanedApiBaseUrl } from '../utils/apiConfig';
import { Activity, ActivityType } from '../types/activity';

const API_BASE_URL = getCleanedApiBaseUrl();

export interface BackendActivity {
  id: string;
  userId: string;
  userName: string;
  profilePicture?: string;
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
  timestamp: string | Date;
  visibleTo: string[];
}

/**
 * Get activities from the API
 */
export const getActivities = async (
  token: string,
  limit: number = 50,
  offset: number = 0,
  type?: ActivityType
): Promise<Activity[]> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  if (type) {
    params.append('type', type);
  }

  const response = await fetch(`${API_BASE_URL}/api/activities?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get activities');
  }

  const data = await response.json();
  return data.activities.map(formatActivityForDisplay);
};

/**
 * Format backend activity to client Activity type
 */
export const formatActivityForDisplay = (backendActivity: BackendActivity): Activity => {
  return {
    id: backendActivity.id,
    userId: backendActivity.userId,
    userName: backendActivity.userName,
    profilePicture: backendActivity.profilePicture,
    message: backendActivity.message,
    timeAgo: formatTimeAgo(backendActivity.timestamp),
    location: getActivityLocation(backendActivity),
    timestamp: typeof backendActivity.timestamp === 'string' 
      ? new Date(backendActivity.timestamp) 
      : backendActivity.timestamp,
    type: backendActivity.type,
    metadata: backendActivity.metadata,
  };
};

/**
 * Format timestamp to "5hr", "2d", etc.
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'now';
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}hr`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w`;
  }
};

/**
 * Get icon name for activity type
 */
export const getActivityIcon = (type: ActivityType): string => {
  switch (type) {
    case 'home_arrival':
      return 'home-variant';
    case 'message':
      return 'message-text-outline';
    case 'status_change':
      return 'account-plus';
    case 'location_update':
      return 'map-marker';
    case 'sos':
      return 'alert';
    default:
      return 'bell';
  }
};

/**
 * Extract location string from activity
 */
export const getActivityLocation = (activity: BackendActivity): string => {
  if (activity.location?.name) {
    return activity.location.name;
  }
  
  // For home_arrival, try to extract from message
  if (activity.type === 'home_arrival' && activity.message.includes('at ')) {
    const match = activity.message.match(/at (.+?)(?:\.|$)/);
    if (match) {
      return match[1];
    }
  }
  
  // For status_change types without location, don't show location
  if (activity.type === 'status_change') {
    return '';
  }
  
  return '';
};

