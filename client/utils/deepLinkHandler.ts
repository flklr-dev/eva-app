import { Linking, Platform } from 'react-native';
import { Alert } from 'react-native';
import { sendFriendRequest } from '../services/friendService';
import { getApiBaseUrl } from './apiConfig';

/**
 * Deep Link Handler
 * Handles eva-alert:// URLs for friend invitations
 * Also supports exp:// URLs for Expo Go development
 */

export interface DeepLinkData {
  type: 'invite' | 'user' | 'unknown';
  userId?: string;
  path?: string;
}

/**
 * Parse deep link URL and extract data
 * Supports multiple formats:
 * 1. eva-alert://invite/{userId} (custom URL scheme - standalone builds)
 * 2. exp://IP:PORT/--/invite/{userId} (Expo Go development)
 * 3. https://{domain}/invite/{userId} (HTTPS URL for QR codes)
 * 4. EVA-ALERT:{userId} (legacy text format for clipboard)
 */
export const parseDeepLink = (url: string): DeepLinkData => {
  try {
    // Remove any whitespace
    const cleanUrl = url.trim();
    
    console.log('[DeepLink] Parsing URL:', cleanUrl);

    // Format 1: Check if it's an eva-alert:// URL (standalone builds)
    if (cleanUrl.startsWith('eva-alert://')) {
      const urlWithoutScheme = cleanUrl.replace('eva-alert://', '');
      const parts = urlWithoutScheme.split('/').filter(Boolean);

      if (parts.length === 0) {
        return { type: 'unknown' };
      }

      const [type, ...rest] = parts;

      if (type === 'invite' && rest.length > 0) {
        console.log('[DeepLink] Matched eva-alert://invite format, userId:', rest[0]);
        return {
          type: 'invite',
          userId: rest[0],
          path: rest.join('/'),
        };
      }

      if (type === 'user' && rest.length > 0) {
        return {
          type: 'user',
          userId: rest[0],
          path: rest.join('/'),
        };
      }

      return { type: 'unknown', path: urlWithoutScheme };
    }

    // Format 2: Check if it's an exp:// URL (Expo Go development)
    // Format: exp://IP:PORT/--/invite/{userId}
    if (cleanUrl.startsWith('exp://') || cleanUrl.startsWith('exps://')) {
      try {
        // Parse the exp:// URL
        // Example: exp://192.168.137.1:8081/--/invite/abc123
        const expMatch = cleanUrl.match(/exp[s]?:\/\/[^/]+\/--\/(.+)/);
        if (expMatch) {
          const pathAfterSlashes = expMatch[1];
          const parts = pathAfterSlashes.split('/').filter(Boolean);
          
          if (parts.length >= 2 && parts[0] === 'invite') {
            console.log('[DeepLink] Matched exp://...--/invite format, userId:', parts[1]);
            return {
              type: 'invite',
              userId: parts[1],
              path: parts.slice(1).join('/'),
            };
          }
          
          if (parts.length >= 2 && parts[0] === 'user') {
            return {
              type: 'user',
              userId: parts[1],
              path: parts.slice(1).join('/'),
            };
          }
        }
      } catch (expError) {
        console.log('[DeepLink] Error parsing exp:// URL:', expError);
      }
    }

    // Format 3: Check if it's an HTTPS URL with /invite/ path
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 2 && pathParts[0] === 'invite') {
          console.log('[DeepLink] Matched http(s)://*/invite format, userId:', pathParts[1]);
          return {
            type: 'invite',
            userId: pathParts[1],
            path: pathParts.slice(1).join('/'),
          };
        }
      } catch (urlError) {
        // Not a valid URL, continue to other formats
      }
    }

    // Format 4: Check if it's EVA-ALERT:{userId} text format (clipboard)
    if (cleanUrl.startsWith('EVA-ALERT:')) {
      const userId = cleanUrl.replace('EVA-ALERT:', '').trim();
      if (userId) {
        console.log('[DeepLink] Matched EVA-ALERT: format, userId:', userId);
        return {
          type: 'invite',
          userId: userId,
        };
      }
    }

    // Format 5: Check if it's eva-alert: (without //) - some scanners might strip the //
    if (cleanUrl.startsWith('eva-alert:')) {
      const urlWithoutScheme = cleanUrl.replace('eva-alert:', '');
      const parts = urlWithoutScheme.split('/').filter(Boolean);

      if (parts.length > 0) {
        const [type, ...rest] = parts;
        if (type === 'invite' && rest.length > 0) {
          console.log('[DeepLink] Matched eva-alert: (no //) format, userId:', rest[0]);
          return {
            type: 'invite',
            userId: rest[0],
            path: rest.join('/'),
          };
        }
      }
    }

    return { type: 'unknown' };
  } catch (error) {
    console.error('[DeepLink] Error parsing deep link:', error);
    return { type: 'unknown' };
  }
};

/**
 * Handle friend invite deep link
 * Automatically sends friend request when invite link is clicked
 */
export const handleFriendInvite = async (
  userId: string,
  tokenFromContext?: string | null
): Promise<boolean> => {
  try {
    console.log('[DeepLink] ========== HANDLING FRIEND INVITE ==========');
    console.log('[DeepLink] Target userId:', userId);
    console.log('[DeepLink] Has token:', !!tokenFromContext);
    
    if (!userId || userId.trim() === '') {
      console.log('[DeepLink] Invalid userId, showing error');
      Alert.alert('Error', 'Invalid friend invitation link');
      return false;
    }

    // Fetch target user details
    console.log('[DeepLink] Fetching target user details...');
    let targetUserName = 'Unknown User';
    
    try {
      const API_BASE_URL = getApiBaseUrl();
      console.log('[DeepLink] Attempting to fetch from:', `${API_BASE_URL}/api/profile/public/${userId}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increase to 10 seconds timeout for slow networks
      
      const response = await fetch(`${API_BASE_URL}/api/profile/public/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('[DeepLink] Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[DeepLink] User data received:', data);
        targetUserName = data.name || 'Unknown User';
        console.log('[DeepLink] Target user found:', targetUserName);
      } else {
        console.log('[DeepLink] Failed to fetch user details, status:', response.status, response.statusText);
      }
    } catch (fetchError: any) {
      console.log('[DeepLink] Error fetching user details:', fetchError.message || fetchError);
      
      // Provide more specific error handling
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
        console.log('[DeepLink] Request timed out - network may be slow');
      } else if (fetchError.message?.includes('Network request failed') || fetchError.message?.includes('Failed to fetch')) {
        console.log('[DeepLink] Network connectivity issue - possibly slow connection or offline');
      }
      
      // This is expected if the user is not yet logged in, network is slow, or offline
      // The modal will just show with default name
    }

    // Confirm before performing an action triggered by a link/QR/clipboard.
    // This prevents accidental friend requests when a user taps a link unintentionally.
    console.log('[DeepLink] Showing confirmation dialog with user details');
    const shouldSend = await new Promise<boolean>((resolve) => {
      const confirmMessage = targetUserName;
      
      Alert.alert(
        'Add Friend',
        `Send a friend request to:\n\n${confirmMessage}?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send', style: 'default', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    if (!shouldSend) {
      console.log('[DeepLink] User cancelled invite handling');
      return false;
    }

    console.log('[DeepLink] User confirmed, sending friend request...');
    // Send friend request (token may be provided by caller to avoid AsyncStorage timing issues)
    await sendFriendRequest(userId, tokenFromContext);
    
    console.log('[DeepLink] ✓ Friend request sent successfully');
    Alert.alert(
      'Friend Request Sent',
      `Your friend request to ${targetUserName} has been sent successfully!`,
      [{ text: 'OK' }]
    );
    
    console.log('[DeepLink] ==============================================');
    return true;
  } catch (error: any) {
    console.error('[DeepLink] ========== ERROR HANDLING FRIEND INVITE ==========');
    console.error('[DeepLink] Error:', error);
    console.error('[DeepLink] Error message:', error?.message);
    
    const errorMessage = error?.message || 'Failed to send friend request';
    console.log('[DeepLink] Processing error message:', errorMessage);
    
    // Check for more specific error messages first
    if (errorMessage.includes('pending friend request to you')) {
      // User B tries to send request to User A, but User A already sent one to User B
      console.log('[DeepLink] Error type: Pending request from other user');
      Alert.alert('Pending Request', 'This user has already sent you a friend request. Check your pending requests!');
    } else if (errorMessage.includes('pending friend request to this user')) {
      // User already has an outgoing pending request
      console.log('[DeepLink] Error type: Already sent request');
      Alert.alert('Request Pending', 'You already have a pending friend request to this user');
    } else if (errorMessage.includes('pending')) {
      // Generic pending message
      console.log('[DeepLink] Error type: Generic pending');
      Alert.alert('Request Pending', errorMessage);
    } else if (errorMessage.includes('already friends')) {
      console.log('[DeepLink] Error type: Already friends');
      Alert.alert('Already Friends', 'You are already friends with this user');
    } else if (errorMessage.includes('yourself')) {
      console.log('[DeepLink] Error type: Cannot send to self');
      Alert.alert('Invalid Action', 'Cannot send friend request to yourself');
    } else {
      console.log('[DeepLink] Error type: Unknown');
      Alert.alert('Error', errorMessage);
    }
    
    console.error('[DeepLink] ==============================================');
    return false;
  }
};

/**
 * Initialize deep link listener
 * Returns cleanup function
 */
export const initializeDeepLinkListener = (
  onInvite: (userId: string) => Promise<void>
): (() => void) => {
  // Handle deep link when app is already open
  const handleUrl = async (event: { url: string }) => {
    console.log('[DeepLink] Received URL:', event.url);
    
    // Skip normal Expo start URLs (they don't contain invite paths)
    // These are like: exp://192.168.1.1:8081 or exp://10.10.83.174:8081
    if (event.url.match(/^exp[s]?:\/\/[\d.]+:\d+\/?$/)) {
      console.log('[DeepLink] Normal Expo start URL, skipping...');
      return;
    }
    
    const linkData = parseDeepLink(event.url);
    
    if (linkData.type === 'invite' && linkData.userId) {
      console.log('[DeepLink] Processing invite for userId:', linkData.userId);
      await onInvite(linkData.userId);
    } else if (linkData.type === 'user' && linkData.userId) {
      // For user profile links, we can navigate to profile or send request
      // For now, treat it as an invite
      await onInvite(linkData.userId);
    } else if (linkData.type === 'unknown') {
      // Only warn if it looks like it should be an invite link
      if (event.url.includes('invite') || event.url.includes('EVA-ALERT')) {
        console.warn('[DeepLink] Could not parse invite link:', event.url);
      }
      // Otherwise silently ignore (normal app startup URLs)
    }
  };

  // Listen for deep links
  const subscription = Linking.addEventListener('url', handleUrl);

  // Check if app was opened via deep link (when app was closed)
  Linking.getInitialURL().then((url) => {
    if (url) {
      console.log('[DeepLink] App opened with URL:', url);
      handleUrl({ url });
    }
  }).catch((error) => {
    console.error('[DeepLink] Error getting initial URL:', error);
  });

  // Return cleanup function
  return () => {
    subscription.remove();
  };
};


