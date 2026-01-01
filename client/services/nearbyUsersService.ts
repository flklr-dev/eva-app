import { getApiBaseUrl } from '../utils/apiConfig';

export interface NearbyUser {
  id: string;
  name: string;
  profilePicture?: string;
  distance: number; // Distance in meters
  lastKnownLocation?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    timestamp: Date;
  };
}

export interface NearbyUsersResponse {
  users: NearbyUser[];
  count: number;
}

/**
 * Get nearby users within a specified radius (default 5km)
 */
export const getNearbyUsers = async (
  token: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
): Promise<NearbyUsersResponse> => {
  try {
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/api/profile/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radiusMeters}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch nearby users' }));
      throw new Error(errorData.message || 'Failed to fetch nearby users');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[NearbyUsers] Error fetching nearby users:', error);
    throw error;
  }
};


