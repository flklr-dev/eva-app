import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { getFriendRequests, respondToFriendRequest } from '../../services/friendService';
import { useAuth } from '../../context/AuthContext';
import { 
  initializeWebSocket, 
  disconnectWebSocket, 
  setOnFriendRequestReceived, 
  setOnFriendRequestResponded,
  isWebSocketConnected 
} from '../../services/webSocketService';

interface FriendRequest {
  id: string;
  requestId?: string; // The actual friend request document ID (only for pending requests)
  name: string;
  email: string;
  profilePicture?: string;
  status: string;
  isRequester: boolean;
  createdAt: string;
}

interface FriendRequestsPanelProps {
  visible: boolean;
  onClose: () => void;
  onRequestAccepted?: () => void; // Callback when a request is accepted
}

/**
 * Friend Requests Panel
 * Displays pending friend requests (received and sent)
 * Allows users to accept/reject received requests
 */
export const FriendRequestsPanel: React.FC<FriendRequestsPanelProps> = ({
  visible,
  onClose,
  onRequestAccepted,
}) => {
  const { user, token } = useAuth();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const websocketInitializedRef = useRef(false);
  const loadFriendRequestsRef = useRef<(() => Promise<void>) | null>(null);

  // Load friend requests
  const loadFriendRequests = useCallback(async () => {
    if (!user || !token) {
      console.log('[FriendRequests] No user or token available');
      return;
    }

    if (isLoadingRef.current) {
      console.log('[FriendRequests] Already loading, skipping...');
      return;
    }

    try {
      console.log('[FriendRequests] Loading friend requests...');
      isLoadingRef.current = true;
      setIsLoading(true);
      // Pass token from context to avoid AsyncStorage timing issues
      const data = await getFriendRequests(token);
      console.log('[FriendRequests] Received data:', data);

      const filteredReceived = data.received.filter(r => r.status === 'pending');
      const filteredSent = data.sent.filter(r => r.status === 'pending');

      console.log('[FriendRequests] Filtered - Received:', filteredReceived.length, 'Sent:', filteredSent.length);

      setReceivedRequests(filteredReceived);
      setSentRequests(filteredSent);
    } catch (error: any) {
      console.error('[FriendRequests] Error loading friend requests:', error);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, token]); // Only include stable dependencies
  
  // Store loadFriendRequests in ref to avoid stale closures
  useEffect(() => {
    loadFriendRequestsRef.current = loadFriendRequests;
  }, [loadFriendRequests]);

  // Load requests when panel becomes visible
  useEffect(() => {
    if (visible) {
      loadFriendRequests();
      
      // Initialize WebSocket for real-time updates (only once)
      if (!websocketInitializedRef.current && token) {
        console.log('[FriendRequests] Initializing WebSocket...');
        initializeWebSocket();
        websocketInitializedRef.current = true;
      }
    }
  }, [visible, loadFriendRequests, token]);
  
  // Register WebSocket callbacks separately to avoid re-registration issues
  useEffect(() => {
    if (!visible || !token) return;
    
    console.log('[FriendRequests] Registering WebSocket callbacks...');
    
    // Register callback for real-time friend request updates
    const cleanupFriendRequestReceived = setOnFriendRequestReceived(() => {
      console.log('[FriendRequests] WebSocket: Friend request received, refreshing list...');
      // Call the function directly from the latest closure
      if (loadFriendRequestsRef.current) {
        loadFriendRequestsRef.current();
      }
    });
    
    // Register callback for friend request responses
    const cleanupFriendRequestResponded = setOnFriendRequestResponded(() => {
      console.log('[FriendRequests] WebSocket: Friend request response received, refreshing list...');
      // Call the function directly from the latest closure
      if (loadFriendRequestsRef.current) {
        loadFriendRequestsRef.current();
      }
      if (onRequestAccepted) {
        onRequestAccepted();
      }
    });
    
    // Cleanup callbacks when component unmounts or visibility changes
    return () => {
      console.log('[FriendRequests] Cleaning up WebSocket callbacks...');
      cleanupFriendRequestReceived();
      cleanupFriendRequestResponded();
    };
  }, [visible, token, onRequestAccepted]);

  // Auto-refresh every 30 seconds when panel is visible
  // Note: HomeScreen also polls for updates, but keeping this for when panel is open independently
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (visible) {
      interval = setInterval(() => {
        loadFriendRequests();
      }, 60000); // Increased to 60 seconds to reduce frequency, since HomeScreen also polls
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [visible, loadFriendRequests]); // Include memoized function

  // Handle WebSocket connection status
  useEffect(() => {
    if (visible && token) {
      // Check WebSocket connection status periodically
      const checkConnection = () => {
        const connected = isWebSocketConnected();
        console.log('[FriendRequests] WebSocket connected:', connected);
        if (!connected && !websocketInitializedRef.current) {
          console.log('[FriendRequests] Reconnecting WebSocket...');
          initializeWebSocket();
          websocketInitializedRef.current = true;
        }
      };
      
      // Initial check after delay
      const timer = setTimeout(checkConnection, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, token]);

  // Handle accept/reject
  const handleRespond = async (friendRequestId: string, action: 'accept' | 'reject') => {
    if (!friendRequestId) {
      console.error('[FriendRequests] No friend request ID provided');
      return;
    }

    try {
      setIsProcessing(friendRequestId);
      await respondToFriendRequest(friendRequestId, action);
      
      // Reload requests
      await loadFriendRequests();
      
      // Callback if request was accepted
      if (action === 'accept' && onRequestAccepted) {
        onRequestAccepted();
      }
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      // Error is handled by the service
    } finally {
      setIsProcessing(null);
    }
  };

  if (!visible) return null;

  const hasRequests = receivedRequests.length > 0 || sentRequests.length > 0;

  // Removed excessive rendering logs to prevent performance issues
  // console.log('[FriendRequests] Rendering - visible:', visible, 'hasRequests:', hasRequests, 'received:', receivedRequests.length, 'sent:', sentRequests.length, 'isLoading:', isLoading);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={loadFriendRequests} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        </View>
      </View>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : !hasRequests ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-plus-outline" size={64} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptySubtext}>Friend requests will appear here</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Received Requests */}
          {receivedRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Received ({receivedRequests.length})</Text>
              {receivedRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestContent}>
                    <View style={styles.avatarContainer}>
                      {request.profilePicture ? (
                        <Image
                          source={{ uri: request.profilePicture }}
                          style={styles.avatar}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('[FriendRequests] Profile picture load error for received request:', request.id, error);
                          }}
                        />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {request.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.name}</Text>
                      <Text style={styles.requestEmail}>{request.email}</Text>
                    </View>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => {
                        if (request.requestId) {
                          handleRespond(request.requestId, 'reject');
                        } else {
                          console.error('[FriendRequests] Missing requestId for request:', request.id);
                        }
                      }}
                      disabled={isProcessing === request.requestId || !request.requestId}
                    >
                      {isProcessing === request.requestId ? (
                        <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
                      ) : (
                        <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_PRIMARY} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => {
                        if (request.requestId) {
                          handleRespond(request.requestId, 'accept');
                        } else {
                          console.error('[FriendRequests] Missing requestId for request:', request.id);
                        }
                      }}
                      disabled={isProcessing === request.requestId || !request.requestId}
                    >
                      {isProcessing === request.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialCommunityIcons name="check" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sent ({sentRequests.length})</Text>
              {sentRequests.map((request) => (
                <View key={request.id} style={styles.requestItem}>
                  <View style={styles.requestContent}>
                    <View style={styles.avatarContainer}>
                      {request.profilePicture ? (
                        <Image
                          source={{ uri: request.profilePicture }}
                          style={styles.avatar}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('[FriendRequests] Profile picture load error for sent request:', request.id, error);
                          }}
                        />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {request.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.name}</Text>
                      <Text style={styles.requestEmail}>{request.email}</Text>
                    </View>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: SPACING.MD,
    maxHeight: 600,
    minHeight: 200,
    flex: 1, // Allow container to grow
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  refreshButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginBottom: SPACING.MD,
  },
  loadingContainer: {
    paddingVertical: SPACING.XL * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  emptyContainer: {
    paddingVertical: SPACING.XL * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.MD,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_OPACITY,
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: SPACING.MD,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  requestEmail: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.TEXT_PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  acceptButton: {
    backgroundColor: COLORS.TEXT_PRIMARY,
  },
  rejectButton: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
  },
  pendingBadge: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
});

