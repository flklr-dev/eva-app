import { getApiBaseUrl } from '../utils/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async (tokenFromContext?: string | null): Promise<string> => {
  // If token is provided from context, use it (faster and more reliable)
  if (tokenFromContext) {
    return tokenFromContext;
  }

  // Otherwise, try to get from AsyncStorage
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    throw new Error('No authentication token found');
  }
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  phone?: string;
  countryCode?: string;
  settings: {
    shareLocation: boolean;
    shareWithEveryone: boolean;
    notificationsEnabled: boolean;
  };
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  isActive: boolean;
  lastSeen: Date;
  createdAt: Date;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  settings?: {
    shareLocation?: boolean;
    shareWithEveryone?: boolean;
    notificationsEnabled?: boolean;
  };
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

export interface ApiResponse<T> {
  message: string;
  user?: T;
}

/**
 * Get user profile
 */
export const getProfile = async (tokenFromContext?: string | null): Promise<UserProfile> => {
  const token = await getAuthToken(tokenFromContext);

  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to get profile' }));
    throw new Error(errorData.message || 'Failed to get profile');
  }

  const data: ApiResponse<UserProfile> = await response.json();
  return data.user!;
};

/**
 * Update user profile
 */
export const updateProfile = async (updateData: ProfileUpdateData, tokenFromContext?: string | null): Promise<UserProfile> => {
  console.log('[profileService] updateProfile called with data:', updateData);
  console.log('[profileService] API base URL:', getApiBaseUrl());

  const token = await getAuthToken(tokenFromContext);
  console.log('[profileService] Using auth token (exists):', !!token);

  const apiUrl = `${getApiBaseUrl()}/api/profile`;
  console.log('[profileService] Making PATCH request to:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    console.log('[profileService] Response status:', response.status);
    console.log('[profileService] Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to update profile';
      let errorDetails = '';

      try {
        const errorData = await response.json();
        console.log('[profileService] Error response data:', errorData);
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.details || '';
      } catch (parseError) {
        console.log('[profileService] Could not parse error response:', parseError);
        // Try to get text content
        try {
          const textContent = await response.text();
          console.log('[profileService] Error response text:', textContent.substring(0, 200));
          if (textContent) {
            errorMessage = `Server error (${response.status}): ${textContent.substring(0, 100)}`;
          }
        } catch (textError) {
          console.log('[profileService] Could not get error response text:', textError);
        }
      }

      // Provide user-friendly error messages
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to update this profile.';
      } else if (response.status === 404) {
        errorMessage = 'Profile not found.';
      } else if (response.status === 422) {
        errorMessage = 'Invalid data provided. Please check your input.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!response.ok) {
        errorMessage = `Request failed (${response.status}): ${errorMessage}`;
      }

      console.error('[profileService] Throwing error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data: ApiResponse<UserProfile> = await response.json();
    console.log('[profileService] Profile updated successfully:', data.user?.name);
    return data.user!;
  } catch (networkError: any) {
    console.error('[profileService] Network error:', networkError);

    // Handle network errors specifically
    if (networkError.message === 'Failed to fetch' ||
        networkError.message.includes('Network request failed') ||
        networkError.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection and make sure the server is running.');
    }

    throw networkError;
  }
};

/**
 * Update user settings
 */
export const updateSettings = async (settings: {
  shareLocation?: boolean;
  shareWithEveryone?: boolean;
  notificationsEnabled?: boolean;
}, tokenFromContext?: string | null): Promise<{ shareLocation: boolean; shareWithEveryone: boolean; notificationsEnabled: boolean }> => {
  const token = await getAuthToken(tokenFromContext);

  const response = await fetch(`${getApiBaseUrl()}/api/profile/settings`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update settings' }));
    throw new Error(errorData.message || 'Failed to update settings');
  }

  const data: ApiResponse<{ settings: { shareLocation: boolean; shareWithEveryone: boolean; notificationsEnabled: boolean } }> = await response.json();
  return data.user!.settings;
};

/**
 * Delete user account
 */
export const deleteAccount = async (tokenFromContext?: string | null): Promise<{ message: string; note: string }> => {
  const token = await getAuthToken(tokenFromContext);

  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete account' }));
    throw new Error(errorData.message || 'Failed to delete account');
  }

  const data: { message: string; note: string } = await response.json();
  return data;
};

/**
 * Upload profile picture to Cloudinary
 */
export const uploadProfilePicture = async (imageUri: string, tokenFromContext?: string | null): Promise<{ profilePicture: string }> => {
  console.log('[profileService] uploadProfilePicture called with imageUri:', imageUri);

  const token = await getAuthToken(tokenFromContext);
  console.log('[profileService] Using auth token (exists):', !!token);

  const apiUrl = `${getApiBaseUrl()}/api/profile/picture`;
  console.log('[profileService] Making POST request to:', apiUrl);

  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    console.log('[profileService] FormData prepared with file:', filename, type);

    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type header - let fetch set it with boundary for FormData
      },
      body: formData,
    });

    console.log('[profileService] Response status:', response.status);
    console.log('[profileService] Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to upload profile picture';
      let errorDetails = '';

      try {
        const errorData = await response.json();
        console.log('[profileService] Error response data:', errorData);
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.error || '';
      } catch (parseError) {
        console.log('[profileService] Could not parse error response:', parseError);
        // Try to get text content
        try {
          const textContent = await response.text();
          console.log('[profileService] Error response text:', textContent.substring(0, 200));
          if (textContent) {
            errorMessage = `Upload failed (${response.status}): ${textContent.substring(0, 100)}`;
          }
        } catch (textError) {
          console.log('[profileService] Could not get error response text:', textError);
        }
      }

      // Provide user-friendly error messages
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (response.status === 413) {
        errorMessage = 'Image file is too large. Please choose a smaller image (max 5MB).';
      } else if (response.status === 415) {
        errorMessage = 'Invalid file format. Please choose a valid image file.';
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      console.error('[profileService] Throwing error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[profileService] Profile picture uploaded successfully:', data);

    return { profilePicture: data.profilePicture };

  } catch (networkError: any) {
    console.error('[profileService] Network error:', networkError);

    // Handle network errors specifically
    if (networkError.message === 'Failed to fetch' ||
        networkError.message.includes('Network request failed') ||
        networkError.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please check your internet connection and make sure the server is running.');
    }

    throw networkError;
  }
};
