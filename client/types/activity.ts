/**
 * TypeScript types for Activity feature
 */

export type ActivityType =
  | 'location_update'
  | 'message'
  | 'sos'
  | 'status_change'
  | 'home_arrival';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  profilePicture?: string;
  message: string; // e.g., "Walking Alone" or "You send Arrived Home to your contacts"
  timeAgo: string; // e.g., "5hr"
  location: string; // e.g., "Downtown" or "Home"
  timestamp: Date;
  type: ActivityType;
  metadata?: Record<string, any>;
}

