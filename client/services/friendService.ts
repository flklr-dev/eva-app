import { getCleanedApiBaseUrl } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = getCleanedApiBaseUrl();

const getAuthToken = async (tokenFromContext?: string | null): Promise<string | null> => {
  // If token is provided from context, use it (faster and more reliable)
  if (tokenFromContext) {
    return tokenFromContext;
  }
  
  // Otherwise, try to get from AsyncStorage
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (recipientId: string, tokenFromContext?: string | null): Promise<void> => {
  console.log('[FriendService] ========== SEND FRIEND REQUEST ==========');
  console.log('[FriendService] Recipient ID:', recipientId);
  console.log('[FriendService] Has token from context:', !!tokenFromContext);
  
  const token = await getAuthToken(tokenFromContext);
  console.log('[FriendService] Got auth token:', !!token);
  
  if (!token) {
    console.error('[FriendService] No authentication token available');
    throw new Error('Not authenticated');
  }

  console.log('[FriendService] Making POST request to:', `${API_BASE_URL}/api/friends/request`);
  const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipientId }),
  });

  console.log('[FriendService] Response status:', response.status);
  console.log('[FriendService] Response ok:', response.ok);
  
  if (!response.ok) {
    const error = await response.json();
    console.error('[FriendService] Error response:', error);
    throw new Error(error.message || 'Failed to send friend request');
  }
  
  const responseData = await response.json();
  console.log('[FriendService] ✓ Success response:', responseData);
  console.log('[FriendService] =============================================');
};

/**
 * Get friend requests (sent and received)
 */
/**
 * Get friend requests (with optional token parameter)
 */
export const getFriendRequests = async (tokenFromContext?: string | null): Promise<{
  sent: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    profilePicture?: string;
    status: string;
    isRequester: boolean;
    createdAt: string;
    requestId?: string;
  }>;
  received: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    profilePicture?: string;
    status: string;
    isRequester: boolean;
    createdAt: string;
    requestId?: string;
  }>;
}> => {
  const token = await getAuthToken(tokenFromContext);
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/friends/requests`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get friend requests');
  }

  return await response.json();
};

/**
 * Accept or reject a friend request
 */
export const respondToFriendRequest = async (
  requestId: string,
  action: 'accept' | 'reject'
): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/friends/requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to ${action} friend request`);
  }
};

/**
 * Get all friends (uses token from AsyncStorage)
 */
export const getFriends = async (): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    profilePicture?: string;
    status: string;
    isRequester: boolean;
    createdAt: string;
    isActive?: boolean;
    isOnline?: boolean; // NEW: Derived from lastSeen on server
    lastSeen?: string;
    lastKnownLocation?: {
      coordinates: {
        lat: number;
        lng: number;
      };
      timestamp: string;
      accuracy?: number;
    };
  }>
> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  return getFriendsWithToken(token);
};

/**
 * Get all friends (with explicit token parameter)
 */
export const getFriendsWithToken = async (token: string): Promise<
  Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    profilePicture?: string;
    status: string;
    isRequester: boolean;
    createdAt: string;
    isActive?: boolean;
    isOnline?: boolean; // NEW: Derived from lastSeen on server
    lastSeen?: string;
    lastKnownLocation?: {
      coordinates: {
        lat: number;
        lng: number;
      };
      timestamp: string;
      accuracy?: number;
    };
    shareLocation?: boolean; // NEW: Whether friend has location sharing enabled
  }>
> => {
  const url = `${API_BASE_URL}/api/friends`;
  console.log('[Friends] Fetching from:', url);
  console.log('[Friends] API_BASE_URL:', API_BASE_URL);
  console.log('[Friends] Has token:', !!token);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[Friends] Response status:', response.status);
  
  if (!response.ok) {
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      console.error('[Friends] JSON error:', error);
      throw new Error(error.message || 'Failed to get friends');
    } else {
      // Response is not JSON (likely HTML error page)
      const text = await response.text();
      console.error('[Friends] Non-JSON error response:', text.substring(0, 200));
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
  }

  const data = await response.json();
  return data.friends || [];
};

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = async (friendId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove friend');
  }
};

/**
 * Get friend details
 */
export const getFriendDetails = async (friendId: string): Promise<{
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  status: string;
  isRequester: boolean;
  createdAt: string;
}> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/friends/${friendId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get friend details');
  }

  const data = await response.json();
  return data.friend;
};

/**
 * Cancel a sent friend request
 */
export const cancelFriendRequest = async (requestId: string): Promise<void> => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE_URL}/api/friends/requests/${requestId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel friend request');
  }
};

/**
 * Send safe home notification to all friends
 * This is called automatically when the user returns home
 */
export const sendSafeHomeNotification = async (token: string): Promise<void> => {
  console.log('[FriendService] Sending safe home notification to friends...');
  
  const response = await fetch(`${API_BASE_URL}/api/notifications/safe-home`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[FriendService] Error sending safe home notification:', error);
    throw new Error(error.message || 'Failed to send safe home notification');
  }

  const data = await response.json();
  console.log('[FriendService] Safe home notification sent successfully:', data);
};

