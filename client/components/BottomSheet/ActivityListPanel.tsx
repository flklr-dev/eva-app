import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ActivityListItem } from '../ActivityTab/ActivityListItem';
import { Activity } from '../../types/activity';
import { COLORS, SPACING } from '../../constants/theme';

interface ActivityListPanelProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
}

/**
 * Activity List Panel - Displays list of activities in bottom sheet
 */
export const ActivityListPanel: React.FC<ActivityListPanelProps> = ({
  activities,
  onActivityPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      {/* Activities List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {activities.map((activity, index) => (
          <View key={activity.id}>
            <ActivityListItem
              activity={activity}
              onPress={() => onActivityPress?.(activity)}
            />
            {index < activities.length - 1 && <View style={styles.separator} />}
          </View>
        ))}
        {activities.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activities yet</Text>
            <Text style={styles.emptyStateSubtext}>Activities will appear here</Text>
          </View>
        )}
      </ScrollView>

      {/* Separator Line - Between activities list and bottom navbar */}
      {activities.length > 0 && <View style={styles.bottomSeparator} />}
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
    marginLeft: 0,
    marginBottom: 0,
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

