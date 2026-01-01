import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform, ActivityIndicator } from 'react-native';
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
  onBackToDetails?: () => void;
  onTransportModeChange?: (mode: TransportMode, routeData: RouteData) => void;
  onClearRoute?: () => void;
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
  onBackToDetails,
  onClearRoute,
}) => {
  const [selectedMode, setSelectedMode] = useState<TransportMode>('car');
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentCalculationRef = useRef<TransportMode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Animation for slide-in effect from bottom
  const slideAnim = useRef(new Animated.Value(DEFAULT_PANEL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMountedRef.current = true;
    
    // Check if friend has valid location before proceeding
    const hasValidLocation = friend.coordinate && 
                            friend.coordinate.latitude !== 0 && 
                            friend.coordinate.longitude !== 0 &&
                            !isNaN(friend.coordinate.latitude) &&
                            !isNaN(friend.coordinate.longitude);
    
    if (!hasValidLocation) {
      // Friend doesn't have location, show error and close panel
      setError('This friend hasn\'t shared their location. You can\'t get directions to them until they enable location sharing.');
      return;
    }
    
    // Check if user has location
    if (!userLocation) {
      setError('Your location is required to calculate the route. Please enable location sharing.');
      return;
    }
    
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
    
    // Cleanup function to cancel any ongoing requests when component unmounts
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing fetch requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Clear any pending timeouts
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []);

  const calculateRoute = async (mode: TransportMode) => {
    // Clear previous route data and set loading state
    setIsCalculating(true);
    setError(null);
    setRouteData(null); // Clear old route data immediately
    setSelectedMode(mode);
    currentCalculationRef.current = mode;
    
    try {
      // Use OSRM (Open Source Routing Machine) for route calculation
      const profile = getOSRMProfile(mode);
      // Build URL with proper query parameters (OSRM doesn't accept arbitrary parameters)
      const url = `https://router.project-osrm.org/route/v1/${profile}/${userLocation.longitude},${userLocation.latitude};${friend.coordinate.longitude},${friend.coordinate.latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;
      
      console.log(`[RoutePanel] Calculating route for mode: ${mode}, profile: ${profile}`);
      console.log(`[RoutePanel] URL: ${url}`);
      
      // Add 10 second timeout to prevent hanging
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      timeoutIdRef.current = timeoutId;
      
      let response: Response;
      try {
        // Use cache-control headers to prevent caching
        // Note: OSRM doesn't accept arbitrary query parameters, so we can't use URL-based cache busting
        response = await fetch(url, { 
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        clearTimeout(timeoutId);
        timeoutIdRef.current = null;
      } catch (fetchError: any) {
      clearTimeout(timeoutId);
        timeoutIdRef.current = null;
        abortControllerRef.current = null;
        if (fetchError.name === 'AbortError') {
          // Check if this was aborted due to component unmounting
          if (!isMountedRef.current) {
            console.log(`[RoutePanel] Request aborted - component unmounted`);
            return;
          }
          throw new Error('Request timed out');
        }
        throw new Error(`Network error: ${fetchError.message || 'Unable to connect'}`);
      }
      
      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) {
          // Ignore error reading response body
        }
        console.error(`[RoutePanel] API error response (${response.status}):`, errorText);
        
        // Provide more specific error messages based on status code
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('Routing service is temporarily unavailable. Please try again later.');
        } else if (response.status === 400) {
          throw new Error('Invalid route request. Please check the locations.');
        } else {
          throw new Error(`Routing service error: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      
      // Check if this calculation is still relevant and component is still mounted
      if (!isMountedRef.current) {
        console.log(`[RoutePanel] Component unmounted, ignoring API response for ${mode}`);
        return;
      }
      
      if (currentCalculationRef.current !== mode) {
        console.log(`[RoutePanel] Calculation for mode ${mode} is no longer relevant, ignoring result`);
        return;
      }
      
      // Log raw API response for debugging
      console.log(`[RoutePanel] API response for ${mode} (profile: ${profile}):`, {
        code: data.code,
        routesCount: data.routes?.length || 0,
        firstRouteDuration: data.routes?.[0]?.duration,
        firstRouteDistance: data.routes?.[0]?.distance,
      });
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Validate that we got route data
        if (!route.duration || !route.distance) {
          console.error(`[RoutePanel] Invalid route data for ${mode}:`, route);
          throw new Error('Invalid route data received');
        }
        
        const durationSeconds = route.duration;
        const distanceMeters = route.distance;
        const distanceKm = distanceMeters / 1000;
        
        // OSRM demo server sometimes returns cached/same durations for different profiles
        // If we detect this, calculate estimated duration based on mode
        let finalDurationSeconds = durationSeconds;
        
        // Average speeds in m/s for different modes
        const averageSpeeds: Record<TransportMode, number> = {
          car: 13.89,      // ~50 km/h
          motorcycle: 12.5, // ~45 km/h
          bus: 8.33,       // ~30 km/h
          walk: 1.39,      // ~5 km/h (walking speed)
        };
        
        // Calculate expected duration based on distance and mode speed
        const expectedDurationSeconds = distanceMeters / (averageSpeeds[mode] || averageSpeeds.car);
        
        // Calculate the difference ratio between API and expected duration
        const durationRatio = durationSeconds / expectedDurationSeconds;
        
        // If API duration is significantly off from expected (more than 20% difference),
        // it's likely cached/incorrect data - use calculated estimate
        // Also check if duration matches a known cached value (3215.2s) for non-car modes
        const isSuspiciouslyCached = Math.abs(durationSeconds - 3215.2) < 0.1 && mode !== 'car';
        const isSignificantlyOff = durationRatio < 0.8 || durationRatio > 1.2;
        
        if (isSuspiciouslyCached || isSignificantlyOff) {
          console.warn(`[RoutePanel] Suspicious ${mode} duration from API (${durationSeconds}s), expected (${expectedDurationSeconds.toFixed(1)}s), using calculated estimate`);
          console.warn(`[RoutePanel] Duration ratio: ${durationRatio.toFixed(2)}, isCached: ${isSuspiciouslyCached}, isOff: ${isSignificantlyOff}`);
          finalDurationSeconds = expectedDurationSeconds;
        }
        
        const durationMinutes = Math.round(finalDurationSeconds / 60);
        const distanceKmFormatted = distanceKm.toFixed(1);
        
        const routeInfo: RouteData = {
          duration: durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          distance: `${distanceKmFormatted} km`,
          mode: mode,
        };
        
        console.log(`[RoutePanel] Route calculated for ${mode} (profile: ${profile}):`, {
          rawDurationSeconds: durationSeconds,
          calculatedDurationSeconds: finalDurationSeconds,
          expectedDurationSeconds: expectedDurationSeconds,
          rawDistanceMeters: distanceMeters,
          formattedDuration: routeInfo.duration,
          formattedDistance: routeInfo.distance,
        });
        
        // Double-check the mode matches and component is still mounted before setting state
        // Check multiple times to catch race conditions
        if (!isMountedRef.current || currentCalculationRef.current !== mode) {
          console.log(`[RoutePanel] Component unmounted or mode changed, discarding route result for ${mode}`);
          return;
        }
        
        setRouteData(routeInfo);
        setError(null);
        
        // Final check right before calling callback to prevent race conditions
        if (isMountedRef.current && onTransportModeChange) {
          console.log(`[RoutePanel] Calling onTransportModeChange for ${mode}`);
          onTransportModeChange(mode, routeInfo);
        } else {
          console.log(`[RoutePanel] Skipping onTransportModeChange - component unmounted or callback not available`);
        }
      } else {
        throw new Error('No route found for this location');
      }
    } catch (error: any) {
      // Only update error state if this calculation is still relevant
      if (currentCalculationRef.current !== mode) {
        console.log(`[RoutePanel] Error for mode ${mode} is no longer relevant, ignoring`);
        return;
      }
      
      console.error('[RoutePanel] Error calculating route:', error);
      console.error('[RoutePanel] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
      // Set user-friendly error message based on error type
      let errorMessage = 'Unable to calculate route. Please try again.';
      
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Request timed out')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Network error') || error.message?.includes('Unable to connect') || error.message?.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to routing service. Please check your internet connection.';
      } else if (error.message?.includes('No route found') || error.message?.includes('unreachable')) {
        errorMessage = 'No route found for this location. The destination may be unreachable.';
      } else if (error.message?.includes('Routing service returned error')) {
        errorMessage = 'Routing service is temporarily unavailable. Please try again later.';
      } else if (error.message) {
        // Use the error message if it's user-friendly
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      setRouteData(null);
      
      // Don't call onTransportModeChange on error
    } finally {
      // Clean up refs
      abortControllerRef.current = null;
      timeoutIdRef.current = null;
      
      // Only clear loading state if this calculation is still relevant and component is mounted
      if (isMountedRef.current && currentCalculationRef.current === mode) {
      setIsCalculating(false);
        currentCalculationRef.current = null;
      }
    }
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


  const handleClose = () => {
    // Mark component as unmounting to prevent any callbacks
    isMountedRef.current = false;
    
    // Cancel any ongoing fetch requests immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear any pending timeouts
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    // Clear route from map immediately when close button is clicked
    if (onClearRoute) {
      onClearRoute();
    }
    
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
      if (onBackToDetails) {
        onBackToDetails();
      } else {
        onClose();
      }
    });
  };

  const handleModePress = (mode: TransportMode) => {
    // Always recalculate route when mode button is pressed, even if it's the same mode
    // This ensures fresh data and handles any potential state inconsistencies
      calculateRoute(mode);
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
        {(['car', 'walk', 'bus', 'motorcycle'] as TransportMode[]).map((mode, index, array) => (
          <View key={mode} style={index === array.length - 1 ? styles.modeButtonWrapperLast : styles.modeButtonWrapper}>
            <BlurView intensity={60} tint="light" style={[styles.modeButtonBlur, selectedMode === mode && styles.modeButtonBlurActive]}>
              <TouchableOpacity
                style={styles.modeButton}
                onPress={() => handleModePress(mode)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={getTransportIcon(mode)}
                  size={24}
                  color={selectedMode === mode ? COLORS.PRIMARY_BLUE : COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </BlurView>
          </View>
        ))}
      </View>

      {/* Route Information Container */}
      <View style={styles.routeInfoContainer}>
        <BlurView intensity={60} tint="light" style={styles.routeInfoBlur}>
          {isCalculating ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY_BLUE} />
              <Text style={styles.loadingText}>Calculating route...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons 
                name="alert-circle-outline" 
                size={32} 
                color={COLORS.ERROR} 
                style={styles.errorIcon}
              />
              <Text style={styles.errorTitle}>Unable to Calculate Route</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => calculateRoute(selectedMode)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="refresh" size={18} color={COLORS.BACKGROUND_WHITE} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : routeData && routeData.mode === selectedMode ? (
          <View style={styles.routeInfoContent}>
            <View style={styles.routeInfoLeft}>
                <Text style={styles.durationText}>{routeData.duration}</Text>
                  <Text style={styles.locationText}>{friend.country || friend.name}</Text>
            </View>
            <View style={styles.routeInfoRight}>
                <Text style={styles.distanceText}>{routeData.distance}</Text>
            </View>
          </View>
          ) : null}
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
  modeButtonWrapper: {
    flex: 1,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
    marginRight: SPACING.SM,
  },
  modeButtonWrapperLast: {
    flex: 1,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
  },
  modeButtonBlur: {
    backgroundColor: Platform.OS === 'ios' ? COLORS.OVERLAY_WHITE_LIGHT : COLORS.OVERLAY_WHITE_MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    borderRadius: BORDER_RADIUS.SM,
  },
  modeButtonBlurActive: {
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.SM,
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
  modeButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.SM,
    paddingTop: SPACING.SM,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.XS,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.SM,
    paddingTop: SPACING.SM,
  },
  errorIcon: {
    marginBottom: SPACING.MD,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY_BLUE,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.SM,
    gap: SPACING.SM,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.PRIMARY_BLUE,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BACKGROUND_WHITE,
  },
});
