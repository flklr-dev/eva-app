import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../constants/theme';

interface StatusChipProps {
  friendCount: number;
  onDropdownPress?: () => void;
}

/**
 * Status Chip - Displays friend count and online status
 */
export const StatusChip: React.FC<StatusChipProps> = ({
  friendCount,
  onDropdownPress,
}) => {
  const statusColor = friendCount === 0 ? COLORS.ERROR : COLORS.SUCCESS_GREEN;

  return (
    <BlurView intensity={80} tint="light" style={styles.statusChip}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <Text style={styles.statusText} numberOfLines={1}>
        <Text style={styles.statusTextMain}>
          {friendCount} {friendCount === 1 ? 'friend' : 'friends'}
        </Text>
        <Text style={styles.statusTextOnline}> online</Text>
      </Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={onDropdownPress}>
        <MaterialCommunityIcons name="chevron-down" size={16} color={COLORS.TEXT_PRIMARY} />
      </TouchableOpacity>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.MD,
    minWidth: 180,
    overflow: 'hidden',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.SUCCESS_GREEN,
    marginRight: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 0.2,
    flexShrink: 1,
    flexGrow: 0,
  },
  statusTextMain: {
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  statusTextOnline: {
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  dropdownButton: {
    marginLeft: 8,
    padding: 4,
  },
});

