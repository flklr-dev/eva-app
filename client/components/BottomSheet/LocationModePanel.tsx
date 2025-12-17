import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ToggleSwitch } from '../ToggleSwitch';
import { COLORS, BORDER_RADIUS, SPACING } from '../../constants/theme';

interface LocationModePanelProps {
  shareMyLocation: boolean;
  shareWithEveryone: boolean;
  onToggleShareMyLocation: (value: boolean) => void;
  onToggleShareWithEveryone: (value: boolean) => void;
}

/**
 * Location Mode Panel - Displays location sharing settings
 */
export const LocationModePanel: React.FC<LocationModePanelProps> = ({
  shareMyLocation,
  shareWithEveryone,
  onToggleShareMyLocation,
  onToggleShareWithEveryone,
}) => {
  return (
    <View style={styles.locationSettingsContainer}>
      <View style={styles.locationSettingsHeader}>
        <Text style={styles.locationSettingsTitle}>My location</Text>
      </View>

      {/* Share My Location Toggle */}
      <View style={styles.locationSettingRow}>
        <Text style={[styles.locationSettingLabel, styles.locationSettingLabelSingle]}>
          Share my location
        </Text>
        <ToggleSwitch value={shareMyLocation} onValueChange={onToggleShareMyLocation} />
      </View>

      {/* Share with Everyone Toggle */}
      <View style={styles.locationSettingRow}>
        <View style={styles.locationSettingTextContainer}>
          <Text style={styles.locationSettingLabel}>Share with everyone on eva</Text>
          <Text style={styles.locationSettingSubtitle}>
            Send Also SOS alert with everyone
          </Text>
        </View>
        <ToggleSwitch value={shareWithEveryone} onValueChange={onToggleShareWithEveryone} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  locationSettingsContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: SPACING.MD,
  },
  locationSettingsHeader: {
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  locationSettingsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  locationSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: 14,
    paddingHorizontal: SPACING.MD,
    marginBottom: 12,
    minHeight: 56,
    ...Platform.select({
      ios: {
        backgroundColor: COLORS.OVERLAY_WHITE,
      },
      android: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      },
      default: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
      },
    }),
  },
  locationSettingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  locationSettingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  locationSettingLabelSingle: {
    marginBottom: 0,
  },
  locationSettingSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
});

