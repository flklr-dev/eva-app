import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform, ActivityIndicator } from 'react-native';
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
    <View style={styles.container}>
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
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    marginBottom: 12,
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
    maxHeight: Math.min(320, Dimensions.get('window').height * 0.55),
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
});

