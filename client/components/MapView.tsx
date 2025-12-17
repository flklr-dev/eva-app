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
  style?: any;
  mapPadding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export const MapView = React.forwardRef<any, MapViewProps>(({
  initialRegion,
  markers = [],
  showsUserLocation = true,
  userLocation = null,
  style,
  mapPadding,
}, ref) => {
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
      const userMarker = L.circleMarker(userPos, {
        radius: 10,
        fillColor: '#4285F4',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
      }).addTo(map).bindPopup('Your Location');
      
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
              L.circleMarker([marker.lat, marker.lng], {
                radius: 10,
                fillColor: '#34D399',
                color: '#ffffff',
                weight: 2,
                fillOpacity: 1
              }).addTo(map).bindPopup('<b>' + marker.name + '</b><br>' + (marker.status || ''));
            });
          </script>
        </body>
      </html>
    `;
  };

  // Update map when userLocation changes
  useEffect(() => {
    if (webViewRef.current && userLocation) {
      // Reload the map with new user location
      webViewRef.current.reload();
    }
  }, [userLocation]);

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
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

