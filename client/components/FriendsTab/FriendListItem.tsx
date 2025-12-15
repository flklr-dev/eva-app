import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface FriendListItemProps {
  name: string;
  country: string;
  profilePicture?: string;
  distance: number;
  onPress?: () => void;
}

/**
 * Friend List Item - Displays individual friend in the list
 */
export const FriendListItem: React.FC<FriendListItemProps> = ({
  name,
  country,
  profilePicture,
  distance,
  onPress,
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const content = (
    <>
      {/* Profile Picture or Initials */}
      <View style={styles.profileContainer}>
        {profilePicture ? (
          <View style={styles.profileImageContainer}>
            {/* In a real app, you'd use Image component here */}
            <Text style={styles.profileImagePlaceholder}>IMG</Text>
          </View>
        ) : (
          <View style={styles.profileInitialsContainer}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </View>
        )}
      </View>

      {/* Name and Country */}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{name}</Text>
        <Text style={styles.friendCountry}>{country}</Text>
      </View>

      {/* Distance */}
      <View style={styles.distanceContainer}>
        <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.friendRow} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.friendRow}>{content}</View>;
};

const styles = StyleSheet.create({
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 64,
  },
  profileContainer: {
    marginRight: SPACING.MD,
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImagePlaceholder: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
  },
  profileInitialsContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BACKGROUND_WHITE,
  },
  friendInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  friendCountry: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  distanceContainer: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
});

