import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
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
  onScan?: () => void;
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
        <Text style={styles.title}>Friends</Text>
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
        {friends.map((friend, index) => (
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
        ))}
        {friends.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No friends yet</Text>
            <Text style={styles.emptyStateSubtext}>Tap the + button to add friends</Text>
          </View>
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
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
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
    maxHeight: 290,
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
});

