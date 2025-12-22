import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeDeepLinkListener, parseDeepLink, handleFriendInvite } from './utils/deepLinkHandler';
import { GlobalNotificationProvider } from './context/GlobalNotificationContext';
import { GlobalFriendRequestNotification } from './components/GlobalFriendRequestNotification';

/**
 * Deep Link Handler Component
 * Handles deep links when user is authenticated
 * Also monitors clipboard for EVA-ALERT codes (for iPhone camera QR scanning)
 */
const DeepLinkHandler: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastClipboardCheck = useRef<string>('');
  const clipboardCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const PENDING_INVITE_KEY = 'pendingFriendInviteUserId';

  const storePendingInvite = async (userId: string) => {
    try {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, userId);
      console.log('[App] Stored pending invite userId:', userId);
    } catch (e) {
      console.warn('[App] Failed to store pending invite:', e);
    }
  };

  const consumePendingInvite = async (): Promise<string | null> => {
    try {
      const userId = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (!userId) return null;
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      return userId;
    } catch (e) {
      console.warn('[App] Failed to consume pending invite:', e);
      return null;
    }
  };

  const handleInviteUserId = async (userId: string) => {
    if (!isAuthenticated || !token) {
      await storePendingInvite(userId);
      Alert.alert(
        'Login required',
        'Please log in to accept this friend invitation. We’ll complete it after you sign in.'
      );
      return;
    }

    await handleFriendInvite(userId, token);
  };

  // Check clipboard for EVA-ALERT codes
  const checkClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      
      // Only process if clipboard changed and contains EVA-ALERT format
      if (clipboardText && clipboardText !== lastClipboardCheck.current) {
        lastClipboardCheck.current = clipboardText;
        console.log('[App] Clipboard changed, checking for EVA-ALERT codes:', clipboardText.substring(0, 50) + '...');
        
        const linkData = parseDeepLink(clipboardText);
        if (linkData.type === 'invite' && linkData.userId) {
          console.log('[App] ✅ Found EVA-ALERT code in clipboard:', linkData.userId);
          await handleInviteUserId(linkData.userId);
          // Clear clipboard after processing to prevent re-processing
          await Clipboard.setStringAsync('');
          lastClipboardCheck.current = '';
          console.log('[App] ✅ Cleared clipboard after processing invite');
        } else {
          console.log('[App] Clipboard does not contain EVA-ALERT code');
        }
      }
    } catch (error) {
      // Silently fail - clipboard access might not be available
      console.log('[App] Clipboard check error (non-critical):', error);
    }
  };

  useEffect(() => {
    // Initialize deep link listener
    const cleanup = initializeDeepLinkListener(async (userId: string) => {
      try {
        await handleInviteUserId(userId);
      } catch (error) {
        // Error is already handled in handleFriendInvite
        console.error('[App] Error sending friend request from deep link:', error);
      }
    });

    cleanupRef.current = cleanup;

    // Monitor clipboard when app comes to foreground (for iPhone camera QR codes)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[App] App became active, checking clipboard for EVA-ALERT codes');
        // Check clipboard when app becomes active
        checkClipboard();
        
        // Start periodic clipboard checking for development
        if (clipboardCheckInterval.current) {
          clearInterval(clipboardCheckInterval.current);
        }
        clipboardCheckInterval.current = setInterval(() => {
          checkClipboard();
        }, 2000); // Check every 2 seconds when active
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Clear interval when app goes to background
        console.log('[App] App went to background, stopping clipboard monitoring');
        if (clipboardCheckInterval.current) {
          clearInterval(clipboardCheckInterval.current);
          clipboardCheckInterval.current = null;
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial clipboard check
    checkClipboard();
    clipboardCheckInterval.current = setInterval(checkClipboard, 2000);

    // Cleanup on unmount or when auth state changes
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      appStateSubscription.remove();
      if (clipboardCheckInterval.current) {
        clearInterval(clipboardCheckInterval.current);
        clipboardCheckInterval.current = null;
      }
    };
  }, [isAuthenticated, token]);

  // If user logs in after opening an invite link, complete it.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    consumePendingInvite().then((pendingUserId) => {
      if (pendingUserId) {
        console.log('[App] Consumed pending invite userId:', pendingUserId);
        handleFriendInvite(pendingUserId, token).catch((e) => {
          console.error('[App] Error handling pending invite:', e);
        });
      }
    });
  }, [isAuthenticated, token]);

  return null;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GlobalNotificationProvider>
          <DeepLinkHandler />
          <StatusBar style="dark" />
          <GlobalFriendRequestNotification />
          <AppNavigator />
        </GlobalNotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}