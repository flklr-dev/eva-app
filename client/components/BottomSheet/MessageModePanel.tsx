import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HomeStatus } from '../../types/quickActions';
import { COLORS, BORDER_RADIUS, SPACING, SIZES } from '../../constants/theme';

interface MessageModePanelProps {
  onSendHomeStatus: (statusType: HomeStatus) => void;
}

interface MessageRowProps {
  iconName: string;
  label: string;
  statusType: HomeStatus;
  onPress: (statusType: HomeStatus) => void;
  iconContainerStyle?: any;
}

const MessageRow: React.FC<MessageRowProps> = ({
  iconName,
  label,
  statusType,
  onPress,
  iconContainerStyle,
}) => (
  <View style={styles.homeSettingRow}>
    {iconContainerStyle ? (
      <View style={iconContainerStyle}>
        <MaterialCommunityIcons name={iconName as any} size={SIZES.ICON_MD} color={COLORS.TEXT_PRIMARY} />
      </View>
    ) : (
      <MaterialCommunityIcons name={iconName as any} size={SIZES.ICON_MD} color={COLORS.TEXT_PRIMARY} />
    )}
    <Text style={styles.homeSettingLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.sendButton}
      onPress={() => onPress(statusType)}
      activeOpacity={0.7}
    >
      <View style={styles.sendIconContainer}>
        <MaterialCommunityIcons name="send" size={SIZES.ICON_SM} color={COLORS.BACKGROUND_WHITE} />
      </View>
    </TouchableOpacity>
  </View>
);

/**
 * Message Mode Panel - Displays message options (Arrived Home, Walking Home, etc.)
 */
export const MessageModePanel: React.FC<MessageModePanelProps> = ({ onSendHomeStatus }) => {
  return (
    <View style={styles.homeSettingsContainer}>
      <View style={styles.homeSettingsHeader}>
        <Text style={styles.homeSettingsTitle}>Message</Text>
      </View>

      <MessageRow
        iconName="home-variant"
        label="Arrived Home"
        statusType="arrived"
        onPress={onSendHomeStatus}
        iconContainerStyle={styles.homeIconContainer}
      />

      <MessageRow
        iconName="walk"
        label="Walking Home"
        statusType="walking"
        onPress={onSendHomeStatus}
      />

      <MessageRow
        iconName="bike"
        label="Biking Away"
        statusType="biking"
        onPress={onSendHomeStatus}
      />

      <MessageRow
        iconName="map-marker"
        label="On My Way"
        statusType="onMyWay"
        onPress={onSendHomeStatus}
        iconContainerStyle={styles.locationIconContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  homeSettingsContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: SPACING.MD,
  },
  homeSettingsHeader: {
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  homeSettingsTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  homeSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.OVERLAY_WHITE,
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: 14,
    paddingHorizontal: SPACING.MD,
    marginBottom: 12,
    minHeight: 56,
  },
  homeSettingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.TEXT_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    marginRight: 0,
    marginLeft: 2,
  },
  homeIconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  locationIconContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

