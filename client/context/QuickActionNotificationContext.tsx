import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global reference to notification functions for non-component usage
let globalQuickActionNotificationFunctions: {
  showQuickActionNotification: (notification: QuickActionNotification) => void;
  dismissQuickActionNotification: (id: string) => void;
} | null = null;

interface QuickActionNotification {
  id: string;
  message: string;
  type: string;
  timestamp: Date;
  eventType?: 'quick_action';
}

interface QuickActionNotificationContextType {
  quickActionNotifications: QuickActionNotification[];
  showQuickActionNotification: (notification: QuickActionNotification) => void;
  dismissQuickActionNotification: (id: string) => void;
  clearAllQuickActionNotifications: () => void;
  activeNotification: QuickActionNotification | null;
  notificationAnimValue: Animated.Value;
  showNotification: () => void;
  dismissNotification: () => void;
}

const QuickActionNotificationContext = createContext<QuickActionNotificationContextType | undefined>(undefined);

export const useQuickActionNotifications = () => {
  const context = useContext(QuickActionNotificationContext);
  if (!context) {
    throw new Error('useQuickActionNotifications must be used within a QuickActionNotificationProvider');
  }
  return context;
};

// Global functions for non-component usage
export const showGlobalQuickActionNotification = (notification: QuickActionNotification) => {
  console.log('[QuickActionNotification] ========== SHOW NOTIFICATION ==========');
  console.log('[QuickActionNotification] Function called with:', notification);
  console.log('[QuickActionNotification] globalQuickActionNotificationFunctions exists:', !!globalQuickActionNotificationFunctions);
  
  if (globalQuickActionNotificationFunctions) {
    console.log('[QuickActionNotification] Calling showQuickActionNotification');
    try {
      globalQuickActionNotificationFunctions.showQuickActionNotification(notification);
      console.log('[QuickActionNotification] ✓ Notification function called successfully');
    } catch (error) {
      console.error('[QuickActionNotification] ✗ Error calling notification function:', error);
    }
  } else {
    console.warn('[QuickActionNotification] ✗ Global notification functions not initialized!');
    console.warn('[QuickActionNotification] This means QuickActionNotificationProvider may not be mounted');
  }
  console.log('[QuickActionNotification] ==========================================');
};

export const dismissGlobalQuickActionNotification = (id: string) => {
  if (globalQuickActionNotificationFunctions) {
    globalQuickActionNotificationFunctions.dismissQuickActionNotification(id);
  } else {
    console.warn('[QuickActionNotification] Global notification functions not initialized');
  }
};

interface QuickActionNotificationProviderProps {
  children: React.ReactNode;
}

export const QuickActionNotificationProvider: React.FC<QuickActionNotificationProviderProps> = ({ children }) => {
  const [quickActionNotifications, setQuickActionNotifications] = useState<QuickActionNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<QuickActionNotification | null>(null);
  const notificationAnimValue = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup notification handlers
  useEffect(() => {
    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[QuickActionNotification] Foreground notification received:', notification);
      const data = notification.request.content.data;
      
      // Handle quick action notifications
      if (data.eventType === 'friend_quick_action_message') {
        showQuickActionNotification({
          id: (data.userId as string) + '_quickaction_' + Date.now(),
          message: `${data.userName || 'A friend'} ${data.message}`,
          type: data.type as string,
          timestamp: new Date(),
          eventType: 'quick_action',
        });
      }
    });

    // Handle notification response (tap)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[QuickActionNotification] Notification response received:', response);
      const data = response.notification.request.content.data;
      
      // Handle quick action notifications
      if (data.eventType === 'friend_quick_action_message') {
        showQuickActionNotification({
          id: (data.userId as string) + '_quickaction_' + Date.now(),
          message: `${data.userName || 'A friend'} ${data.message}`,
          type: data.type as string,
          timestamp: new Date(response.notification.date),
          eventType: 'quick_action',
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

  const showQuickActionNotification = (notification: QuickActionNotification) => {
    console.log('[QuickActionNotification] ========== INTERNAL SHOW ==========');
    console.log('[QuickActionNotification] Internal function called with:', notification);
    
    // Add to notification list
    setQuickActionNotifications(prev => {
      console.log('[QuickActionNotification] Current quick action notifications:', prev.length);
      const updated = [...prev, notification];
      console.log('[QuickActionNotification] Updated quick action notifications:', updated.length);
      return updated;
    });
    
    // Set as active notification to display
    console.log('[QuickActionNotification] Setting active notification:', notification);
    setActiveNotification(notification);
    console.log('[QuickActionNotification] About to call showNotification animation');
    showNotification();
    console.log('[QuickActionNotification] ======================================');
  };

  const dismissQuickActionNotification = (id: string) => {
    console.log('[QuickActionNotification] Dismissing quick action notification:', id);
    
    // Remove from notification list
    setQuickActionNotifications(prev => prev.filter(n => n.id !== id));
    
    // If this was the active notification, clear it
    if (activeNotification?.id === id) {
      dismissNotification();
    }
  };

  const clearAllQuickActionNotifications = () => {
    console.log('[QuickActionNotification] Clearing all quick action notifications');
    setQuickActionNotifications([]);
    setActiveNotification(null);
    dismissNotification();
  };

  const showNotification = () => {
    console.log('[QuickActionNotification] ========== ANIMATION START ==========');
    console.log('[QuickActionNotification] Starting notification animation');
    // Reset and animate in
    notificationAnimValue.setValue(0);
    console.log('[QuickActionNotification] Animation value reset to 0');
    
    Animated.spring(notificationAnimValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(({ finished }) => {
      console.log('[QuickActionNotification] Animation finished:', finished);
    });

    // Auto-dismiss after 5 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('[QuickActionNotification] Auto-dismissing notification after 5 seconds');
      Animated.timing(notificationAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        console.log('[QuickActionNotification] Auto-dismiss animation complete');
        setActiveNotification(null);
      });
    }, 5000);
    console.log('[QuickActionNotification] =====================================');
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
    quickActionNotifications,
    showQuickActionNotification,
    dismissQuickActionNotification,
    clearAllQuickActionNotifications,
    activeNotification,
    notificationAnimValue,
    showNotification,
    dismissNotification,
  };

  // Expose functions globally for non-component usage
  console.log('[QuickActionNotification] ========== PROVIDER RENDER ==========');
  console.log('[QuickActionNotification] Setting up global notification functions');
  globalQuickActionNotificationFunctions = {
    showQuickActionNotification,
    dismissQuickActionNotification,
  };
  console.log('[QuickActionNotification] Global functions initialized:', !!globalQuickActionNotificationFunctions);
  console.log('[QuickActionNotification] Active notification:', activeNotification);
  console.log('[QuickActionNotification] Quick action notifications count:', quickActionNotifications.length);
  console.log('[QuickActionNotification] ====================================');

  return (
    <QuickActionNotificationContext.Provider value={value}>
      {children}
    </QuickActionNotificationContext.Provider>
  );
};