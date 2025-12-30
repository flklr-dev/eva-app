import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapView } from '../MapView';
import { StatusChip } from '../LocationTab/StatusChip';
import { BluetoothIndicator } from '../LocationTab/BluetoothIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Friend } from '../../types/friends';
import { calculateDistance } from '../../utils/distanceCalculator';
import { useAuth } from '../../context/AuthContext';

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
  resetMapView: () => void;
  showRoute: (startLocation: { latitude: number; longitude: number }, endLocation: { latitude: number; longitude: number }, mode: string) => void;
  clearRoute: () => void;
}

/**
 * Friends Tab - Displays map with friend locations
 */
export const FriendsTab = React.forwardRef<FriendsTabRef, FriendsTabProps>((
  {
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
  },
  ref
) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
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
    // Get screen height for responsive offset calculation
    const { height: screenHeight } = require('react-native').Dimensions.get('window');
    
    // Calculate responsive vertical offset based on screen size
    // For smaller screens (< 700px): use smaller offset (0.012)
    // For medium screens (700-900px): use medium offset (0.015)
    // For larger screens (> 900px): use larger offset (0.018)
    const verticalOffset = screenHeight < 700 ? 0.012 : screenHeight < 900 ? 0.015 : 0.018;
    
    // Always use shared initial region if provided (same zoom as Home screen)
    if (sharedInitialRegion) {
      return {
        latitude: sharedInitialRegion.latitude + verticalOffset, // Shift north slightly to avoid friends list
        longitude: sharedInitialRegion.longitude,
        latitudeDelta: sharedInitialRegion.latitudeDelta, // Same zoom as Home screen
        longitudeDelta: sharedInitialRegion.longitudeDelta, // Same zoom as Home screen
      };
    }

    // Fallback: use same zoom level as Home screen
    if (userLocation) {
      return {
        latitude: userLocation.latitude + verticalOffset, // Shift north slightly to avoid friends list
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
      profilePicture: friend.profilePicture,
    }));
  }, [friends, friendsWithDistance]);
  
  // Map ref for navigation
  const mapRef = useRef<any>(null);
  
  // Track last selected friend to prevent zoom accumulation
  const lastSelectedFriendRef = useRef<string | null>(null);
  
  // Reset map view to show all friends
  const resetMapView = useCallback(() => {
    if (mapRef.current) {
      // Clear last selected friend when resetting
      lastSelectedFriendRef.current = null;
      
      // Calculate the same offset as used in initialRegion to maintain consistency with app's default position
      // This matches the offset used when the app first loads (for friends list spacing)
      const screenHeight = require('react-native').Dimensions.get('window').height;
      
      // Calculate the same vertical offset as used in initialRegion
      const verticalOffset = screenHeight < 700 ? 0.012 : screenHeight < 900 ? 0.015 : 0.018;
      
      const script = `
        (function() {
          // Restore all friend markers to normal visibility and style
          map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-marker') {
              // Restore marker visibility
              layer.setOpacity(1);
              
              // Remove highlight styling
              var markerElement = layer.getElement();
              if (markerElement) {
                var profileMarker = markerElement.querySelector('.profile-marker');
                if (profileMarker) {
                  profileMarker.classList.remove('highlighted');
                  profileMarker.style.width = '40px';
                  profileMarker.style.height = '40px';
                }
              }
            }
          });
          
          // Pan back to user location if available and restore zoom
          ${userLocation ? `
          // Ensure map is properly initialized before setting view
          if (map && map._container) {
            var defaultZoom = 15; // Default zoom level (matches 0.01 latitudeDelta): Math.round(Math.log(360/0.01)/Math.LN2) = 15
            // Use a smaller offset than initialRegion to position marker higher but still visible
            // This balances between default app position and visibility above bottom navbar
            var verticalOffset = ${verticalOffset};
            // Reduce the offset by approximately 70% to position significantly higher on screen
            var adjustedOffset = verticalOffset * 0.005;
            var targetLat = ${userLocation.latitude} + adjustedOffset;
            var targetLng = ${userLocation.longitude};
            
            // Use setView to immediately position map, ensuring user marker is centered and visible
            map.setView([targetLat, targetLng], defaultZoom);
            
            // Then animate smoothly with flyTo for visual feedback
            map.flyTo([targetLat, targetLng], defaultZoom, {
              animate: true,
              duration: 0.5,
              easeLinearity: 0.25
            });
          }
          ` : ''}
        })();
        true;
      `;
      if (mapRef.current?.webView) {
        mapRef.current.webView.injectJavaScript(script);
      }
    }
  }, [userLocation]);
  
  // Show route between two locations
  const showRoute = useCallback(async (startLocation: { latitude: number; longitude: number }, endLocation: { latitude: number; longitude: number }, mode: string) => {
    if (mapRef.current) {
      console.log('showRoute called with:', { startLocation, endLocation, mode });
      
      // Helper function to draw route on map
      const drawRouteOnMap = (routeCoords: number[][]) => {
        const script = `
          (function() {
            try {
              // Remove existing route elements ONLY (preserve user and friend markers)
              if (window.currentRoute) { map.removeLayer(window.currentRoute); }
              if (window.currentRouteOutline) { map.removeLayer(window.currentRouteOutline); }
              if (window.startMarker) { map.removeLayer(window.startMarker); }
              if (window.endMarker) { map.removeLayer(window.endMarker); }
              
              var routeCoords = ${JSON.stringify(routeCoords)};
              
              // White outline for contrast
              window.currentRouteOutline = L.polyline(routeCoords, {
                color: '#FFFFFF', weight: 10, opacity: 1, lineJoin: 'round', lineCap: 'round'
              }).addTo(map);
              
              // Blue route line
              window.currentRoute = L.polyline(routeCoords, {
                color: '#4285F4', weight: 6, opacity: 1, lineJoin: 'round', lineCap: 'round'
              }).addTo(map);
              
              // Start marker - blue circle with white border (smaller to distinguish from profile pics)
              var markerHtml = '<div style="width: 16px; height: 16px; border-radius: 50%; background-color: #4285F4; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>';
              var startIcon = L.divIcon({ html: markerHtml, className: 'route-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
              window.startMarker = L.marker(routeCoords[0], { icon: startIcon }).addTo(map);
              
              // End marker
              var endIcon = L.divIcon({ html: markerHtml, className: 'route-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
              window.endMarker = L.marker(routeCoords[routeCoords.length - 1], { icon: endIcon }).addTo(map);
              
              // Ensure user marker is visible and on top by recreating it
              // This prevents it from being hidden by route elements
              map.eachLayer(function(layer) {
                if (layer instanceof L.Marker && layer.options.icon && 
                    layer.options.icon.options.html && 
                    layer.options.icon.options.html.includes('border-color: #4285F4')) {
                  // Move user marker to front by removing and re-adding
                  var latlng = layer.getLatLng();
                  var icon = layer.options.icon;
                  var popup = layer.getPopup();
                  map.removeLayer(layer);
                  var newMarker = L.marker(latlng, { icon: icon }).addTo(map);
                  if (popup) newMarker.bindPopup(popup);
                }
              });
              
              // Fit bounds
              var bounds = window.currentRoute.getBounds();
              map.fitBounds(bounds, { padding: [80, 50], maxZoom: 15, animate: true, duration: 0.5 });
              console.log('Route drawn successfully with ' + routeCoords.length + ' points');
            } catch(e) {
              console.error('Error drawing route:', e);
            }
          })();
          true;
        `;
        if (mapRef.current?.webView) {
          mapRef.current.webView.injectJavaScript(script);
        }
      };
      
      // Fetch actual route from OSRM (don't draw straight line as fallback initially)
      try {
        const profile = mode === 'walk' ? 'foot' : 'driving';
        const url = `https://router.project-osrm.org/route/v1/${profile}/${startLocation.longitude},${startLocation.latitude};${endLocation.longitude},${endLocation.latitude}?overview=full&geometries=geojson`;
        
        console.log('Fetching actual route from OSRM with profile:', profile);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        console.log('OSRM response code:', data.code, 'routes count:', data.routes?.length);
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates;
          const routeCoordinates = coordinates.map((coord: number[]) => [coord[1], coord[0]]);
          console.log('Drawing road-based route with', routeCoordinates.length, 'points');
          drawRouteOnMap(routeCoordinates);
        } else {
          console.log('OSRM returned invalid response, drawing straight line fallback');
          const straightLineCoords = [
            [startLocation.latitude, startLocation.longitude],
            [endLocation.latitude, endLocation.longitude]
          ];
          drawRouteOnMap(straightLineCoords);
        }
      } catch (error) {
        console.log('OSRM API failed or timed out:', error);
        // Fallback to straight line if OSRM fails
        const straightLineCoords = [
          [startLocation.latitude, startLocation.longitude],
          [endLocation.latitude, endLocation.longitude]
        ];
        drawRouteOnMap(straightLineCoords);
      }
    } else {
      console.log('mapRef.current is null');
    }
  }, []);
  
  // Clear route from map
  const clearRoute = useCallback(() => {
    if (mapRef.current) {
      const script = `
        (function() {
          if (window.currentRoute) {
            map.removeLayer(window.currentRoute);
            window.currentRoute = null;
          }
          if (window.currentRouteOutline) {
            map.removeLayer(window.currentRouteOutline);
            window.currentRouteOutline = null;
          }
          if (window.startMarker) {
            map.removeLayer(window.startMarker);
            window.startMarker = null;
          }
          if (window.endMarker) {
            map.removeLayer(window.endMarker);
            window.endMarker = null;
          }
        })();
        true;
      `;
      if (mapRef.current?.webView) {
        mapRef.current.webView.injectJavaScript(script);
      }
    }
  }, []);
  
  // Handle friend press - navigate map to friend location with subtle zoom
  const handleFriendPressInternal = useCallback((friend: Friend & { distance: number }) => {
    // Navigate map to friend location with zoom animation
    // Calculate vertical offset based on screen height to account for bottom sheet
    if (mapRef.current && friend.coordinate) {
      // Check if clicking the same friend again
      const isSameFriend = lastSelectedFriendRef.current === friend.id;
      
      // Update last selected friend
      lastSelectedFriendRef.current = friend.id;
      
      // Bottom sheet takes approximately 60% of screen on mobile devices
      // To ensure marker is visible in the upper visible portion, we need to SUBTRACT from latitude
      // (not add) so the map center shifts DOWN, putting the marker UP in the visible area
      const screenHeight = require('react-native').Dimensions.get('window').height;
      
      // Calculate offset - SUBTRACT to shift map DOWN so marker appears UP
      // This positions the marker in the upper visible area above status indicator
      const latOffsetRatio = 0.0025; // Adjusted offset for zoom level 17 (more zoomed in)
      const shiftedLat = friend.coordinate.latitude - latOffsetRatio; // SUBTRACT not add!
      
      const script = `
        (function() {
          // First, hide all friend markers except the selected one
          map.eachLayer(function(layer) {
            if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-marker') {
              var latlng = layer.getLatLng();
              if (Math.abs(latlng.lat - ${friend.coordinate.latitude}) < 0.0001 && 
                  Math.abs(latlng.lng - ${friend.coordinate.longitude}) < 0.0001) {
                // This is the selected friend - highlight it
                var markerElement = layer.getElement();
                if (markerElement) {
                  var profileMarker = markerElement.querySelector('.profile-marker');
                  if (profileMarker) {
                    profileMarker.classList.add('highlighted');
                    profileMarker.style.width = '48px';
                    profileMarker.style.height = '48px';
                  }
                }
                layer.setOpacity(1);
              } else {
                // Hide other friend markers
                layer.setOpacity(0);
              }
            }
          });
          
          // Fixed target zoom levels for consistent behavior
          // Initial zoom is 15 (from Math.round(Math.log(360/0.01)/Math.LN2) = 15 for 0.01 latitudeDelta)
          var defaultZoom = 15; // Default zoom level (matches 0.01 latitudeDelta)
          var friendZoom = 17; // Subtle zoom when focusing on friend (zoom in by 2 levels)
          
          // Determine target zoom based on whether this is the same friend or different
          var targetZoom = friendZoom;
          var isSameFriend = ${isSameFriend};
          
          // If clicking same friend and already at friend zoom, stay at that zoom
          // If clicking different friend or not at friend zoom, zoom to friend level
          var currentZoom = map.getZoom();
          
          // If same friend and already close to target zoom, just pan without zooming
          if (isSameFriend && Math.abs(currentZoom - friendZoom) < 0.5) {
            // Just pan to ensure proper positioning
            map.flyTo([${shiftedLat}, ${friend.coordinate.longitude}], friendZoom, {
              animate: true,
              duration: 0.6,
              easeLinearity: 0.25
            });
          } else {
            // Zoom and pan to friend location (different friend or different zoom level)
            map.flyTo([${shiftedLat}, ${friend.coordinate.longitude}], friendZoom, {
              animate: true,
              duration: 0.8,
              easeLinearity: 0.25
            });
          }
        })();
        true;
      `;
      if (mapRef.current?.webView) {
        mapRef.current.webView.injectJavaScript(script);
      }
    }
  }, []);
  
  // Expose navigation function to parent via ref
  React.useImperativeHandle(ref, () => ({
    navigateToFriend: handleFriendPressInternal,
    resetMapView: resetMapView,
    showRoute: showRoute,
    clearRoute: clearRoute
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
          userProfilePicture={user?.profilePicture}
          userName={user?.name}
          markers={friendMarkers}
          mapPadding={{ top: 0, right: 0, bottom: 60, left: 0 }}
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

