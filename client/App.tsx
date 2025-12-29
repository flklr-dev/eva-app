import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './navigation/AppNavigator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeDeepLinkListener, parseDeepLink, handleFriendInvite } from './utils/deepLinkHandler';
import { GlobalNotificationProvider } from './context/GlobalNotificationContext';
import { GlobalFriendRequestNotification } from './components/GlobalFriendRequestNotification';
import { SafeHomeNotificationProvider } from './context/SafeHomeNotificationContext';
import { SafeHomeNotification } from './components/SafeHomeNotification';
import { QuickActionNotificationProvider } from './context/QuickActionNotificationContext';
import { QuickActionNotification } from './components/QuickActionNotification';

/**
 * Deep Link Handler Component
 * Handles deep links when user is authenticated
 * Also monitors clipboard for EVA-ALERT codes (for iPhone camera QR scanning)
 * 
 * Supports:
 * - eva-alert://invite/{userId} (standalone builds)
 * - exp://IP:PORT/--/invite/{userId} (Expo Go development)
 * - EVA-ALERT:{userId} (clipboard from web invite page)
 */
const DeepLinkHandler: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const cleanupRef = useRef<(() => void) | null>(null);
  const lastClipboardCheck = useRef<string>('');
  const clipboardCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const PENDING_INVITE_KEY = 'pendingFriendInviteUserId';
  const isProcessingInvite = useRef<boolean>(false);

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
    // Prevent duplicate processing
    if (isProcessingInvite.current) {
      console.log('[App] Already processing an invite, skipping...');
      return;
    }
    
    isProcessingInvite.current = true;
    console.log('[App] ========== PROCESSING INVITE ==========');
    console.log('[App] userId:', userId);
    console.log('[App] isAuthenticated:', isAuthenticated);
    console.log('[App] hasToken:', !!token);
    
    try {
      if (!isAuthenticated || !token) {
        await storePendingInvite(userId);
        Alert.alert(
          'Login required',
          'Please log in to accept this friend invitation. We\'ll complete it after you sign in.'
        );
        return;
      }

      await handleFriendInvite(userId, token);
    } finally {
      // Reset after a short delay to prevent rapid re-processing
      setTimeout(() => {
        isProcessingInvite.current = false;
      }, 2000);
    }
    
    console.log('[App] ========================================');
  };

  // Check clipboard for EVA-ALERT codes
  const checkClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      
      // Only process if clipboard changed and contains content
      if (clipboardText && clipboardText !== lastClipboardCheck.current && clipboardText.length > 0) {
        lastClipboardCheck.current = clipboardText;
        
        // Only log if it might be an EVA-ALERT code
        if (clipboardText.includes('EVA-ALERT') || clipboardText.includes('eva-alert')) {
          console.log('[App] Clipboard contains potential invite code, parsing...');
        }
        
        const linkData = parseDeepLink(clipboardText);
        if (linkData.type === 'invite' && linkData.userId) {
          console.log('[App] ✅ Found EVA-ALERT code in clipboard:', linkData.userId);
          await handleInviteUserId(linkData.userId);
          // Clear clipboard after processing to prevent re-processing
          await Clipboard.setStringAsync('');
          lastClipboardCheck.current = '';
          console.log('[App] ✅ Cleared clipboard after processing invite');
        }
      }
    } catch (error) {
      // Silently fail - clipboard access might not be available
      // This is expected on some platforms/situations
    }
  };

  useEffect(() => {
    console.log('[App] ========== INITIALIZING DEEP LINK HANDLER ==========');
    console.log('[App] Platform:', Platform.OS);
    console.log('[App] isAuthenticated:', isAuthenticated);
    
    // Initialize deep link listener
    const cleanup = initializeDeepLinkListener(async (userId: string) => {
      try {
        console.log('[App] Deep link callback received userId:', userId);
        await handleInviteUserId(userId);
      } catch (error) {
        // Error is already handled in handleFriendInvite
        console.error('[App] Error sending friend request from deep link:', error);
      }
    });

    cleanupRef.current = cleanup;

    // Monitor clipboard when app comes to foreground (for web invite page codes)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[App] App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('[App] App became active, checking clipboard for EVA-ALERT codes');
        // Check clipboard when app becomes active
        checkClipboard();
        
        // Start periodic clipboard checking
        if (clipboardCheckInterval.current) {
          clearInterval(clipboardCheckInterval.current);
        }
        clipboardCheckInterval.current = setInterval(() => {
          checkClipboard();
        }, 3000); // Check every 3 seconds when active
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Clear interval when app goes to background
        if (clipboardCheckInterval.current) {
          clearInterval(clipboardCheckInterval.current);
          clipboardCheckInterval.current = null;
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial clipboard check
    checkClipboard();
    clipboardCheckInterval.current = setInterval(checkClipboard, 3000);
    
    console.log('[App] ========== DEEP LINK HANDLER INITIALIZED ==========');

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
        <QuickActionNotificationProvider>
          <SafeHomeNotificationProvider>
            <GlobalNotificationProvider>
              <DeepLinkHandler />
              <StatusBar style="dark" />
              <GlobalFriendRequestNotification />
              <SafeHomeNotification />
              <QuickActionNotification />
              <AppNavigator />
            </GlobalNotificationProvider>
          </SafeHomeNotificationProvider>
        </QuickActionNotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}