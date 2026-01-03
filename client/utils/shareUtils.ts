import { Platform, Alert, Share, Linking } from 'react-native';
import { getCleanedApiBaseUrl } from './apiConfig';

/**
 * Generate friend invite link with user ID
 * Returns both deep link and web URL for maximum compatibility
 */
export const generateFriendInviteLink = (userId: string): string => {
  // Format: eva-alert://invite/{userId}
  // This deep link can be opened by the app to automatically send a friend request
  return `eva-alert://invite/${userId}`;
};

/**
 * Generate web URL for friend invite (for sharing compatibility)
 * This can be a redirect URL that opens the deep link
 */
export const generateFriendInviteWebUrl = (userId: string): string => {
  // Use the server invite page so recipients get a clickable http(s) link
  // that can redirect to the deep link (eva-alert://invite/{userId}).
  return `${getCleanedApiBaseUrl()}/invite/${userId}`;
};

/**
 * Generate friend invite message with link
 */
export const generateFriendInviteMessage = (userName: string, userId: string): string => {
  const inviteUrl = generateFriendInviteWebUrl(userId);
  const inviteCode = `EVA-ALERT:${userId}`;
  return `Join me on EVA Alert!\n\nTap to add me as a friend:\n${inviteUrl}\n\nIf the link doesn't open, copy this code and open EVA Alert:\n${inviteCode}`;
};

/**
 * Share friend invite link
 * Opens native OS share sheet (iOS/Android) with user's invite link
 * Users can share through any app (Messages, WhatsApp, Email, etc.)
 * 
 * iOS Share API behavior:
 * - Custom deep link schemes (eva-alert://) may not work well with the `url` parameter
 * - Using `message` only is more reliable on iOS for custom schemes
 * - The message will include the full link text that recipients can copy/use
 */
export const shareFriendInvite = async (userId: string, userName: string): Promise<void> => {
  try {
    const inviteUrl = generateFriendInviteWebUrl(userId);
    const inviteCode = `EVA-ALERT:${userId}`;
    // Create a shareable message with an http(s) link (best compatibility)
    const inviteMessage = `Join me on EVA Alert!\n\nTap to add me as a friend:\n${inviteUrl}\n\nIf the link doesn't open, copy this code and open EVA Alert:\n${inviteCode}`;

    console.log('[Share] Preparing to share:', { userId, userName, inviteUrl });

    // Use native Share API - opens OS share sheet
    // On iOS: Use message only for better compatibility with custom deep links
    const shareOptions = Platform.select({
      ios: {
        message: inviteMessage, // iOS: message-only is most reliable
      },
      android: {
        message: inviteMessage,
        title: 'Invite to EVA Alert',
      },
      default: {
        message: inviteMessage,
      },
    });

    console.log('[Share] Calling Share.share() with options:', JSON.stringify(shareOptions, null, 2));

    // Check if Share is available
    if (!Share || typeof Share.share !== 'function') {
      throw new Error('Share API is not available');
    }

    console.log('[Share] Calling Share.share() now...');
    
    // iOS specific: Ensure we're not blocked by any modal or animation
    if (Platform.OS === 'ios') {
      console.log('[Share] iOS: Adding delay for modal dismissal...');
      // Longer delay for iOS to ensure modal is fully dismissed
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[Share] iOS: Delay completed, calling Share.share()...');
    }

    try {
    // Call Share.share() - on iOS this should show the native share sheet
    // Note: On iOS, this must be called from a user interaction handler
    // The promise will resolve when user selects an option or dismisses
      console.log('[Share] Executing Share.share() call...');
    const result = await Share.share(shareOptions);
    
      console.log('[Share] Share.share() returned successfully:', result);
    console.log('[Share] Share result received:', result);
    } catch (shareError: any) {
      console.error('[Share] Share.share() threw error:', shareError);
      console.error('[Share] Error details:', {
        message: shareError?.message,
        name: shareError?.name,
        stack: shareError?.stack,
      });

      // Fallback for iOS: Show alert with share content
      if (Platform.OS === 'ios') {
        console.log('[Share] iOS fallback: Showing alert with share content');
        Alert.alert(
          'Share EVA Alert Invite',
          `Copy this link to share:\n\n${inviteMessage}`,
          [
            { text: 'Copy to Clipboard', onPress: () => {
              // Note: Clipboard is not imported, but this is just for fallback
              console.log('[Share] User chose to copy manually');
            }},
            { text: 'OK', style: 'cancel' }
          ]
        );
        return; // Return void, don't throw error for iOS fallback
      }

      throw shareError;
    }
  } catch (error: any) {
    console.error('[Share] Error sharing friend invite:', error);
    console.error('[Share] Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Don't show alert if user cancelled, dismissed, or if it's a timeout (which might be normal)
    const errorMessage = error?.message || '';
    const isUserCancellation = 
      errorMessage.includes('cancelled') ||
      errorMessage.includes('dismissed') ||
      errorMessage.includes('User did not share') ||
      errorMessage === 'User cancelled' ||
      errorMessage.includes('timeout');
    
    if (!isUserCancellation) {
      Alert.alert('Error', 'Failed to share. Please try again.');
    } else if (errorMessage.includes('timeout')) {
      console.warn('[Share] Share sheet may have appeared but promise did not resolve');
    }
  }
};

/**
 * Share app invite link (generic, without user ID)
 * Uses native share sheet on both iOS and Android
 */
export const shareAppInvite = async (): Promise<void> => {
  try {
    const inviteMessage = 'Join me on EVA Alert - a safety and location sharing app!';
    const inviteUrl = 'https://eva-alert.app/invite'; // Replace with actual invite URL

    const shareOptions = Platform.select({
      ios: {
        message: `${inviteMessage}\n${inviteUrl}`,
        url: inviteUrl,
      },
      android: {
        message: `${inviteMessage}\n${inviteUrl}`,
        title: 'Share EVA Alert',
      },
      default: {
        message: `${inviteMessage}\n${inviteUrl}`,
      },
    });

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      console.log('Content shared successfully');
    } else if (result.action === Share.dismissedAction) {
      console.log('Share dismissed');
    }
  } catch (error: any) {
    console.error('Error sharing app invite:', error);
    if (error.message !== 'User did not share') {
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
  }
};

/**
 * Send SMS with friend invite message
 * Opens native SMS app with pre-filled invite message
 */
export const sendSMSInvite = async (userId: string, userName: string): Promise<void> => {
  try {
    const inviteUrl = generateFriendInviteWebUrl(userId);
    const inviteCode = `EVA-ALERT:${userId}`;

    // Create SMS-compatible message (shorter for SMS)
    const smsMessage = `Join me on EVA Alert! ${inviteUrl} Code: ${inviteCode}`;

    console.log('[SMS] Preparing SMS invite:', { userId, userName, inviteUrl });

    // URL encode the message for SMS URL scheme
    const encodedMessage = encodeURIComponent(smsMessage);

    // Create SMS URL
    const smsUrl = `sms:?body=${encodedMessage}`;

    console.log('[SMS] Opening SMS app with URL:', smsUrl);

    // Check if SMS is supported
    const canOpenSMS = await Linking.canOpenURL(smsUrl);
    if (!canOpenSMS) {
      console.warn('[SMS] SMS not supported on this device');
      Alert.alert(
        'SMS Not Available',
        'SMS messaging is not available on this device. You can copy the invite link instead.',
        [
          { text: 'Copy Link', onPress: () => {
            // For now, just show the message that would be copied
            Alert.alert('Copy this message:', smsMessage);
          }},
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Open SMS app
    await Linking.openURL(smsUrl);
    console.log('[SMS] SMS app opened successfully');

  } catch (error: any) {
    console.error('[SMS] Error sending SMS invite:', error);
    console.error('[SMS] Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    // Fallback: Show alert with message to copy
    const inviteUrl = generateFriendInviteWebUrl(userId);
    const inviteCode = `EVA-ALERT:${userId}`;
    const smsMessage = `Join me on EVA Alert! ${inviteUrl} Code: ${inviteCode}`;

    Alert.alert(
      'SMS Error',
      'Could not open SMS app. Copy this message to send manually:',
      [
        { text: 'Copy Message', onPress: () => {
          Alert.alert('Copy this:', smsMessage);
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }
};

/**
 * Share user's profile/invite link
 */
export const shareProfileLink = async (userId: string): Promise<void> => {
  try {
    const profileLink = `eva-alert://user/${userId}`; // Deep link format
    const shareMessage = `Connect with me on EVA Alert! ${profileLink}`;

    const shareOptions = Platform.select({
      ios: {
        message: shareMessage,
      },
      android: {
        message: shareMessage,
        title: 'Share Profile',
      },
      default: {
        message: shareMessage,
      },
    });

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      console.log('Profile shared successfully');
    }
  } catch (error: any) {
    console.error('Error sharing profile:', error);
    Alert.alert('Error', 'Failed to share. Please try again.');
  }
};

