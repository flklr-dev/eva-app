import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, PanResponder } from 'react-native';
import { ActivityListItem } from '../ActivityTab/ActivityListItem';
import { Activity } from '../../types/activity';
import { COLORS, SPACING } from '../../constants/theme';

interface ActivityListPanelProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
}

/**
 * Activity List Panel - Displays list of activities in bottom sheet with resize functionality
 */
export const ActivityListPanel: React.FC<ActivityListPanelProps> = ({
  activities,
  onActivityPress,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onRefresh,
}) => {
  // Height calculation constants for resizable panel
  const ACTIVITY_ITEM_HEIGHT = 82; // Approximate visual height per activity (includes separators and spacing)
  const HEADER_HEIGHT = 60; // Header with title
  const BOTTOM_SEPARATOR_HEIGHT = 1;
  const DEFAULT_VISIBLE_ACTIVITIES = 4; // Show exactly 4 activities by default
  const MAX_ACTIVITIES_TO_DISPLAY = 15; // Maximum 15 activities shown by recency
  const MAX_HEIGHT = Dimensions.get('window').height * 0.70;
  
  // Limit activities to maximum 15 most recent
  const displayActivities = activities.slice(0, MAX_ACTIVITIES_TO_DISPLAY);
  
  const calculatePanelHeight = () => {
    const numActivities = displayActivities.length;
    if (numActivities === 0) return HEADER_HEIGHT + 120; // Empty state height
    
    // Calculate content height based on actual activities (max 15)
    const contentHeight = HEADER_HEIGHT + (numActivities * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
    
    // For 1-4 activities, show all of them
    if (numActivities <= DEFAULT_VISIBLE_ACTIVITIES) return contentHeight;
    
    // For 5+ activities, default to showing 4 activities
    return HEADER_HEIGHT + (DEFAULT_VISIBLE_ACTIVITIES * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
  };
  
  const [panelHeight, setPanelHeight] = useState(calculatePanelHeight());
  
  // Recalculate height when activities change
  useEffect(() => {
    setPanelHeight(calculatePanelHeight());
  }, [displayActivities.length]);
  
  // PanResponder for handle bar drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Drag down (negative dy) increases height, drag up (positive dy) decreases height
        const newHeight = panelHeight - gestureState.dy;
        const numActivities = displayActivities.length;
        
        // Calculate constraints (max 15 activities)
        const contentHeight = HEADER_HEIGHT + (numActivities * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        const maxAllowedHeight = Math.min(MAX_HEIGHT, contentHeight);
        const minHeight = HEADER_HEIGHT + (Math.min(DEFAULT_VISIBLE_ACTIVITIES, numActivities) * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        
        // Clamp height between min and max
        const clampedHeight = Math.max(minHeight, Math.min(maxAllowedHeight, newHeight));
        setPanelHeight(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalHeight = panelHeight - gestureState.dy;
        const numActivities = displayActivities.length;
        
        // Calculate constraints (max 15 activities)
        const contentHeight = HEADER_HEIGHT + (numActivities * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        const maxAllowedHeight = Math.min(MAX_HEIGHT, contentHeight);
        const minHeight = HEADER_HEIGHT + (Math.min(DEFAULT_VISIBLE_ACTIVITIES, numActivities) * ACTIVITY_ITEM_HEIGHT) + BOTTOM_SEPARATOR_HEIGHT;
        
        const clampedHeight = Math.max(minHeight, Math.min(maxAllowedHeight, finalHeight));
        setPanelHeight(clampedHeight);
      },
    })
  ).current;

  return (
    <View style={[styles.container, { height: panelHeight }]}>
      {/* Draggable Handle Area - Invisible touch area at top */}
      <View {...panResponder.panHandlers} style={styles.handleArea} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      {/* Activities List */}
      <ScrollView
        style={[styles.listContainer, { maxHeight: panelHeight - HEADER_HEIGHT - BOTTOM_SEPARATOR_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onScrollEndDrag={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const isCloseToBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
          if (isCloseToBottom && hasMore && !isLoading && onLoadMore) {
            onLoadMore();
          }
        }}
      >
        {displayActivities.map((activity, index) => (
          <View key={activity.id}>
            <ActivityListItem
              activity={activity}
              onPress={() => onActivityPress?.(activity)}
            />
            {index < displayActivities.length - 1 && <View style={styles.separator} />}
          </View>
        ))}
        {displayActivities.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activities yet</Text>
            <Text style={styles.emptyStateSubtext}>Activities will appear here</Text>
          </View>
        )}
        {isLoading && displayActivities.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Loading activities...</Text>
          </View>
        )}
      </ScrollView>

      {/* Separator Line - Between activities list and bottom navbar */}
      {displayActivities.length > 0 && <View style={styles.bottomSeparator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 0,
    paddingHorizontal: SPACING.MD,
  },
  handleArea: {
    position: 'absolute',
    top: -24,
    left: 0,
    right: 0,
    height: 24,
    width: '100%',
    zIndex: 10,
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
    marginBottom: 0,
  },
  listContent: {
    paddingBottom: 0,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginLeft: 0,
  },
  bottomSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginLeft: 0,
    marginTop: 8,
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

