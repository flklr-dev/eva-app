import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapView, LatLng } from '../MapView';
import { StatusChip } from '../LocationTab/StatusChip';
import { BluetoothIndicator } from '../LocationTab/BluetoothIndicator';
import { LocationPermissionModal } from '../LocationTab/LocationPermissionModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Friend } from '../../types/friends';
import * as LocationService from '../../services/locationService';
import { calculateDistance } from '../../utils/distanceCalculator';

interface FriendsTabProps {
  friends: Friend[];
  isBluetoothConnected: boolean;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onFriendsWithDistanceChange?: (friends: Array<Friend & { distance: number }>) => void;
  onFriendPress?: (friend: Friend & { distance: number }) => void;
  sharedUserLocation?: { latitude: number; longitude: number } | null;
  sharedLocationPermissionGranted?: boolean;
  onUserLocationChange?: (location: { latitude: number; longitude: number } | null) => void;
  onLocationPermissionChange?: (granted: boolean) => void;
  sharedInitialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

export interface FriendsTabRef {
  navigateToFriend: (friend: Friend & { distance: number }) => void;
}

/**
 * Friends Tab - Displays map with friend locations
 */
export const FriendsTab = React.forwardRef<FriendsTabRef, FriendsTabProps>(({
  friends,
  isBluetoothConnected,
  initialRegion: propInitialRegion,
  onFriendsWithDistanceChange,
  onFriendPress,
  sharedUserLocation,
  sharedLocationPermissionGranted = false,
  onUserLocationChange,
  onLocationPermissionChange,
  sharedInitialRegion,
}, ref) => {
  const insets = useSafeAreaInsets();
  
  // Use shared location state if provided, otherwise use local state
  const [localUserLocation, setLocalUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [localLocationPermissionGranted, setLocalLocationPermissionGranted] = useState(false);
  const userLocation = sharedUserLocation !== undefined ? sharedUserLocation : localUserLocation;
  const locationPermissionGranted = sharedLocationPermissionGranted !== undefined ? sharedLocationPermissionGranted : localLocationPermissionGranted;
  
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [locationPermissionMessage, setLocationPermissionMessage] = useState<string>('');
  const [isRequestingLocation, setIsRequestingLocation] = useState(true);

  // Calculate distances and find nearest friend
  const friendsWithDistance = useMemo(() => {
    if (!userLocation) return [];
    return friends.map(friend => ({
      ...friend,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        friend.coordinate.latitude,
        friend.coordinate.longitude
      ),
    }));
  }, [friends, userLocation]);

  // Notify parent component when distances are calculated
  useEffect(() => {
    if (friendsWithDistance.length > 0 && onFriendsWithDistanceChange) {
      onFriendsWithDistanceChange(friendsWithDistance);
    }
  }, [friendsWithDistance, onFriendsWithDistanceChange]);

  const nearestFriend = useMemo(() => {
    if (friendsWithDistance.length === 0) return null;
    // Maximum distance: 50km (reasonable distance, not country-to-country)
    const MAX_DISTANCE_KM = 50;
    const validFriends = friendsWithDistance.filter(f => f.distance <= MAX_DISTANCE_KM);
    if (validFriends.length === 0) return null;
    return validFriends.reduce((nearest, friend) => 
      friend.distance < nearest.distance ? friend : nearest
    );
  }, [friendsWithDistance]);

  // Always use shared initial region (same as Home screen) with slight upward shift for friends list
  // This ensures consistent zoom level (0.01, 0.01) across all tabs
  const initialRegion = useMemo(() => {
    // Always use shared initial region if provided (same zoom as Home screen)
    if (sharedInitialRegion) {
      return {
        latitude: sharedInitialRegion.latitude + 0.015, // Shift north slightly to avoid friends list
        longitude: sharedInitialRegion.longitude,
        latitudeDelta: sharedInitialRegion.latitudeDelta, // Same zoom as Home screen
        longitudeDelta: sharedInitialRegion.longitudeDelta, // Same zoom as Home screen
      };
    }

    // Fallback: use same zoom level as Home screen
    if (userLocation) {
      return {
        latitude: userLocation.latitude + 0.015, // Shift north slightly to avoid friends list
        longitude: userLocation.longitude,
        latitudeDelta: 0.01, // Same zoom level as Home screen
        longitudeDelta: 0.01, // Same zoom level as Home screen
      };
    }

    // Default fallback
    if (propInitialRegion) {
      return propInitialRegion;
    }

    return {
      latitude: 6.950,
      longitude: 126.220,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [userLocation, sharedInitialRegion, propInitialRegion]);
  
  // Request location permission and get location on mount
  useEffect(() => {
    requestLocationPermissionAndFetch();
  }, []);

  const requestLocationPermissionAndFetch = async () => {
    try {
      setIsRequestingLocation(true);
      
      // Request permission
      const permissionStatus = await LocationService.requestLocationPermission();
      
      if (permissionStatus.granted) {
        const granted = true;
        if (onLocationPermissionChange) {
          onLocationPermissionChange(granted);
        } else {
          setLocalLocationPermissionGranted(granted);
        }
        
        // Get current location
        const location = await LocationService.getCurrentLocation();
        
        if (location) {
          const locationData = {
            latitude: location.latitude,
            longitude: location.longitude,
          };
          if (onUserLocationChange) {
            onUserLocationChange(locationData);
          } else {
            setLocalUserLocation(locationData);
          }
        } else {
          // Location fetch failed but permission granted - show error
          setLocationPermissionMessage('Unable to get your location. Please ensure location services are enabled.');
          setShowLocationPermissionModal(true);
        }
      } else {
        // Permission denied
        const granted = false;
        if (onLocationPermissionChange) {
          onLocationPermissionChange(granted);
        } else {
          setLocalLocationPermissionGranted(granted);
        }
        setLocationPermissionMessage(
          permissionStatus.message || 
          'Location permission is required for EVA Alert to work. Please enable it in your device settings.'
        );
        setShowLocationPermissionModal(true);
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      setLocationPermissionMessage('An error occurred while requesting location access.');
      setShowLocationPermissionModal(true);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleOpenSettings = async () => {
    await LocationService.openLocationSettings();
    setShowLocationPermissionModal(false);
  };

  const handleRetryLocation = async () => {
    setShowLocationPermissionModal(false);
    await requestLocationPermissionAndFetch();
  };

  // Convert friends to markers (use friendsWithDistance if available for better data)
  const friendMarkers = useMemo(() => {
    const friendsToUse = friendsWithDistance.length > 0 ? friendsWithDistance : friends;
    return friendsToUse.map(friend => ({
      id: friend.id,
      coordinate: friend.coordinate,
      name: friend.name,
      status: friend.status,
    }));
  }, [friends, friendsWithDistance]);
  
  // Map ref for navigation
  const mapRef = React.useRef<any>(null);
  
  // Handle friend press - navigate map to friend location (pan only, no zoom)
  const handleFriendPressInternal = React.useCallback((friend: Friend & { distance: number }) => {
    // Navigate map to friend location directly (avoid infinite loop)
    // Only pan/move to friend location, don't zoom in/out
    if (mapRef.current && friend.coordinate) {
      // Shift latitude north very significantly so marker appears in upper portion of visible map
      // Friends list panel covers bottom ~60% of screen, so shift by much larger amount
      const shiftedLat = friend.coordinate.latitude + 0.045;
      const script = `
        (function() {
          // Pan to friend location (shifted upward significantly) without changing zoom
          map.panTo([${shiftedLat}, ${friend.coordinate.longitude}], {
            animate: true,
            duration: 0.5
          });
          setTimeout(function() {
            map.eachLayer(function(layer) {
              if (layer instanceof L.CircleMarker) {
                var latlng = layer.getLatLng();
                if (Math.abs(latlng.lat - ${friend.coordinate.latitude}) < 0.0001 && 
                    Math.abs(latlng.lng - ${friend.coordinate.longitude}) < 0.0001) {
                  layer.openPopup();
                }
              }
            });
          }, 150);
        })();
        true;
      `;
      mapRef.current.injectJavaScript(script);
    }
  }, []);
  
  // Expose navigation function to parent via ref
  React.useImperativeHandle(ref, () => ({
    navigateToFriend: handleFriendPressInternal
  }));

  return (
    <>
      <View style={styles.mapWrapper}>
        {isRequestingLocation ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Requesting location access...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation={locationPermissionGranted}
            userLocation={userLocation}
            markers={friendMarkers}
            mapPadding={{ top: 0, right: 0, bottom: 400, left: 0 }}
          />
        )}

        {locationPermissionGranted && (
          <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
            <StatusChip
              friendCount={friends.length}
              onDropdownPress={() => console.log('Dropdown pressed')}
            />
            <BluetoothIndicator isConnected={isBluetoothConnected} />
          </View>
        )}
      </View>

      <LocationPermissionModal
        visible={showLocationPermissionModal}
        message={locationPermissionMessage}
        onRequestClose={() => setShowLocationPermissionModal(false)}
        onRetry={handleRetryLocation}
        onOpenSettings={handleOpenSettings}
      />
    </>
  );
});

const styles = StyleSheet.create({
  mapWrapper: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 0,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  overlayTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

