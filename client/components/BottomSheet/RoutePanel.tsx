import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FriendWithDistance } from '../../types/friends';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_PANEL_HEIGHT = Math.min(280, SCREEN_HEIGHT * 0.4);

type TransportMode = 'car' | 'walk' | 'bus' | 'motorcycle';

interface RoutePanelProps {
  friend: FriendWithDistance;
  onClose: () => void;
  onTransportModeChange?: (mode: TransportMode, routeData: RouteData) => void;
  userLocation: { latitude: number; longitude: number };
}

interface RouteData {
  duration: string;
  distance: string;
  mode: TransportMode;
}

/**
 * Route Panel - Displays route options and transportation modes
 * Slides in when the Route button is clicked from Friend Details Panel
 */
export const RoutePanel: React.FC<RoutePanelProps> = ({
  friend,
  onClose,
  onTransportModeChange,
  userLocation,
}) => {
  const [selectedMode, setSelectedMode] = useState<TransportMode>('car');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Animation for slide-in effect from bottom
  const slideAnim = useRef(new Animated.Value(DEFAULT_PANEL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    
    // Calculate initial route with default mode (car)
    calculateRoute('car');
  }, []);

  const calculateRoute = async (mode: TransportMode) => {
    setIsCalculating(true);
    setSelectedMode(mode);
    
    try {
      // Use OSRM (Open Source Routing Machine) for route calculation
      const profile = getOSRMProfile(mode);
      const url = `https://router.project-osrm.org/route/v1/${profile}/${userLocation.longitude},${userLocation.latitude};${friend.coordinate.longitude},${friend.coordinate.latitude}?overview=full&geometries=geojson`;
      
      // Add 5 second timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationMinutes = Math.round(route.duration / 60);
        const distanceKm = (route.distance / 1000).toFixed(1);
        
        const routeInfo: RouteData = {
          duration: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          distance: `${distanceKm} km`,
          mode: mode,
        };
        
        setRouteData(routeInfo);
        
        if (onTransportModeChange) {
          onTransportModeChange(mode, routeInfo);
        }
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.log('Route API failed, using fallback calculation');
      // Fallback to simple distance-based estimation
      const calculatedDistance = calculateDistanceFromCoords(
        userLocation.latitude,
        userLocation.longitude,
        friend.coordinate.latitude,
        friend.coordinate.longitude
      );
      
      const estimatedDuration = estimateDuration(calculatedDistance, mode);
      
      const routeInfo: RouteData = {
        duration: estimatedDuration,
        distance: `${calculatedDistance.toFixed(1)} km`,
        mode: mode,
      };
      
      setRouteData(routeInfo);
      
      if (onTransportModeChange) {
        onTransportModeChange(mode, routeInfo);
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistanceFromCoords = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getOSRMProfile = (mode: TransportMode): string => {
    switch (mode) {
      case 'car':
      case 'motorcycle':
        return 'driving';
      case 'walk':
        return 'foot';
      case 'bus':
        return 'driving'; // Use driving profile for bus
      default:
        return 'driving';
    }
  };

  const estimateDuration = (distanceKm: number, mode: TransportMode): string => {
    // Average speeds in km/h
    const speeds = {
      car: 40,
      motorcycle: 35,
      bus: 25,
      walk: 5,
    };
    
    const speed = speeds[mode];
    const durationHours = distanceKm / speed;
    const durationMinutes = Math.round(durationHours * 60);
    
    if (durationMinutes < 60) {
      return `${durationMinutes} min`;
    }
    return `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
  };

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
      onClose();
    });
  };

  const handleModePress = (mode: TransportMode) => {
    if (mode !== selectedMode) {
      calculateRoute(mode);
    }
  };

  const getTransportIcon = (mode: TransportMode): any => {
    switch (mode) {
      case 'car':
        return 'car';
      case 'walk':
        return 'walk';
      case 'bus':
        return 'bus';
      case 'motorcycle':
        return 'motorbike';
      default:
        return 'car';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          height: DEFAULT_PANEL_HEIGHT,
        },
      ]}
    >
      {/* Handle Bar */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header Row: Route text and Close Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Transportation Mode Buttons */}
      <View style={styles.modeButtonsContainer}>
        {(['car', 'walk', 'bus', 'motorcycle'] as TransportMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              selectedMode === mode && styles.modeButtonActive,
            ]}
            onPress={() => handleModePress(mode)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={getTransportIcon(mode)}
              size={24}
              color={selectedMode === mode ? COLORS.PRIMARY_BLUE : COLORS.TEXT_SECONDARY}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Route Information Container */}
      <View style={styles.routeInfoContainer}>
        <BlurView intensity={60} tint="light" style={styles.routeInfoBlur}>
          <View style={styles.routeInfoContent}>
            <View style={styles.routeInfoLeft}>
              {isCalculating ? (
                <Text style={styles.durationText}>Calculating...</Text>
              ) : (
                <>
                  <Text style={styles.durationText}>{routeData?.duration || '---'}</Text>
                  <Text style={styles.locationText}>{friend.country || friend.name}</Text>
                </>
              )}
            </View>
            <View style={styles.routeInfoRight}>
              <Text style={styles.distanceText}>{routeData?.distance || '---'}</Text>
            </View>
          </View>
        </BlurView>
      </View>
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
    marginBottom: 12,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonsContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  modeButton: {
    flex: 1,
    height: 56,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderColor: COLORS.PRIMARY_BLUE,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.PRIMARY_BLUE,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  routeInfoContainer: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
  },
  routeInfoBlur: {
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
  },
  routeInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeInfoLeft: {
    flex: 1,
  },
  durationText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  routeInfoRight: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
});
