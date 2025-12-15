import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';
import { Activity } from '../../types/activity';

interface ActivityListItemProps {
  activity: Activity;
  onPress?: () => void;
}

/**
 * Activity List Item - Displays individual activity in the list
 */
export const ActivityListItem: React.FC<ActivityListItemProps> = ({
  activity,
  onPress,
}) => {
  const initials = activity.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <>
      {/* Profile Picture or Initials */}
      <View style={styles.profileContainer}>
        {activity.profilePicture ? (
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

      {/* Name and Activity Info */}
      <View style={styles.activityInfo}>
        <Text style={styles.userName}>{activity.userName}</Text>
        <View style={styles.messageContainer}>
          <MaterialCommunityIcons name="message-text-outline" size={14} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.message}>{activity.message}</Text>
        </View>
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{activity.timeAgo}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{activity.location}</Text>
          </View>
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.activityRow} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.activityRow}>{content}</View>;
};

const styles = StyleSheet.create({
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  activityInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  message: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
});

