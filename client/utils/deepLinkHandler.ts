import { Linking } from 'react-native';
import { Alert } from 'react-native';
import { sendFriendRequest } from '../services/friendService';

/**
 * Deep Link Handler
 * Handles eva-alert:// URLs for friend invitations
 */

export interface DeepLinkData {
  type: 'invite' | 'user' | 'unknown';
  userId?: string;
  path?: string;
}

/**
 * Parse deep link URL and extract data
 * Supports multiple formats:
 * 1. eva-alert://invite/{userId} (custom URL scheme)
 * 2. https://{domain}/invite/{userId} (HTTPS URL for QR codes)
 * 3. EVA-ALERT:{userId} (legacy text format)
 */
export const parseDeepLink = (url: string): DeepLinkData => {
  try {
    // Remove any whitespace
    const cleanUrl = url.trim();

    // Format 1: Check if it's an eva-alert:// URL
    if (cleanUrl.startsWith('eva-alert://')) {
      const urlWithoutScheme = cleanUrl.replace('eva-alert://', '');
      const parts = urlWithoutScheme.split('/').filter(Boolean);

      if (parts.length === 0) {
        return { type: 'unknown' };
      }

      const [type, ...rest] = parts;

      if (type === 'invite' && rest.length > 0) {
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

    // Format 2: Check if it's an HTTPS URL with /invite/ path
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanUrl);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        
        if (pathParts.length >= 2 && pathParts[0] === 'invite') {
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

    // Format 3: Check if it's EVA-ALERT:{userId} text format (legacy)
    if (cleanUrl.startsWith('EVA-ALERT:')) {
      const userId = cleanUrl.replace('EVA-ALERT:', '').trim();
      if (userId) {
        return {
          type: 'invite',
          userId: userId,
        };
      }
    }

    // Format 4: Check if it's eva-alert: (without //) - some scanners might strip the //
    if (cleanUrl.startsWith('eva-alert:')) {
      const urlWithoutScheme = cleanUrl.replace('eva-alert:', '');
      const parts = urlWithoutScheme.split('/').filter(Boolean);

      if (parts.length > 0) {
        const [type, ...rest] = parts;
        if (type === 'invite' && rest.length > 0) {
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
    console.log('[DeepLink] Handling friend invite for userId:', userId);
    
    if (!userId || userId.trim() === '') {
      Alert.alert('Error', 'Invalid friend invitation link');
      return false;
    }

    // Confirm before performing an action triggered by a link/QR/clipboard.
    // This prevents accidental friend requests when a user taps a link unintentionally.
    const shouldSend = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Add Friend',
        'Send a friend request from this invitation?',
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

    // Send friend request (token may be provided by caller to avoid AsyncStorage timing issues)
    await sendFriendRequest(userId, tokenFromContext);
    
    Alert.alert(
      'Friend Request Sent',
      'Your friend request has been sent successfully!',
      [{ text: 'OK' }]
    );
    
    return true;
  } catch (error: any) {
    console.error('[DeepLink] Error handling friend invite:', error);
    
    const errorMessage = error?.message || 'Failed to send friend request';
    
    if (errorMessage.includes('already')) {
      Alert.alert('Already Friends', 'You are already friends with this user');
    } else if (errorMessage.includes('yourself')) {
      Alert.alert('Invalid Action', 'Cannot send friend request to yourself');
    } else if (errorMessage.includes('pending')) {
      Alert.alert('Request Pending', 'You already have a pending friend request with this user');
    } else {
      Alert.alert('Error', errorMessage);
    }
    
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
    
    const linkData = parseDeepLink(event.url);
    
    if (linkData.type === 'invite' && linkData.userId) {
      await onInvite(linkData.userId);
    } else if (linkData.type === 'user' && linkData.userId) {
      // For user profile links, we can navigate to profile or send request
      // For now, treat it as an invite
      await onInvite(linkData.userId);
    } else {
      console.warn('[DeepLink] Unknown deep link type:', linkData);
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


