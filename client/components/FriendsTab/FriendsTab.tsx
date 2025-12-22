import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapView } from '../MapView';
import { StatusChip } from '../LocationTab/StatusChip';
import { BluetoothIndicator } from '../LocationTab/BluetoothIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Friend } from '../../types/friends';
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
  
  // IMPORTANT: Location permission is already handled at HomeScreen level
  // We receive sharedUserLocation and sharedLocationPermissionGranted as props
  // No need to request location again here - this was causing the permission popup bug
  const userLocation = sharedUserLocation;
  const locationPermissionGranted = sharedLocationPermissionGranted;

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

  // Calculate online friends count
  const onlineFriendsCount = useMemo(() => {
    return friends.filter(friend => friend.status === 'online').length;
  }, [friends]);

  // Notify parent component when distances are calculated - use ref to avoid infinite loop
  const prevFriendsWithDistanceRef = useRef<Array<Friend & { distance: number }>>([]);
  useEffect(() => {
    // Only call callback if the friendsWithDistance actually changed (deep comparison by length and first item)
    const hasChanged = 
      friendsWithDistance.length !== prevFriendsWithDistanceRef.current.length ||
      (friendsWithDistance.length > 0 && 
       prevFriendsWithDistanceRef.current.length > 0 &&
       friendsWithDistance[0].id !== prevFriendsWithDistanceRef.current[0].id);
    
    if (hasChanged && friendsWithDistance.length > 0 && onFriendsWithDistanceChange) {
      prevFriendsWithDistanceRef.current = friendsWithDistance;
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

    // Default fallback - generic location while loading
    return {
      latitude: 14.5995, // Manila, Philippines
      longitude: 120.9842,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation, sharedInitialRegion]);
  
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
  const mapRef = useRef<any>(null);
  
  // Handle friend press - navigate map to friend location (pan only, no zoom)
  const handleFriendPressInternal = useCallback((friend: Friend & { distance: number }) => {
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
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={locationPermissionGranted}
          userLocation={userLocation}
          markers={friendMarkers}
          mapPadding={{ top: 0, right: 0, bottom: 400, left: 0 }}
        />

        {locationPermissionGranted && (
          <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
            <StatusChip
              friendCount={onlineFriendsCount}
              onDropdownPress={() => console.log('Dropdown pressed')}
            />
            <BluetoothIndicator isConnected={isBluetoothConnected} />
          </View>
        )}
      </View>
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
});

