import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapView } from '../MapView';
import { StatusChip } from '../LocationTab/StatusChip';
import { BluetoothIndicator } from '../LocationTab/BluetoothIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Friend } from '../../types/friends';

interface ActivityTabProps {
  friends: Friend[];
  isBluetoothConnected: boolean;
  sharedUserLocation?: { latitude: number; longitude: number } | null;
  sharedLocationPermissionGranted?: boolean;
  sharedInitialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

/**
 * Activity Tab - Displays same map view as other tabs (no reload)
 */
export const ActivityTab: React.FC<ActivityTabProps> = ({
  friends,
  isBluetoothConnected,
  sharedUserLocation,
  sharedLocationPermissionGranted = false,
  sharedInitialRegion,
}) => {
  const insets = useSafeAreaInsets();

  // Convert friends to markers (same as other tabs)
  const friendMarkers = friends.map(friend => ({
    id: friend.id,
    coordinate: friend.coordinate,
    name: friend.name,
    status: friend.status,
  }));

  // Use shared initial region or fallback
  const initialRegion = sharedInitialRegion || {
    latitude: 6.950,
    longitude: 126.220,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.mapWrapper}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={sharedLocationPermissionGranted}
        userLocation={sharedUserLocation}
        markers={friendMarkers}
      />

      {sharedLocationPermissionGranted && (
        <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
          <StatusChip
            friendCount={friends.length}
            onDropdownPress={() => console.log('Dropdown pressed')}
          />
          <BluetoothIndicator isConnected={isBluetoothConnected} />
        </View>
      )}
    </View>
  );
};

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

