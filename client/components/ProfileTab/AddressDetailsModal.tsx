import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AddressDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  initialAddress: {
    address: string;
    coordinates: { lat: number; lng: number };
    postalCode?: string; // Postal code from geocoding if available
  };
  onSave: (address: {
    address: string;
    coordinates: { lat: number; lng: number };
    details: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }) => void;
}

interface AddressDetails {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export const AddressDetailsModal: React.FC<AddressDetailsModalProps> = ({
  visible,
  onClose,
  initialAddress,
  onSave,
}) => {
  const [addressDetails, setAddressDetails] = useState<AddressDetails>(() => {
    // Initialize with empty fields, we'll populate from initialAddress in useEffect
    return {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ref to track last parsed address to prevent excessive logging
  const lastParsedAddressRef = React.useRef<string>('');

  // Extract address components from initial address if possible
  React.useEffect(() => {
    if (initialAddress.address) {
      const parts = initialAddress.address.split(',').map(part => part.trim());

      // Only log once per unique address to avoid spam
      const addressKey = `${initialAddress.address}-${initialAddress.postalCode || ''}`;
      if (addressKey === lastParsedAddressRef.current) {
        return; // Already parsed this address
      }
      lastParsedAddressRef.current = addressKey;

      console.log('AddressDetailsModal - parsing address:', initialAddress.address);
      console.log('AddressDetailsModal - address parts:', parts);
      console.log('AddressDetailsModal - postal code from geocoding:', initialAddress.postalCode);

      // Function to validate if a string looks like a valid address component
      const isValidAddressPart = (part: string) => {
        if (!part || !part.trim()) return false;
        const trimmed = part.trim();
        // Skip parts that are just coordinates (latitude,longitude format)
        if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(trimmed)) return false;
        // Skip parts that are too short or look like postal codes
        if (trimmed.length < 2) return false;
        return true;
      };

      // Filter valid parts
      const validParts = parts.filter(isValidAddressPart);

      // For home address selection, street should ALWAYS be empty
      // Users select general locations, not specific street addresses
      let street = ''; // Always empty for home address selection
      let city = '';
      let state = '';
      let postalCode = initialAddress.postalCode || '';
      let country = '';

      if (validParts.length === 0) {
        // No valid parts, leave everything empty
      } else if (validParts.length === 1) {
        // Only one part - could be city or country
        const part = validParts[0];
        if (part.length === 2 && part === part.toUpperCase()) {
          country = part; // Likely country code
        } else {
          city = part; // Likely city name
        }
      } else if (validParts.length === 2) {
        // Two parts: [city, country]
        city = validParts[0];
        country = validParts[1];
      } else if (validParts.length === 3) {
        // Three parts: [city, region/state, country]
        // For example: "San Isidro, Davao Oriental, Philippines"
        city = validParts[0];
        state = validParts[1];
        country = validParts[2];
      } else if (validParts.length >= 4) {
        // Four or more parts: [street/address, city, region/state, country, ...]
        // For example: "Quezon Boulevard, Manila, Metro Manila, Philippines"
        // For home address selection, treat first part as part of location, not separate street
        city = validParts[1]; // Second part is typically the city
        state = validParts[2]; // Third part is typically the region/state
        country = validParts[3]; // Fourth part is typically the country
      }

      console.log('AddressDetailsModal - parsed components:', {
        street,
        city,
        state,
        country,
        postalCode
      });

      setAddressDetails({
        street,
        city,
        state,
        country,
        postalCode,
      });
    }
  }, [initialAddress.address, initialAddress.postalCode]); // More specific dependencies

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!addressDetails.street.trim()) {
      newErrors.street = 'Street is required';
    }

    if (!addressDetails.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!addressDetails.state.trim()) {
      newErrors.state = 'State/Province is required';
    }

    if (!addressDetails.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!addressDetails.postalCode.trim()) {
      newErrors.postalCode = 'Postal Code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof AddressDetails, value: string) => {
    setAddressDetails(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const fullAddress = [
      addressDetails.street,
      addressDetails.city,
      addressDetails.state,
      addressDetails.postalCode,
      addressDetails.country,
    ]
      .filter(part => part && part.trim() !== '')
      .join(', ');

    onSave({
      address: fullAddress,
      coordinates: initialAddress.coordinates,
      details: addressDetails,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Address Details</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.instructionText}>
            Please verify and complete your address details
          </Text>

          {/* Street Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Street *</Text>
            <TextInput
              style={[styles.fieldInput, errors.street && styles.fieldInputError]}
              value={addressDetails.street}
              onChangeText={(value) => handleChange('street', value)}
              placeholder="Enter street address"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="words"
              autoCorrect={true}
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
          </View>

          {/* City Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>City *</Text>
            <TextInput
              style={[styles.fieldInput, errors.city && styles.fieldInputError]}
              value={addressDetails.city}
              onChangeText={(value) => handleChange('city', value)}
              placeholder="Enter city"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="words"
              autoCorrect={true}
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* State/Province Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>State/Province *</Text>
            <TextInput
              style={[styles.fieldInput, errors.state && styles.fieldInputError]}
              value={addressDetails.state}
              onChangeText={(value) => handleChange('state', value)}
              placeholder="Enter state or province"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="words"
              autoCorrect={true}
            />
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>

          {/* Country Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Country *</Text>
            <TextInput
              style={[styles.fieldInput, errors.country && styles.fieldInputError]}
              value={addressDetails.country}
              onChangeText={(value) => handleChange('country', value)}
              placeholder="Enter country"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="words"
              autoCorrect={true}
            />
            {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
          </View>

          {/* Postal Code Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Postal Code *</Text>
            <TextInput
              style={[styles.fieldInput, errors.postalCode && styles.fieldInputError]}
              value={addressDetails.postalCode}
              onChangeText={(value) => handleChange('postalCode', value)}
              placeholder="Enter postal code"
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL * 3,
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: SPACING.LG,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: COLORS.BACKGROUND_WHITE,
  },
  fieldInputError: {
    borderColor: COLORS.ERROR,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: SPACING.XS,
  },
});

export default AddressDetailsModal;