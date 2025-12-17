import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { QuickActionButton as QuickActionButtonType } from '../../types/quickActions';
import { COLORS } from '../../constants/theme';

interface QuickActionButtonProps {
  action: QuickActionButtonType;
  isActive: boolean;
  onPress: () => void;
}

/**
 * Reusable Quick Action Button component
 */
export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  action,
  isActive,
  onPress,
}) => {
  const iconColor = isActive ? COLORS.PRIMARY : action.color;

  return (
    <TouchableOpacity
      style={styles.quickActionButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {action.isText ? (
        <Text style={[styles.sosText, isActive && { color: COLORS.PRIMARY }]}>
          {action.label}
        </Text>
      ) : (
        <View style={styles.quickActionIconContainer}>
          {action.iconName && (
            <MaterialCommunityIcons
              name={action.iconName as any}
              size={24}
              color={iconColor}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  quickActionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        elevation: 4,
        shadowColor: 'transparent',
      },
      default: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  sosText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'System',
  },
  quickActionIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

