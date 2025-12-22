/**
 * Status determination utilities
 * Provides functions to determine user online/offline status based on lastSeen timestamp
 */

/**
 * Constants for offline detection
 * Must match server-side OFFLINE_THRESHOLD_MS
 */
export const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes of inactivity = offline

/**
 * Determines if a user is online based on lastSeen timestamp
 * A user is considered online if they've been seen within the last 10 minutes
 * 
 * @param lastSeen - ISO string or Date of last user activity
 * @returns true if user is online, false if offline
 */
export const isUserOnlineFromTimestamp = (lastSeen?: string | Date): boolean => {
  if (!lastSeen) {
    return false; // No lastSeen = offline
  }

  try {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const timeDifference = now.getTime() - lastSeenDate.getTime();
    return timeDifference < OFFLINE_THRESHOLD_MS;
  } catch (error) {
    console.warn('Error parsing lastSeen date:', lastSeen);
    return false;
  }
};

/**
 * Gets the time ago string for a lastSeen timestamp
 * Useful for displaying "Last seen 5 minutes ago" in the UI
 * 
 * @param lastSeen - ISO string or Date of last user activity
 * @returns Human-readable time string
 */
export const getTimeAgoString = (lastSeen?: string | Date): string => {
  if (!lastSeen) {
    return 'Never seen';
  }

  try {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    
    // Convert to minutes, hours, days
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return lastSeenDate.toLocaleDateString();
    }
  } catch (error) {
    console.warn('Error calculating time ago:', lastSeen);
    return 'Unknown';
  }
};

/**
 * Gets a descriptive status message for display
 * 
 * @param isOnline - Whether the user is currently online
 * @param lastSeen - ISO string or Date of last user activity
 * @returns Status message suitable for display
 */
export const getStatusMessage = (isOnline: boolean, lastSeen?: string | Date): string => {
  if (isOnline) {
    return 'Online';
  }
  
  const timeAgo = getTimeAgoString(lastSeen);
  return `Offline • ${timeAgo}`;
};
