import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AddToHomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save address');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* EVA Brand Text - Top Center */}
      <Text style={[styles.evaBrand, { top: insets.top + 20 }]}>EVA</Text>

      {/* Title */}
      <Text style={[styles.title, { top: insets.top + 100 }]}>Add to your home</Text>

      {/* Address Field */}
      <View style={[styles.addressFieldWrapper, { marginTop: insets.top + 160 }]}>
        <Text style={styles.fieldLabel}>ADDRESS</Text>
        <View style={styles.fieldSeparator} />
        <Text style={styles.addressText}>Waterlandplein 255 Amsterdam 1025 GB</Text>
      </View>

      {/* Safe Button - Bottom */}
      <TouchableOpacity 
        style={[styles.safeButton, { bottom: insets.bottom + SPACING.XL }]} 
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Text style={styles.safeButtonText}>Safe</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    paddingHorizontal: SPACING.MD,
  },
  evaBrand: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: 'Helvetica',
    zIndex: 1,
  },
  title: {
    position: 'absolute',
    left: SPACING.MD,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    zIndex: 1,
  },
  addressFieldWrapper: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636366',
    textTransform: 'uppercase',
    marginBottom: SPACING.SM,
  },
  fieldSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_LIGHT,
    width: '100%',
    marginBottom: SPACING.MD,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
  },
  safeButton: {
    position: 'absolute',
    left: SPACING.MD,
    right: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND_WHITE,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.MD,
  },
  safeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
});

