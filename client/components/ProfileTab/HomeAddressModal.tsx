import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { MapView, LatLng } from '../MapView';
import AddressDetailsModal from './AddressDetailsModal';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface AddressDetails {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface HomeAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (address: { 
    address: string; 
    coordinates: { lat: number; lng: number };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }) => void;
  currentAddress?: { 
    address: string; 
    coordinates: { lat: number; lng: number };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

const { width, height } = Dimensions.get('window');

export const HomeAddressModal: React.FC<HomeAddressModalProps> = ({
  visible,
  onClose,
  onSave,
  currentAddress,
}) => {
  // Dynamic initial region that updates based on available data
  const [initialRegion, setInitialRegion] = useState<Region>(() => {
    if (currentAddress) {
      // For existing addresses, use the saved location
      return {
        latitude: currentAddress.coordinates.lat,
        longitude: currentAddress.coordinates.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else {
      // For new addresses, use a neutral location - will be updated when location is obtained
      return {
        latitude: 14.5995, // Manila as temporary default
        longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
      };
    }
  });

  // Dynamic region for tracking current map position
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion);
  
  // Define AddressDetails type locally
  interface AddressDetails {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }
  const [address, setAddress] = useState(currentAddress?.address || '');
  const [postalCode, setPostalCode] = useState(currentAddress?.details?.postalCode || '');
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(!!currentAddress); // Set to true if we have current address
  const [locationPermission, setLocationPermission] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<any>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      console.log('HomeAddressModal: Modal opened, currentAddress:', !!currentAddress);
      checkLocationPermission();
      if (currentAddress) {
        console.log('HomeAddressModal: Editing existing address');
        const addressRegion = {
          latitude: currentAddress.coordinates.lat,
          longitude: currentAddress.coordinates.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentRegion(addressRegion);
        setAddress(currentAddress.address);
        // Map is ready since we have the current address
        setMapReady(true);

        // For existing addresses, the map will render with correct initialRegion
        console.log('HomeAddressModal: Map will render with existing address region');
      } else {
        console.log('HomeAddressModal: Setting new home address, getting current location');
        // Keep map not ready until we get current location
        setMapReady(false);
        // getCurrentLocation will set mapReady to true when complete
        getCurrentLocation();
      }
    } else {
      // Reset state when modal is closed
      setMapReady(!!currentAddress);
    }
    
    // Cleanup function
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [visible]);

  const checkLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const getCurrentLocation = async () => {
    try {
      console.log('HomeAddressModal: Getting current location...');
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('HomeAddressModal: Got current location:', location.coords);

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentRegion(newRegion);
      // Update initialRegion so MapView renders with correct location
      setInitialRegion(newRegion);
      
      // For immediate geocoding of current location, call it directly without debouncing
      reverseGeocodeLocationImmediate(location.coords.latitude, location.coords.longitude);
      
      // Mark map as ready - it will render with the correct initialRegion
      setMapReady(true);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Unable to get your current location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocodeLocationImmediate = async (latitude: number, longitude: number) => {
    try {
      setReverseGeocoding(true);
      const geocodeResult = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (geocodeResult && geocodeResult.length > 0) {
        const result = geocodeResult[0];
        console.log('Geocoding result:', result);

        const { name, street, city, region, country, postalCode } = result;

        // Store postal code separately if available
        const extractedPostalCode = postalCode || '';

        // Function to check if a string looks like a postal code
        const isPostalCode = (str: string) => {
          if (!str || !str.trim()) return false;
          // Remove spaces and check if it looks like a postal code pattern
          const clean = str.replace(/\s/g, '');
          return /^\d{3,10}$/.test(clean) || // Numeric postal codes (3-10 digits)
                 /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(clean.toUpperCase()) || // Canadian format: A1A 1A1
                 /^\d{5}(-\d{4})?$/.test(clean) || // US ZIP codes: 12345 or 12345-6789
                 /^\d{4}$/.test(clean); // Some countries use 4-digit codes
        };

        // Clean address parts by removing any that look like postal codes
        const cleanAddressPart = (part: string | null) => {
          if (!part || !part.trim()) return '';
          const trimmed = part.trim();
          return isPostalCode(trimmed) ? '' : trimmed;
        };

        // Build address prioritizing meaningful location data
        // Filter out postal codes from address parts to prevent confusion
        const addressParts = [];

        // Clean and use street if available and not a postal code, otherwise name
        const cleanStreet = cleanAddressPart(street);
        const cleanName = cleanAddressPart(name);

        if (cleanStreet) {
          addressParts.push(cleanStreet);
        } else if (cleanName) {
          addressParts.push(cleanName);
        }

        // Add city if available and not a postal code
        const cleanCity = cleanAddressPart(city);
        if (cleanCity) {
          addressParts.push(cleanCity);
        }

        // Add region/state if available and not a postal code
        const cleanRegion = cleanAddressPart(region);
        if (cleanRegion) {
          addressParts.push(cleanRegion);
        }

        // Add country if available and not a postal code
        const cleanCountry = cleanAddressPart(country);
        if (cleanCountry) {
          addressParts.push(cleanCountry);
        }

        const fullAddress = addressParts.join(', ') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        console.log('Built address:', fullAddress, 'Postal code:', extractedPostalCode);
        console.log('Cleaned parts:', { cleanStreet, cleanName, cleanCity, cleanRegion, cleanCountry });

        // Update both address and postal code
        setAddress(fullAddress);
        setPostalCode(extractedPostalCode);
      }
    } catch (error) {
      console.error('Error reverse geocoding location:', error);
      // Use coordinates as fallback
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setPostalCode('');
    } finally {
      setReverseGeocoding(false);
    }
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    // Clear any existing timeout to debounce the call
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    
    // Set a new timeout to delay the geocoding call
    geocodeTimeoutRef.current = setTimeout(async () => {
      reverseGeocodeLocationImmediate(latitude, longitude);
    }, 500); // 500ms debounce delay
  };

  const handleRegionChange = (newRegion: Region) => {
    setCurrentRegion(newRegion);
    // Automatically update address when user moves the map
    reverseGeocodeLocation(newRegion.latitude, newRegion.longitude);
  };

  const [showAddressDetailsModal, setShowAddressDetailsModal] = useState(false);
  
  const handleNext = () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please select a location or enter an address');
      return;
    }

    setShowAddressDetailsModal(true);
  };
  
  const handleAddressDetailsSave = (addressWithDetails: { 
    address: string; 
    coordinates: { lat: number; lng: number };
    details: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }) => {
    onSave(addressWithDetails);
    setShowAddressDetailsModal(false); // Close the address details modal
    onClose(); // Close the home address modal
  };

  const handleCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location permissions to use your current location.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() }, // Use Linking instead of Location.openSettings
        ]
      );
      return;
    }

    getCurrentLocation();
  };

  return (
    <>
      <Modal
        visible={visible && !showAddressDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Set Home Address</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.saveButton} onPress={handleNext}>
                <Text style={styles.saveButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Map View */}
          <View style={styles.mapContainer}>
            {loading || !mapReady ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>Getting your location...</Text>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                initialRegion={initialRegion}
                showsUserLocation={false}
                style={styles.map}
                onRegionChange={handleRegionChange}
              />
            )}

            {/* Center Pin */}
            <View style={styles.centerPin}>
              <MaterialCommunityIcons name="map-marker" size={40} color={COLORS.PRIMARY} />
            </View>

            {/* Address Preview */}
            <View style={styles.addressPreview}>
              <Text style={styles.addressPreviewText} numberOfLines={2}>
                {reverseGeocoding ? 'Getting address...' : address || 'Select a location on the map'}
              </Text>
            </View>

            {/* Current Location Button */}
            <TouchableOpacity style={styles.currentLocationButton} onPress={handleCurrentLocation}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <AddressDetailsModal
        visible={showAddressDetailsModal}
        onClose={() => setShowAddressDetailsModal(false)}
        initialAddress={{
          address: address,
          coordinates: {
            lat: currentRegion.latitude,
            lng: currentRegion.longitude,
          },
          postalCode: postalCode,
        }}
        onSave={handleAddressDetailsSave}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER_LIGHT,
  },
  closeButton: {
    padding: SPACING.SM,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerRight: {
    width: 60, // Match the width of the close button for alignment
    alignItems: 'flex-end',
    paddingRight: SPACING.XS,
  },
  saveButton: {
    padding: SPACING.SM,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF', // Blue color
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_WHITE,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -40 }],
    zIndex: 1,
  },
  addressPreview: {
    position: 'absolute',
    bottom: SPACING.XL * 3,
    left: SPACING.MD,
    right: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...Platform.OS === 'ios' 
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 } 
      : { elevation: 4 },
  },
  addressPreviewText: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: SPACING.XL * 5,
    right: SPACING.MD,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.OS === 'ios' 
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 } 
      : { elevation: 6 },
  },
});

export default HomeAddressModal;