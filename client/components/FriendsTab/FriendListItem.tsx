import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface FriendListItemProps {
  name: string;
  country: string;
  profilePicture?: string;
  distance: number;
  status: 'online' | 'offline' | 'away';
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
  status,
  onPress,
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDistance = (km: number): string => {
    if (isNaN(km) || km === undefined || km === null) {
      return 'Unknown';
    }
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

  const content = (
    <>
      {/* Profile Picture or Initials with Online Status Indicator */}
      <View style={styles.profileContainer}>
        {profilePicture ? (
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profilePicture }}
              style={styles.profileImage}
              resizeMode="cover"
            />
            {/* Online Status Indicator */}
            {status === 'online' && (
              <View style={styles.onlineIndicator} />
            )}
          </View>
        ) : (
          <View style={styles.profileInitialsContainer}>
            <Text style={styles.profileInitials}>{initials}</Text>
            {/* Online Status Indicator */}
            {status === 'online' && (
              <View style={styles.onlineIndicator} />
            )}
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 0,
    minHeight: 64,
  },
  profileContainer: {
    marginRight: SPACING.MD,
    position: 'relative',
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // Changed from 'hidden' to allow indicator to extend outside
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileInitialsContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible', // Ensure overflow is visible for consistency
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BACKGROUND_WHITE,
  },
  // Online status indicator - small green circle at bottom right
  onlineIndicator: {
    position: 'absolute',
    bottom: -2, // Offset slightly outside to be fully visible
    right: -2,  // Offset slightly outside to be fully visible
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981', // green-500
    borderWidth: 2.5,
    borderColor: COLORS.BACKGROUND_WHITE,
    zIndex: 10, // Ensure it appears on top
  },
  friendInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
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

