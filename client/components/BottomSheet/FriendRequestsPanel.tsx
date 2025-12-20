import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { getFriendRequests, respondToFriendRequest } from '../../services/friendService';
import { useAuth } from '../../context/AuthContext';

interface FriendRequest {
  id: string;
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

  // Load friend requests
  const loadFriendRequests = async () => {
    if (!user || !token) return;

    try {
      setIsLoading(true);
      // Pass token from context to avoid AsyncStorage timing issues
      const data = await getFriendRequests(token);
      setReceivedRequests(data.received.filter(r => r.status === 'pending'));
      setSentRequests(data.sent.filter(r => r.status === 'pending'));
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load requests when panel becomes visible
  useEffect(() => {
    if (visible) {
      loadFriendRequests();
    }
  }, [visible, user]);

  // Handle accept/reject
  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      setIsProcessing(requestId);
      await respondToFriendRequest(requestId, action);
      
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friend Requests</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
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
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {request.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.avatar}>
                          <MaterialCommunityIcons
                            name="account"
                            size={24}
                            color={COLORS.TEXT_SECONDARY}
                          />
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
                      onPress={() => handleRespond(request.id, 'reject')}
                      disabled={isProcessing === request.id}
                    >
                      {isProcessing === request.id ? (
                        <ActivityIndicator size="small" color={COLORS.TEXT_PRIMARY} />
                      ) : (
                        <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_PRIMARY} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleRespond(request.id, 'accept')}
                      disabled={isProcessing === request.id}
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
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {request.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.avatar}>
                          <MaterialCommunityIcons
                            name="account"
                            size={24}
                            color={COLORS.TEXT_SECONDARY}
                          />
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
    maxHeight: 500,
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

