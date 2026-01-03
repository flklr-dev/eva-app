import { io, Socket } from 'socket.io-client';
import { getCleanedApiBaseUrl } from '../utils/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { showGlobalFriendRequestNotification } from '../context/GlobalNotificationContext';
import { showGlobalSafeHomeNotification } from '../context/SafeHomeNotificationContext';
import { showGlobalQuickActionNotification } from '../context/QuickActionNotificationContext';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let isConnecting = false;

// Multiple callbacks for friend request events (support multiple listeners)
const friendRequestReceivedCallbacks: Set<() => void> = new Set();
const friendRequestRespondedCallbacks: Set<() => void> = new Set();

// Callbacks for activity refresh events
const activityRefreshCallbacks: Set<() => void> = new Set();

// Callbacks for SOS alerts
const sosAlertReceivedCallbacks: Set<() => void> = new Set();

// Event types
export type WebSocketEvent = 
  | 'friend_request_sent'
  | 'friend_request_accepted'
  | 'friend_request_rejected'
  | 'friend_removed'
  | 'user_status_changed';

export interface FriendRequestEventData {
  requestId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderProfilePicture?: string;
  timestamp: string;
}

export interface FriendRequestResponseEventData {
  requestId: string;
  responderId: string;
  responderName: string;
  action: 'accepted' | 'rejected';
  timestamp: string;
}

export interface UserStatusEventData {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

// Initialize WebSocket connection
export const initializeWebSocket = async (): Promise<void> => {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    console.log('[WebSocket] Connection already in progress, skipping...');
    return;
  }
  
  // If already connected, just return
  if (socket?.connected) {
    console.log('[WebSocket] Already connected with ID:', socket.id);
    return;
  }
  
  try {
    isConnecting = true;
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      console.log('[WebSocket] No auth token available, skipping connection');
      isConnecting = false;
      return;
    }

    const API_URL = getCleanedApiBaseUrl();
    // Socket.IO uses http/https, not ws/wss for the connection URL
    const wsUrl = API_URL;
    
    console.log('[WebSocket] Initializing connection to:', wsUrl);
    console.log('[WebSocket] Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Close existing connection if any
    if (socket) {
      console.log('[WebSocket] Closing existing connection...');
      socket.disconnect();
      socket = null;
    }
    
    // Create new socket connection
    socket = io(wsUrl, {
      transports: ['websocket', 'polling'], // Allow fallback to polling
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true, // Force new connection
    });

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected successfully with ID:', socket?.id);
      reconnectAttempts = 0;
      isConnecting = false;
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      isConnecting = false;
      if (reason === 'io server disconnect') {
        // Server initiated disconnection, attempt to reconnect
        console.log('[WebSocket] Server disconnected, attempting reconnect...');
        setTimeout(() => {
          socket?.connect();
        }, 1000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      isConnecting = false;
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[WebSocket] Max reconnect attempts reached, will retry on next user action');
      }
    });

    // Friend request events
    socket.on('friend_request_received', (data: FriendRequestEventData) => {
      console.log('[WebSocket] Friend request received:', data);
      handleFriendRequestReceived(data);
    });

    socket.on('friend_request_accepted', (data: FriendRequestResponseEventData) => {
      console.log('[WebSocket] Friend request accepted:', data);
      handleFriendRequestAccepted(data);
    });

    socket.on('friend_request_rejected', (data: FriendRequestResponseEventData) => {
      console.log('[WebSocket] Friend request rejected:', data);
      handleFriendRequestRejected(data);
    });

    // User status events
    socket.on('user_status_changed', (data: UserStatusEventData) => {
      console.log('[WebSocket] User status changed:', data);
      handleUserStatusChanged(data);
    });

    // Safe home events from friends
    socket.on('friend_safe_home', (data: { userId: string; userName: string; message: string; timestamp: string }) => {
      console.log('[WebSocket] Friend sent safe home notification:', data);
      handleFriendSafeHome(data);
    });

    // Quick action message events from friends
    socket.on('friend_quick_action_message', (data: { userId: string; userName: string; message: string; type: string; timestamp: string }) => {
      console.log('[WebSocket] Friend sent message:', data);
      handleFriendQuickActionMessage(data);
    });

    // SOS alert events from friends
    socket.on('sos_alert', (data: { userId: string; userName: string; message: string; timestamp: string }) => {
      console.log('[WebSocket] SOS alert received:', data);
      handleSOSAlert(data);
    });

    isConnecting = false;
  } catch (error) {
    console.error('[WebSocket] Initialization error:', error);
    isConnecting = false;
  }
};

// Handle incoming friend request
const handleFriendRequestReceived = async (data: FriendRequestEventData) => {
  try {
    console.log('[WebSocket] ========== FRIEND REQUEST RECEIVED ==========');
    console.log('[WebSocket] Processing friend request from:', data.senderName);
    console.log('[WebSocket] Full data:', JSON.stringify(data));

    // Show global in-app notification
    console.log('[WebSocket] About to call showGlobalFriendRequestNotification');
    try {
      showGlobalFriendRequestNotification({
        id: data.requestId,
        senderName: data.senderName,
        senderId: data.senderId,
        requestId: data.requestId,
        timestamp: new Date(data.timestamp),
      });
      console.log('[WebSocket] ✓ showGlobalFriendRequestNotification called successfully');
    } catch (notifError) {
      console.error('[WebSocket] ✗ Error calling showGlobalFriendRequestNotification:', notifError);
    }

    console.log('[WebSocket] Friend request notification processed');
    console.log('[WebSocket] ========================================');

    // Call all registered callbacks
    friendRequestReceivedCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in friend request callback:', e);
      }
    });

    // Trigger activity refresh callbacks
    activityRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in activity refresh callback:', e);
      }
    });
  } catch (error) {
    console.error('[WebSocket] Error handling friend request:', error);
  }
};

// Handle friend request acceptance
const handleFriendRequestAccepted = async (data: FriendRequestResponseEventData) => {
  try {
    console.log('[WebSocket] Processing friend request acceptance from:', data.responderName);
    
    // Show local push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Friend Request Accepted',
        body: `${data.responderName} accepted your friend request`,
        data: {
          eventType: 'friend_request_accepted',
          responderId: data.responderId,
          requestId: data.requestId,
        },
        sound: 'default',
      },
      trigger: null, // Immediate notification
    });

    console.log('[WebSocket] Friend request accepted notification sent');
    
    // Call all registered callbacks
    friendRequestRespondedCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in friend response callback:', e);
      }
    });

    // Trigger activity refresh callbacks
    activityRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in activity refresh callback:', e);
      }
    });
  } catch (error) {
    console.error('[WebSocket] Error handling friend request acceptance:', error);
  }
};

// Handle friend request rejection
const handleFriendRequestRejected = async (data: FriendRequestResponseEventData) => {
  try {
    console.log('[WebSocket] Processing friend request rejection from:', data.responderName);
    
    // Show local push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Friend Request Declined',
        body: `${data.responderName} declined your friend request`,
        data: {
          eventType: 'friend_request_rejected',
          responderId: data.responderId,
          requestId: data.requestId,
        },
        sound: 'default',
      },
      trigger: null, // Immediate notification
    });

    console.log('[WebSocket] Friend request rejected notification sent');
    
    // Call all registered callbacks
    friendRequestRespondedCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in friend response callback:', e);
      }
    });
  } catch (error) {
    console.error('[WebSocket] Error handling friend request rejection:', error);
  }
};

// Handle user status changes
const handleUserStatusChanged = async (data: UserStatusEventData) => {
  try {
    // This could be used to update UI in real-time
    // For now, we'll just log it
    console.log('[WebSocket] User status changed:', data);
  } catch (error) {
    console.error('[WebSocket] Error handling user status change:', error);
  }
};

// Handle friend safe home notification
// Note: Push notifications are handled server-side via Expo's push service for offline friends
// This handler only receives events when the app is active (WebSocket connected)
const handleFriendSafeHome = async (data: { userId: string; userName: string; message: string; timestamp: string }) => {
  try {
    console.log('[WebSocket] Processing friend safe home notification from:', data.userName);
    
    // Show global in-app notification (app is active since WebSocket is connected)
    try {
      if (showGlobalSafeHomeNotification) {
        showGlobalSafeHomeNotification({
          id: data.userId + '_safehome_' + Date.now(),
          senderName: data.userName,
          senderId: data.userId,
          requestId: data.userId + '_safehome',
          timestamp: new Date(data.timestamp),
        });
        console.log('[WebSocket] Safe home in-app notification shown');
      }
    } catch (notifError) {
      console.error('[WebSocket] Error showing safe home notification:', notifError);
    }

    // Trigger activity refresh callbacks
    activityRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in activity refresh callback:', e);
      }
    });
  } catch (error) {
    console.error('[WebSocket] Error handling friend safe home:', error);
  }
};

// Handle friend quick action message notification
const handleFriendQuickActionMessage = async (data: { userId: string; userName: string; message: string; type: string; timestamp: string }) => {
  try {
    console.log('[WebSocket] Processing friend message from:', data.userName, 'Type:', data.type);

    // Show global in-app notification (app is active since WebSocket is connected)
    // Note: Push notifications are now handled by the server, not scheduled here
    try {
      showGlobalQuickActionNotification({
        id: data.userId + '_quickaction_' + Date.now(),
        message: `${data.userName || 'A friend'} ${data.message}`,
        type: data.type,
        timestamp: new Date(data.timestamp),
        eventType: 'quick_action',
      });
      console.log('[WebSocket] Quick action in-app notification shown');
    } catch (notifError) {
      console.error('[WebSocket] Error showing quick action notification:', notifError);
    }

    // Trigger activity refresh callbacks
    activityRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in activity refresh callback:', e);
      }
    });

    console.log('[WebSocket] Message notification processed');
  } catch (error) {
    console.error('[WebSocket] Error handling friend message:', error);
  }
};

// Handle incoming SOS alerts from friends
const handleSOSAlert = async (data: { userId: string; userName: string; message: string; timestamp: string }) => {
  try {
    console.log('[WebSocket] Processing SOS alert from:', data.userName);
    
    // Trigger the Bluetooth device if connected
    try {
      const { BluetoothProtocol } = await import('./bluetoothProtocol');
      const success = await BluetoothProtocol.triggerSOSAlarm();
      if (success) {
        console.log('[WebSocket] SOS alarm triggered on Bluetooth device');
      } else {
        console.error('[WebSocket] Failed to trigger SOS alarm on Bluetooth device');
      }
    } catch (bluetoothError) {
      console.error('[WebSocket] Error triggering Bluetooth SOS:', bluetoothError);
    }
    
    // Show global in-app notification
    try {
      showGlobalQuickActionNotification({
        id: data.userId + '_sos_' + Date.now(),
        message: `${data.userName || 'A friend'} sent an SOS alert`,
        type: 'sos',
        timestamp: new Date(data.timestamp),
      });
      console.log('[WebSocket] SOS in-app notification shown');
    } catch (notifError) {
      console.error('[WebSocket] Error showing SOS notification:', notifError);
    }
    
    // Trigger activity refresh callbacks
    activityRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (e) {
        console.error('[WebSocket] Error in activity refresh callback:', e);
      }
    });
    
    console.log('[WebSocket] SOS alert processed');
  } catch (error) {
    console.error('[WebSocket] Error handling SOS alert:', error);
  }
};

// Disconnect WebSocket
export const disconnectWebSocket = (): void => {
  if (socket) {
    console.log('[WebSocket] Disconnecting...');
    socket.disconnect();
    socket = null;
    isConnecting = false;
    reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected and cleaned up');
  }
};

// Emit events
export const emitFriendRequestSent = (recipientId: string): void => {
  if (socket?.connected) {
    socket.emit('friend_request_sent', { recipientId });
    console.log('[WebSocket] Friend request sent event emitted');
  } else {
    console.log('[WebSocket] Cannot emit event - not connected');
  }
};

// Emit safe home event to friends
export const emitSafeHome = (message: string): void => {
  if (socket?.connected) {
    socket.emit('safe_home', { message });
    console.log('[WebSocket] Safe home event emitted to friends');
  } else {
    console.log('[WebSocket] Cannot emit safe home event - not connected');
  }
};

// Emit message to friends
export const emitQuickActionMessage = (message: string, type: string): void => {
  if (socket?.connected) {
    socket.emit('quick_action_message', { message, type });
    console.log('[WebSocket] Message emitted to friends');
  } else {
    console.log('[WebSocket] Cannot emit message - not connected');
  }
};

// Emit SOS alert to friends
export const emitSOSAlert = (message: string): void => {
  if (socket?.connected) {
    socket.emit('sos_alert', { message });
    console.log('[WebSocket] SOS alert emitted to friends');
  } else {
    console.log('[WebSocket] Cannot emit SOS alert - not connected');
  }
};

export const emitFriendRequestResponded = (requestId: string, action: 'accept' | 'reject'): void => {
  if (socket?.connected) {
    socket.emit('friend_request_responded', { requestId, action });
    console.log('[WebSocket] Friend request responded event emitted');
  } else {
    console.log('[WebSocket] Cannot emit event - not connected');
  }
};

// Check connection status
export const isWebSocketConnected = (): boolean => {
  const connected = socket?.connected ?? false;
  console.log('[WebSocket] Connection status check:', connected);
  return connected;
};

// Register callbacks for friend request events (supports multiple listeners)
export const setOnFriendRequestReceived = (callback: () => void): (() => void) => {
  friendRequestReceivedCallbacks.add(callback);
  console.log('[WebSocket] Friend request received callback registered, total:', friendRequestReceivedCallbacks.size);
  
  // Return cleanup function
  return () => {
    friendRequestReceivedCallbacks.delete(callback);
    console.log('[WebSocket] Friend request received callback removed, total:', friendRequestReceivedCallbacks.size);
  };
};

export const setOnFriendRequestResponded = (callback: () => void): (() => void) => {
  friendRequestRespondedCallbacks.add(callback);
  console.log('[WebSocket] Friend request responded callback registered, total:', friendRequestRespondedCallbacks.size);
  
  // Return cleanup function
  return () => {
    friendRequestRespondedCallbacks.delete(callback);
    console.log('[WebSocket] Friend request responded callback removed, total:', friendRequestRespondedCallbacks.size);
  };
};

// Register callback for activity refresh events
export const setOnActivityRefresh = (callback: () => void): (() => void) => {
  activityRefreshCallbacks.add(callback);
  console.log('[WebSocket] Activity refresh callback registered, total:', activityRefreshCallbacks.size);
  
  // Return cleanup function
  return () => {
    activityRefreshCallbacks.delete(callback);
    console.log('[WebSocket] Activity refresh callback removed, total:', activityRefreshCallbacks.size);
  };
};

// Remove callbacks (for cleanup)
export const removeOnFriendRequestReceived = (callback: () => void): void => {
  friendRequestReceivedCallbacks.delete(callback);
};

export const removeOnFriendRequestResponded = (callback: () => void): void => {
  friendRequestRespondedCallbacks.delete(callback);
};

// Register callback for SOS alert events
export const setOnSOSAlertReceived = (callback: () => void): (() => void) => {
  sosAlertReceivedCallbacks.add(callback);
  console.log('[WebSocket] SOS alert callback registered, total:', sosAlertReceivedCallbacks.size);
  
  // Return cleanup function
  return () => {
    sosAlertReceivedCallbacks.delete(callback);
    console.log('[WebSocket] SOS alert callback removed, total:', sosAlertReceivedCallbacks.size);
  };
};

// Force reconnect with new token (useful after login)
export const reconnectWebSocket = async (): Promise<void> => {
  console.log('[WebSocket] Force reconnecting with new token...');
  disconnectWebSocket();
  reconnectAttempts = 0;
  await initializeWebSocket();
};
