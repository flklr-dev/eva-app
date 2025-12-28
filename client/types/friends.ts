/**
 * TypeScript types for Friends feature
 */

export interface Friend {
  id: string;
  name: string;
  country: string;
  profilePicture?: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  status: 'online' | 'offline' | 'away';
  phone?: string;
  email?: string;
}

export interface FriendWithDistance extends Friend {
  distance: number; // in kilometers
}

