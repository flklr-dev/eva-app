import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Marker {
  id: string;
  coordinate: LatLng;
  name: string;
  status?: string;
  profilePicture?: string;
}

interface MapViewProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Marker[];
  showsUserLocation?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  userProfilePicture?: string;
  userName?: string;
  style?: any;
  mapPadding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export const MapView = React.memo(React.forwardRef<any, MapViewProps>((
  {
    initialRegion,
    markers = [],
    showsUserLocation = true,
    userLocation = null,
    userProfilePicture,
    userName = 'You',
    style,
    mapPadding,
  },
  ref
) => {
  const webViewRef = useRef<WebView>(null);
  
  // Expose WebView ref to parent
  React.useImperativeHandle(ref, () => webViewRef.current);

  const generateMapHTML = () => {
    // Use user location if available, otherwise use initial region
    const centerLocation = userLocation || initialRegion;
    const center = [centerLocation.latitude, centerLocation.longitude];
    const zoom = Math.round(Math.log(360 / initialRegion.longitudeDelta) / Math.LN2);

    const markersJSON = JSON.stringify(
      markers.map((marker) => ({
        id: marker.id,
        lat: marker.coordinate.latitude,
        lng: marker.coordinate.longitude,
        name: marker.name,
        status: marker.status || '',
        profilePicture: marker.profilePicture || '',
      }))
    );

    const padding = mapPadding ? JSON.stringify({
      top: mapPadding.top || 0,
      right: mapPadding.right || 0,
      bottom: mapPadding.bottom || 0,
      left: mapPadding.left || 0
    }) : 'null';

    const userLocationScript = userLocation && showsUserLocation ? `
      const userPos = [${userLocation.latitude}, ${userLocation.longitude}];
      
      // Create user marker with profile picture or initials
      const userName = '${userName.replace(/'/g, "\\'")}';
      const userProfilePicUrl = '${userProfilePicture || ''}';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      
      // Create custom icon for user marker with blue border
      let userIconHtml = '';
      if (userProfilePicUrl) {
        userIconHtml = '<div class="profile-marker" style="border-color: #4285F4;">' +
          '<img src="' + userProfilePicUrl + '" alt="' + userName + '" onerror="this.style.display=' + "'none'; this.nextElementSibling.style.display='flex';" + '" />' +
          '<div class="profile-fallback" style="display:none; background: #4285F4;">' + userInitials + '</div>' +
          '</div>';
      } else {
        userIconHtml = '<div class="profile-marker" style="border-color: #4285F4;">' +
          '<div class="profile-fallback" style="display:flex; background: #4285F4;">' + userInitials + '</div>' +
          '</div>';
      }
      
      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
      
      const userMarker = L.marker(userPos, { icon: userIcon })
        .addTo(map)
        .bindPopup('Your Location');
      
      // Focus on user location (default view for LocationTab)
      map.setView(userPos, ${zoom});
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, #map { width: 100%; height: 100%; }
            .leaflet-container { background: #f0f4f8; }
            /* Hide tile borders/grid lines - especially for Android */
            .leaflet-tile-container img {
              outline: none !important;
              border: none !important;
            }
            .leaflet-tile {
              outline: none !important;
              border: none !important;
              filter: none;
            }
            .leaflet-tile-pane {
              opacity: 1;
            }
            /* Prevent gaps between tiles */
            .leaflet-fade-anim .leaflet-tile {
              -webkit-transition: none;
              transition: none;
            }
            /* Profile marker styles */
            .custom-marker {
              background: transparent;
              border: none;
            }
            .profile-marker {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              overflow: hidden;
              border: 3px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              background: #34D399;
              position: relative;
            }
            .profile-marker img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .profile-fallback {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              color: #ffffff;
              background: #34D399;
            }
            .profile-marker.highlighted {
              border: 4px solid #10B981;
              box-shadow: 0 4px 16px rgba(16, 185, 129, 0.5);
              width: 48px;
              height: 48px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map', {
              center: [${center[0]}, ${center[1]}],
              zoom: ${zoom},
              zoomControl: false,
              attributionControl: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap'
            }).addTo(map);

            const markers = ${markersJSON};
            
            ${userLocationScript}

            markers.forEach(marker => {
              // Create profile picture marker with divIcon
              const initials = marker.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
              const profilePicUrl = marker.profilePicture;
              
              // Create custom icon with profile picture or initials
              let iconHtml = '';
              if (profilePicUrl) {
                iconHtml = '<div class="profile-marker">' +
                  '<img src="' + profilePicUrl + '" alt="' + marker.name + '" onerror="this.style.display=' + "'none'; this.nextElementSibling.style.display='flex';" + '" />' +
                  '<div class="profile-fallback" style="display:none;">' + initials + '</div>' +
                  '</div>';
              } else {
                iconHtml = '<div class="profile-marker">' +
                  '<div class="profile-fallback" style="display:flex;">' + initials + '</div>' +
                  '</div>';
              }
              
              const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20]
              });
              
              L.marker([marker.lat, marker.lng], { icon: icon })
                .addTo(map)
                .bindPopup('<b>' + marker.name + '</b>');
            });
          </script>
        </body>
      </html>
    `;
  };

  // Update map when userLocation changes - use injectJavaScript instead of reload
  // This prevents white screen flashes and improves performance
  useEffect(() => {
    if (webViewRef.current && userLocation && showsUserLocation) {
      // Instead of reloading, update the user marker position dynamically
      const updateScript = `
        (function() {
          // Remove existing user marker if any (check for both old CircleMarker and new divIcon marker)
          map.eachLayer(function(layer) {
            if ((layer instanceof L.CircleMarker && layer.options.fillColor === '#4285F4') ||
                (layer instanceof L.Marker && layer.options.icon && 
                 layer.options.icon.options.html && 
                 layer.options.icon.options.html.includes('border-color: #4285F4'))) {
              map.removeLayer(layer);
            }
          });
          
          // Add new user marker at updated location with profile picture
          const userPos = [${userLocation.latitude}, ${userLocation.longitude}];
          const userName = '${userName.replace(/'/g, "\\'")}';
          const userProfilePicUrl = '${userProfilePicture || ''}';
          const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
          
          // Create custom icon for user marker with blue border
          let userIconHtml = '';
          if (userProfilePicUrl) {
            userIconHtml = '<div class="profile-marker" style="border-color: #4285F4;">' +
              '<img src="' + userProfilePicUrl + '" alt="' + userName + '" onerror="this.style.display=' + "'none'; this.nextElementSibling.style.display='flex';" + '" />' +
              '<div class="profile-fallback" style="display:none; background: #4285F4;">' + userInitials + '</div>' +
              '</div>';
          } else {
            userIconHtml = '<div class="profile-marker" style="border-color: #4285F4;">' +
              '<div class="profile-fallback" style="display:flex; background: #4285F4;">' + userInitials + '</div>' +
              '</div>';
          }
          
          const userIcon = L.divIcon({
            html: userIconHtml,
            className: 'custom-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
          });
          
          L.marker(userPos, { icon: userIcon })
            .addTo(map)
            .bindPopup('Your Location');
          
          // Pan to new location smoothly (no zoom change)
          map.panTo(userPos, { animate: true, duration: 0.5 });
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [userLocation, showsUserLocation, userProfilePicture, userName]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={Platform.OS === 'android'}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Prevent WebView from reloading on prop changes
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        // Improve Android performance
        androidLayerType="hardware"
        mixedContentMode="always"
      />
    </View>
  );
}));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

