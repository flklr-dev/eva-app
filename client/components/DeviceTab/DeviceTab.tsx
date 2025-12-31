import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapView } from '../MapView';
import { StatusChip } from '../LocationTab/StatusChip';
import { BluetoothIndicator } from '../LocationTab/BluetoothIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Friend } from '../../types/friends';
import { useAuth } from '../../context/AuthContext';

interface DeviceTabProps {
  friends: Friend[];
  isBluetoothConnected: boolean;
  sharedUserLocation?: { latitude: number; longitude: number } | null;
  sharedLocationPermissionGranted?: boolean;
  sharedInitialRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
}

/**
 * Device Tab - Displays same map view as other tabs (no reload)
 */
export const DeviceTab: React.FC<DeviceTabProps> = ({
  friends,
  isBluetoothConnected,
  sharedUserLocation,
  sharedLocationPermissionGranted = false,
  sharedInitialRegion,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Calculate online friends count (same as FriendsTab, ActivityTab, and LocationTab)
  const onlineFriendsCount = useMemo(() => {
    return friends.filter(friend => friend.status === 'online').length;
  }, [friends]);

  // Convert friends to markers (same as other tabs)
  const friendMarkers = friends.map(friend => ({
    id: friend.id,
    coordinate: friend.coordinate,
    name: friend.name,
    status: friend.status,
    profilePicture: friend.profilePicture,
  }));

  // Use shared initial region or fallback
  const initialRegion = sharedInitialRegion || {
    latitude: 14.5995, // Manila, Philippines - generic fallback while loading
    longitude: 120.9842,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.mapWrapper}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={sharedLocationPermissionGranted}
        userLocation={sharedUserLocation}
        userProfilePicture={user?.profilePicture}
        userName={user?.name}
        markers={friendMarkers}
      />

      {sharedLocationPermissionGranted && (
        <View style={[styles.overlayTop, { top: insets.top + 8 }]}>
          <StatusChip
            friendCount={onlineFriendsCount}
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

