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
  style?: any;
}

export const MapView: React.FC<MapViewProps> = ({
  initialRegion,
  markers = [],
  showsUserLocation = true,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const generateMapHTML = () => {
    const { latitude, longitude, latitudeDelta, longitudeDelta } = initialRegion;
    const center = [latitude, longitude];
    const zoom = Math.round(Math.log(360 / longitudeDelta) / Math.LN2);

    const markersJSON = JSON.stringify(
      markers.map((marker) => ({
        id: marker.id,
        lat: marker.coordinate.latitude,
        lng: marker.coordinate.longitude,
        name: marker.name,
        status: marker.status || '',
      }))
    );

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
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map', {
              center: [${center[0]}, ${center[1]}],
              zoom: ${zoom},
              zoomControl: true,
              attributionControl: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap'
            }).addTo(map);

            const markers = ${markersJSON};
            
            ${showsUserLocation ? `
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const userPos = [position.coords.latitude, position.coords.longitude];
                    L.circleMarker(userPos, {
                      radius: 8,
                      fillColor: '#4285F4',
                      color: '#ffffff',
                      weight: 2,
                      fillOpacity: 1
                    }).addTo(map).bindPopup('Your Location');
                    map.setView(userPos, ${zoom});
                  },
                  () => {}
                );
              }
            ` : ''}

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

