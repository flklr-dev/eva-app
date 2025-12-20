import { Alert } from 'react-native';
import { sendFriendRequest } from '../services/friendService';
import { parseDeepLink } from './deepLinkHandler';

/**
 * Note: Camera permissions are now handled by expo-camera's useCameraPermissions hook
 * This function is kept for backward compatibility but may not be needed
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  // This is now handled by the CameraView component's useCameraPermissions hook
  // Keeping this for any legacy code that might call it
  return true;
};

/**
 * Parse QR code data and handle friend invitation
 */
export const handleQRCodeScanned = async (data: string): Promise<boolean> => {
  try {
    // Expected QR code format: JSON with userId or invite link
    // Format 1: { "type": "friend_invite", "userId": "..." }
    // Format 2: eva-alert://invite/userId
    // Format 3: Direct userId string

    let userId: string | null = null;

    // Try parsing as JSON
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.type === 'friend_invite' && jsonData.userId) {
        userId = jsonData.userId;
      }
    } catch {
      // Not JSON: support full deep links and web invite URLs.
      const linkData = parseDeepLink(data);
      if ((linkData.type === 'invite' || linkData.type === 'user') && linkData.userId) {
        userId = linkData.userId;
      } else {
        // Fallback: accept a raw MongoDB ObjectId as a plain string
        const trimmed = data.trim();
        if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
          userId = trimmed;
        }
      }
    }

    if (!userId) {
      Alert.alert('Invalid QR Code', 'This QR code is not a valid EVA Alert invitation');
      return false;
    }

    const shouldSend = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Add Friend',
        'Send a friend request from this QR code?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send', style: 'default', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    if (!shouldSend) {
      return false;
    }

    // Send friend request
    await sendFriendRequest(userId);
    Alert.alert('Success', 'Friend request sent successfully!');
    return true;
  } catch (error: any) {
    console.error('Error handling QR code:', error);
    const errorMessage = error.message || 'Failed to process QR code';
    
    if (errorMessage.includes('already')) {
      Alert.alert('Already Friends', 'You are already friends with this user');
    } else if (errorMessage.includes('yourself')) {
      Alert.alert('Invalid Action', 'Cannot send friend request to yourself');
    } else {
      Alert.alert('Error', errorMessage);
    }
    return false;
  }
};

/**
 * Generate QR code data for user's profile/invite
 * Returns JSON format for better structure
 */
export const generateInviteQRData = (userId: string): string => {
  return JSON.stringify({
    type: 'friend_invite',
    userId: userId,
    timestamp: Date.now(),
  });
};

/**
 * Generate deep link format for friend invite
 */
export const generateInviteDeepLink = (userId: string): string => {
  return `eva-alert://invite/${userId}`;
};

/**
 * Generate simple userId string for QR code (most compatible)
 */
export const generateInviteQRSimple = (userId: string): string => {
  return userId;
};

