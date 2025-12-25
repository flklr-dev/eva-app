import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image, Dimensions, PanResponder, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FriendWithDistance } from '../../types/friends';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Panel height constraints
const MIN_PANEL_HEIGHT = 200;
const MAX_PANEL_HEIGHT = SCREEN_HEIGHT * 0.7;
const DEFAULT_PANEL_HEIGHT = Math.min(380, SCREEN_HEIGHT * 0.55);

interface FriendDetailsPanelProps {
  friend: FriendWithDistance;
  onClose: () => void;
  onContactDetails?: (friend: FriendWithDistance) => void;
  onRoute?: (friend: FriendWithDistance) => void;
  onRemoveFriend?: (friend: FriendWithDistance) => void;
}

/**
 * Friend Details Panel - Displays detailed information about a selected friend
 * Slides in with a subtle animation when a friend is clicked on the map
 */
export const FriendDetailsPanel: React.FC<FriendDetailsPanelProps> = ({
  friend,
  onClose,
  onContactDetails,
  onRoute,
  onRemoveFriend,
}) => {
  // Panel height state for resize functionality
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const panelHeightRef = useRef(DEFAULT_PANEL_HEIGHT);
  
  // Animation for slide-in effect from bottom
  const slideAnim = useRef(new Animated.Value(DEFAULT_PANEL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for handle bar drag resize
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Calculate new height based on drag direction
        // Moving up (negative dy) increases height, moving down decreases
        const newHeight = panelHeightRef.current - gestureState.dy;
        const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, newHeight));
        setPanelHeight(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Update the ref with final height
        const newHeight = panelHeightRef.current - gestureState.dy;
        const clampedHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, newHeight));
        panelHeightRef.current = clampedHeight;
        setPanelHeight(clampedHeight);
      },
    })
  ).current;

  useEffect(() => {
    // Animate in when component mounts - slide up from bottom
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 10,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    // Animate out before closing - slide down
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DEFAULT_PANEL_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Trigger onClose callback which resets map and closes panel
      onClose();
    });
  };

  const handleRemoveFriend = () => {
    if (onRemoveFriend) {
      // Trigger animation before removing
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DEFAULT_PANEL_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onRemoveFriend(friend);
      });
    }
  };

  // Format distance
  const formatDistance = (km: number): string => {
    if (isNaN(km) || km === undefined || km === null) {
      return 'Unknown';
    }
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  // Get initials for fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          minHeight: panelHeight,
        },
      ]}
    >
      {/* Draggable Handle Bar */}
      <View {...panResponder.panHandlers} style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header Row: Name and Close Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Profile Picture */}
          <View style={styles.profileContainer}>
            {friend.profilePicture ? (
              <Image
                source={{ uri: friend.profilePicture }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileFallback}>
                <Text style={styles.profileInitials}>{getInitials(friend.name)}</Text>
              </View>
            )}
            {/* Online status indicator */}
            {friend.status === 'online' && <View style={styles.onlineIndicator} />}
          </View>
          <Text style={styles.name}>{friend.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Friend Information - Simplified without icons and labels */}
      <View style={styles.infoSection}>
        {/* Current Location */}
        <Text style={styles.locationText}>{friend.country || 'Location not shared'}</Text>

        {/* Distance */}
        <Text style={styles.distanceText}>{formatDistance(friend.distance)} away</Text>
      </View>

      {/* Action Buttons - Larger size with glassmorphism background */}
      <View style={styles.actionButtonsContainer}>
        {/* Contact Details Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onContactDetails?.(friend)}
          activeOpacity={0.7}
        >
          <BlurView intensity={60} tint="light" style={styles.actionButtonBlur}>
            <View style={[styles.actionIconContainer, styles.contactIconBg]}>
              <MaterialCommunityIcons name="phone" size={24} color={COLORS.BACKGROUND_WHITE} />
            </View>
            <Text style={styles.actionButtonText}>Contact Details</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Route Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onRoute?.(friend)}
          activeOpacity={0.7}
        >
          <BlurView intensity={60} tint="light" style={styles.actionButtonBlur}>
            <View style={[styles.actionIconContainer, styles.routeIconBg]}>
              <MaterialCommunityIcons name="directions" size={24} color={COLORS.BACKGROUND_WHITE} />
            </View>
            <Text style={styles.actionButtonText}>Route ({formatDistance(friend.distance)})</Text>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Remove Friend Button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={handleRemoveFriend}
        activeOpacity={0.7}
      >
        <BlurView intensity={60} tint="light" style={styles.removeButtonBlur}>
          <MaterialCommunityIcons name="account-remove" size={18} color={COLORS.ERROR} />
          <Text style={styles.removeButtonText}>Remove {friend.name}</Text>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },
  handleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 20,
    marginTop: 4,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileContainer: {
    position: 'relative',
    marginRight: SPACING.SM,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileFallback: {
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
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: COLORS.BACKGROUND_WHITE,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    marginBottom: SPACING.XL,
    paddingLeft: 4,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  actionButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    minHeight: 130,
  },
  actionButtonBlur: {
    flex: 1,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.MD,
  },
  contactIconBg: {
    backgroundColor: COLORS.SUCCESS_GREEN,
  },
  routeIconBg: {
    backgroundColor: COLORS.PRIMARY_BLUE,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  removeButton: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    minHeight: 56,
  },
  removeButtonBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    gap: SPACING.SM,
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ERROR,
  },
});
