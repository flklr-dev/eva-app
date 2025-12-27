import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform, ActivityIndicator, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FriendListItem } from '../FriendsTab/FriendListItem';
import { FriendWithDistance } from '../../types/friends';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { InviteFriendModal } from './InviteFriendModal';

interface FriendsListPanelProps {
  friends: FriendWithDistance[];
  onAddFriend?: () => void;
  onFriendPress?: (friend: FriendWithDistance) => void;
  onShare?: () => void;
  onMessage?: () => void;
  onScan?: () => void; // Now shows QR code instead of scanning
  pendingRequestsCount?: number;
  onShowRequests?: () => void;
  isLoading?: boolean;
}

/**
 * Friends List Panel - Displays list of friends in bottom sheet
 */
export const FriendsListPanel: React.FC<FriendsListPanelProps> = ({
  friends,
  onAddFriend,
  onFriendPress,
  onShare,
  onMessage,
  onScan,
  pendingRequestsCount = 0,
  onShowRequests,
  isLoading = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const buttonRef = useRef<React.ElementRef<typeof TouchableOpacity> | null>(null);
  
  // Height calculation constants for resizable panel
  const FRIEND_ITEM_HEIGHT = 80; // Approximate visual height per friend (includes separators and spacing)
  const HEADER_HEIGHT = 60; // Header with title and add button
  const BOTTOM_SEPARATOR_HEIGHT = 1;
  const DEFAULT_VISIBLE_FRIENDS = 2; // Show exactly 2 friends by default
  const MAX_HEIGHT = Dimensions.get('window').height * 0.85; // 85% of screen height
  
  const calculatePanelHeight = () => {
    const numFriends = friends.length;
    if (numFriends === 0) return HEADER_HEIGHT + 120; // Empty state height
    
    // Calculate content height based on actual friends
    const contentHeight = HEADER_HEIGHT + (numFriends * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
    
    // For 1-2 friends, show all of them
    if (numFriends <= 2) return contentHeight;
    
    // For 3+ friends, default to showing 2 friends
    return HEADER_HEIGHT + (DEFAULT_VISIBLE_FRIENDS * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
  };
  
  const [panelHeight, setPanelHeight] = useState(calculatePanelHeight());
  
  // PanResponder for handle bar drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Drag down (negative dy) increases height, drag up (positive dy) decreases height
        const newHeight = panelHeight - gestureState.dy;
        const numFriends = friends.length;
        
        // Calculate constraints
        const contentHeight = HEADER_HEIGHT + (numFriends * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        const maxAllowedHeight = Math.min(MAX_HEIGHT, contentHeight);
        const minHeight = HEADER_HEIGHT + (Math.min(2, numFriends) * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        
        // Clamp height between min and max
        const clampedHeight = Math.max(minHeight, Math.min(maxAllowedHeight, newHeight));
        setPanelHeight(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalHeight = panelHeight - gestureState.dy;
        const numFriends = friends.length;
        
        // Calculate constraints
        const contentHeight = HEADER_HEIGHT + (numFriends * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        const maxAllowedHeight = Math.min(MAX_HEIGHT, contentHeight);
        const minHeight = HEADER_HEIGHT + (Math.min(2, numFriends) * FRIEND_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        
        const clampedHeight = Math.max(minHeight, Math.min(maxAllowedHeight, finalHeight));
        setPanelHeight(clampedHeight);
      },
    })
  ).current;

  const handleAddButtonPress = () => {
    // Measure button position before showing modal
    if (buttonRef.current) {
      buttonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setButtonPosition({ x: pageX, y: pageY, width, height });
        setModalVisible(true);
      });
    } else {
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, { height: panelHeight }]}>
      {/* Draggable Handle Area - Invisible touch area at top */}
      <View {...panResponder.panHandlers} style={styles.handleArea} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Friends</Text>
          {pendingRequestsCount > 0 && onShowRequests && (
            <TouchableOpacity
              style={styles.requestsButton}
              onPress={onShowRequests}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="account-plus" size={18} color={COLORS.TEXT_PRIMARY} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          ref={buttonRef}
          style={styles.addButton}
          onPress={handleAddButtonPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Friends List */}
      <ScrollView
        style={[styles.listContainer, { maxHeight: panelHeight - HEADER_HEIGHT - BOTTOM_SEPARATOR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>Tap the + button to add friends</Text>
          </View>
        ) : (
          friends.map((friend, index) => (
            <View key={friend.id}>
              <FriendListItem
                name={friend.name}
                country={friend.country}
                profilePicture={friend.profilePicture}
                distance={friend.distance}
                status={friend.status}
                onPress={() => onFriendPress?.(friend)}
              />
              {index < friends.length - 1 && <View style={styles.separator} />}
            </View>
          ))
        )}
      </ScrollView>

      {/* Separator Line - Between friends list and bottom navbar */}
      {friends.length > 0 && <View style={styles.bottomSeparator} />}

      {/* Invite Friend Modal */}
        <InviteFriendModal
          visible={modalVisible}
          onClose={handleCloseModal}
          onShare={onShare}
          onMessage={onMessage}
          onScan={onScan}
          onShareAfterClose={onShare}
          buttonPosition={buttonPosition}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 0,
    paddingHorizontal: SPACING.MD,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  requestsButton: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.BACKGROUND_WHITE,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listContainer: {
    // maxHeight will be set dynamically based on panel height
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: SPACING.SM,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginLeft: 0, // Align with content (48px avatar + 16px margin)
  },
  bottomSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginLeft: 0, // Align with content (48px avatar + 16px margin)
    marginBottom: 0, // Reduced margin bottom
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XL * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
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
  handleArea: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },
});

