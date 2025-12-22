import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Platform, DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFriendRequests } from '../services/friendService';

// Global reference to notification functions for non-component usage
let globalNotificationFunctions: {
  showFriendRequestNotification: (notification: FriendRequestNotification) => void;
  dismissFriendRequestNotification: (id: string) => void;
} | null = null;

// Ensure DeviceEventEmitter is available
if (typeof DeviceEventEmitter === 'undefined') {
  console.warn('[GlobalNotification] DeviceEventEmitter is not available');
}

interface FriendRequestNotification {
  id: string;
  senderName: string;
  senderId: string;
  requestId: string;
  timestamp: Date;
}

interface GlobalNotificationContextType {
  friendRequests: FriendRequestNotification[];
  showFriendRequestNotification: (notification: FriendRequestNotification) => void;
  dismissFriendRequestNotification: (id: string) => void;
  clearAllFriendRequestNotifications: () => void;
  activeNotification: FriendRequestNotification | null;
  notificationAnimValue: Animated.Value;
  showNotification: () => void;
  dismissNotification: () => void;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | undefined>(undefined);

export const useGlobalNotifications = () => {
  const context = useContext(GlobalNotificationContext);
  if (!context) {
    throw new Error('useGlobalNotifications must be used within a GlobalNotificationProvider');
  }
  return context;
};

// Global functions for non-component usage
export const showGlobalFriendRequestNotification = (notification: FriendRequestNotification) => {
  console.log('[GlobalNotification] ========== SHOW NOTIFICATION ==========');
  console.log('[GlobalNotification] Function called with:', notification);
  console.log('[GlobalNotification] globalNotificationFunctions exists:', !!globalNotificationFunctions);
  
  if (globalNotificationFunctions) {
    console.log('[GlobalNotification] Calling showFriendRequestNotification');
    try {
      globalNotificationFunctions.showFriendRequestNotification(notification);
      console.log('[GlobalNotification] ✓ Notification function called successfully');
    } catch (error) {
      console.error('[GlobalNotification] ✗ Error calling notification function:', error);
    }
  } else {
    console.warn('[GlobalNotification] ✗ Global notification functions not initialized!');
    console.warn('[GlobalNotification] This means GlobalNotificationProvider may not be mounted');
  }
  console.log('[GlobalNotification] ==========================================');
};

export const dismissGlobalFriendRequestNotification = (id: string) => {
  if (globalNotificationFunctions) {
    globalNotificationFunctions.dismissFriendRequestNotification(id);
  } else {
    console.warn('[GlobalNotification] Global notification functions not initialized');
  }
};

interface GlobalNotificationProviderProps {
  children: React.ReactNode;
}

export const GlobalNotificationProvider: React.FC<GlobalNotificationProviderProps> = ({ children }) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequestNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<FriendRequestNotification | null>(null);
  const notificationAnimValue = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track seen request IDs to detect new ones
  const seenRequestIdsRef = useRef<Set<string>>(new Set());
  const isFirstPollRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for new friend requests
  const pollForNewFriendRequests = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log('[GlobalNotification] No auth token, skipping poll');
        return;
      }

      console.log('[GlobalNotification] Polling for new friend requests...');
      const data = await getFriendRequests(token);
      const receivedPending = data.received.filter(r => r.status === 'pending');
      
      console.log('[GlobalNotification] Found', receivedPending.length, 'pending requests');
      
      // On first poll, just record all existing IDs without showing notifications
      if (isFirstPollRef.current) {
        console.log('[GlobalNotification] First poll - recording existing request IDs');
        receivedPending.forEach(req => {
          if (req.requestId) {
            seenRequestIdsRef.current.add(req.requestId);
          }
        });
        isFirstPollRef.current = false;
        console.log('[GlobalNotification] Recorded', seenRequestIdsRef.current.size, 'existing requests');
        return;
      }

      // Check for new requests (requests we haven't seen before)
      for (const request of receivedPending) {
        const requestId = request.requestId;
        if (requestId && !seenRequestIdsRef.current.has(requestId)) {
          console.log('[GlobalNotification] ========== NEW FRIEND REQUEST DETECTED ==========');
          console.log('[GlobalNotification] Request ID:', requestId);
          console.log('[GlobalNotification] From:', request.name);
          
          // Mark as seen
          seenRequestIdsRef.current.add(requestId);
          
          // Show in-app notification
          showFriendRequestNotification({
            id: requestId,
            senderName: request.name,
            senderId: request.id,
            requestId: requestId,
            timestamp: new Date(request.createdAt),
          });
          
          console.log('[GlobalNotification] ===========================================');
          
          // Only show one notification at a time
          break;
        }
      }
    } catch (error) {
      console.error('[GlobalNotification] Error polling for friend requests:', error);
    }
  };

  // Start polling when component mounts
  useEffect(() => {
    console.log('[GlobalNotification] Starting friend request polling (every 60 seconds)');
    
    // Initial poll after a longer delay to let app fully initialize
    const initialTimeout = setTimeout(() => {
      pollForNewFriendRequests();
    }, 5000); // Increased to 5 seconds to avoid interfering with map initialization
    
    // Then poll every 60 seconds (reduced frequency to minimize background interference)
    pollingIntervalRef.current = setInterval(() => {
      pollForNewFriendRequests();
    }, 60000); // 60 seconds instead of 30 seconds

    return () => {
      clearTimeout(initialTimeout);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Setup notification handlers
  useEffect(() => {
    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[GlobalNotification] Foreground notification received:', notification);
      const data = notification.request.content.data;
      
      // Handle friend request notifications
      if (data.eventType === 'friend_request_received') {
        showFriendRequestNotification({
          id: data.requestId as string,
          senderName: '', // Will be populated when user taps notification
          senderId: data.senderId as string,
          requestId: data.requestId as string,
          timestamp: new Date(),
        });
      }
    });

    // Handle notification response (tap)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[GlobalNotification] Notification response received:', response);
      const data = response.notification.request.content.data;
      
      // Handle friend request notifications
      if (data.eventType === 'friend_request_received') {
        // Show the notification in the UI
        showFriendRequestNotification({
          id: data.requestId as string,
          senderName: response.notification.request.content.title?.replace('New Friend Request', '').trim() || 'Someone',
          senderId: data.senderId as string,
          requestId: data.requestId as string,
          timestamp: new Date(response.notification.date),
        });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showFriendRequestNotification = (notification: FriendRequestNotification) => {
    console.log('[GlobalNotification] ========== INTERNAL SHOW ==========');
    console.log('[GlobalNotification] Internal function called with:', notification);
    
    // Add to notification list
    setFriendRequests(prev => {
      console.log('[GlobalNotification] Current friend requests:', prev.length);
      const updated = [...prev, notification];
      console.log('[GlobalNotification] Updated friend requests:', updated.length);
      return updated;
    });
    
    // Set as active notification to display
    console.log('[GlobalNotification] Setting active notification:', notification);
    setActiveNotification(notification);
    console.log('[GlobalNotification] About to call showNotification animation');
    showNotification();
    console.log('[GlobalNotification] ======================================');
  };

  const dismissFriendRequestNotification = (id: string) => {
    console.log('[GlobalNotification] Dismissing friend request notification:', id);
    
    // Remove from notification list
    setFriendRequests(prev => prev.filter(n => n.id !== id));
    
    // If this was the active notification, clear it
    if (activeNotification?.id === id) {
      dismissNotification();
    }
  };

  const clearAllFriendRequestNotifications = () => {
    console.log('[GlobalNotification] Clearing all friend request notifications');
    setFriendRequests([]);
    setActiveNotification(null);
    dismissNotification();
  };

  const showNotification = () => {
    console.log('[GlobalNotification] ========== ANIMATION START ==========');
    console.log('[GlobalNotification] Starting notification animation');
    // Reset and animate in
    notificationAnimValue.setValue(0);
    console.log('[GlobalNotification] Animation value reset to 0');
    
    Animated.spring(notificationAnimValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(({ finished }) => {
      console.log('[GlobalNotification] Animation finished:', finished);
    });

    // Auto-dismiss after 5 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('[GlobalNotification] Auto-dismissing notification after 5 seconds');
      Animated.timing(notificationAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        console.log('[GlobalNotification] Auto-dismiss animation complete');
        setActiveNotification(null);
      });
    }, 5000);
    console.log('[GlobalNotification] =====================================');
  };

  const dismissNotification = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    Animated.timing(notificationAnimValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotification(null);
    });
  };

  const value = {
    friendRequests,
    showFriendRequestNotification,
    dismissFriendRequestNotification,
    clearAllFriendRequestNotifications,
    activeNotification,
    notificationAnimValue,
    showNotification,
    dismissNotification,
  };

  // Expose functions globally for non-component usage
  console.log('[GlobalNotification] ========== PROVIDER RENDER ==========');
  console.log('[GlobalNotification] Setting up global notification functions');
  globalNotificationFunctions = {
    showFriendRequestNotification,
    dismissFriendRequestNotification,
  };
  console.log('[GlobalNotification] Global functions initialized:', !!globalNotificationFunctions);
  console.log('[GlobalNotification] Active notification:', activeNotification);
  console.log('[GlobalNotification] Friend requests count:', friendRequests.length);
  console.log('[GlobalNotification] ====================================');

  return (
    <GlobalNotificationContext.Provider value={value}>
      {children}
    </GlobalNotificationContext.Provider>
  );
};