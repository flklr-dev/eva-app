import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global reference to notification functions for non-component usage
let globalSafeHomeNotificationFunctions: {
  showSafeHomeNotification: (notification: SafeHomeNotification) => void;
  dismissSafeHomeNotification: (id: string) => void;
} | null = null;

interface SafeHomeNotification {
  id: string;
  senderName: string;
  senderId: string;
  requestId: string;
  timestamp: Date;
  type?: 'safe_home';
}

interface SafeHomeNotificationContextType {
  safeHomeNotifications: SafeHomeNotification[];
  showSafeHomeNotification: (notification: SafeHomeNotification) => void;
  dismissSafeHomeNotification: (id: string) => void;
  clearAllSafeHomeNotifications: () => void;
  activeNotification: SafeHomeNotification | null;
  notificationAnimValue: Animated.Value;
  showNotification: () => void;
  dismissNotification: () => void;
}

const SafeHomeNotificationContext = createContext<SafeHomeNotificationContextType | undefined>(undefined);

export const useSafeHomeNotifications = () => {
  const context = useContext(SafeHomeNotificationContext);
  if (!context) {
    throw new Error('useSafeHomeNotifications must be used within a SafeHomeNotificationProvider');
  }
  return context;
};

// Global functions for non-component usage
export const showGlobalSafeHomeNotification = (notification: SafeHomeNotification) => {
  console.log('[SafeHomeNotification] ========== SHOW NOTIFICATION ==========');
  console.log('[SafeHomeNotification] Function called with:', notification);
  console.log('[SafeHomeNotification] globalSafeHomeNotificationFunctions exists:', !!globalSafeHomeNotificationFunctions);
  
  if (globalSafeHomeNotificationFunctions) {
    console.log('[SafeHomeNotification] Calling showSafeHomeNotification');
    try {
      globalSafeHomeNotificationFunctions.showSafeHomeNotification(notification);
      console.log('[SafeHomeNotification] ✓ Notification function called successfully');
    } catch (error) {
      console.error('[SafeHomeNotification] ✗ Error calling notification function:', error);
    }
  } else {
    console.warn('[SafeHomeNotification] ✗ Global notification functions not initialized!');
    console.warn('[SafeHomeNotification] This means SafeHomeNotificationProvider may not be mounted');
  }
  console.log('[SafeHomeNotification] ==========================================');
};

export const dismissGlobalSafeHomeNotification = (id: string) => {
  if (globalSafeHomeNotificationFunctions) {
    globalSafeHomeNotificationFunctions.dismissSafeHomeNotification(id);
  } else {
    console.warn('[SafeHomeNotification] Global notification functions not initialized');
  }
};

interface SafeHomeNotificationProviderProps {
  children: React.ReactNode;
}

export const SafeHomeNotificationProvider: React.FC<SafeHomeNotificationProviderProps> = ({ children }) => {
  const [safeHomeNotifications, setSafeHomeNotifications] = useState<SafeHomeNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<SafeHomeNotification | null>(null);
  const notificationAnimValue = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup notification handlers
  useEffect(() => {
    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[SafeHomeNotification] Foreground notification received:', notification);
      const data = notification.request.content.data;
      
      // Handle safe home notifications
      if (data.eventType === 'friend_safe_home') {
        showSafeHomeNotification({
          id: (data.userId as string) + '_safehome_' + Date.now(),
          senderName: (data.userName as string) || 'Someone',
          senderId: data.userId as string,
          requestId: (data.userId as string) + '_safehome',
          timestamp: new Date(),
          type: 'safe_home',
        });
      }
    });

    // Handle notification response (tap)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[SafeHomeNotification] Notification response received:', response);
      const data = response.notification.request.content.data;
      
      // Handle safe home notifications
      if (data.eventType === 'friend_safe_home') {
        showSafeHomeNotification({
          id: (data.userId as string) + '_safehome_' + Date.now(),
          senderName: (data.userName as string) || 'Someone',
          senderId: data.userId as string,
          requestId: (data.userId as string) + '_safehome',
          timestamp: new Date(response.notification.date),
          type: 'safe_home',
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

  const showSafeHomeNotification = (notification: SafeHomeNotification) => {
    console.log('[SafeHomeNotification] ========== INTERNAL SHOW ==========');
    console.log('[SafeHomeNotification] Internal function called with:', notification);
    
    // Add to notification list
    setSafeHomeNotifications(prev => {
      console.log('[SafeHomeNotification] Current safe home notifications:', prev.length);
      const updated = [...prev, notification];
      console.log('[SafeHomeNotification] Updated safe home notifications:', updated.length);
      return updated;
    });
    
    // Set as active notification to display
    console.log('[SafeHomeNotification] Setting active notification:', notification);
    setActiveNotification(notification);
    console.log('[SafeHomeNotification] About to call showNotification animation');
    showNotification();
    console.log('[SafeHomeNotification] ======================================');
  };

  const dismissSafeHomeNotification = (id: string) => {
    console.log('[SafeHomeNotification] Dismissing safe home notification:', id);
    
    // Remove from notification list
    setSafeHomeNotifications(prev => prev.filter(n => n.id !== id));
    
    // If this was the active notification, clear it
    if (activeNotification?.id === id) {
      dismissNotification();
    }
  };

  const clearAllSafeHomeNotifications = () => {
    console.log('[SafeHomeNotification] Clearing all safe home notifications');
    setSafeHomeNotifications([]);
    setActiveNotification(null);
    dismissNotification();
  };

  const showNotification = () => {
    console.log('[SafeHomeNotification] ========== ANIMATION START ==========');
    console.log('[SafeHomeNotification] Starting notification animation');
    // Reset and animate in
    notificationAnimValue.setValue(0);
    console.log('[SafeHomeNotification] Animation value reset to 0');
    
    Animated.spring(notificationAnimValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(({ finished }) => {
      console.log('[SafeHomeNotification] Animation finished:', finished);
    });

    // Auto-dismiss after 5 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('[SafeHomeNotification] Auto-dismissing notification after 5 seconds');
      Animated.timing(notificationAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        console.log('[SafeHomeNotification] Auto-dismiss animation complete');
        setActiveNotification(null);
      });
    }, 5000);
    console.log('[SafeHomeNotification] =====================================');
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
    safeHomeNotifications,
    showSafeHomeNotification,
    dismissSafeHomeNotification,
    clearAllSafeHomeNotifications,
    activeNotification,
    notificationAnimValue,
    showNotification,
    dismissNotification,
  };

  // Expose functions globally for non-component usage
  console.log('[SafeHomeNotification] ========== PROVIDER RENDER ==========');
  console.log('[SafeHomeNotification] Setting up global notification functions');
  globalSafeHomeNotificationFunctions = {
    showSafeHomeNotification,
    dismissSafeHomeNotification,
  };
  console.log('[SafeHomeNotification] Global functions initialized:', !!globalSafeHomeNotificationFunctions);
  console.log('[SafeHomeNotification] Active notification:', activeNotification);
  console.log('[SafeHomeNotification] Safe home notifications count:', safeHomeNotifications.length);
  console.log('[SafeHomeNotification] ====================================');

  return (
    <SafeHomeNotificationContext.Provider value={value}>
      {children}
    </SafeHomeNotificationContext.Provider>
  );
};