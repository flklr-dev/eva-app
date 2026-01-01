import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface ShareWithEveryoneModalProps {
  visible: boolean;
  isEnabled: boolean; // true if user is turning it ON, false if turning it OFF
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Share With Everyone Modal - Informs user about privacy implications
 */
export const ShareWithEveryoneModal: React.FC<ShareWithEveryoneModalProps> = ({
  visible,
  isEnabled,
  onConfirm,
  onCancel,
}) => {
  const title = isEnabled 
    ? 'Share with Everyone on EVA?' 
    : 'Stop Sharing with Everyone?';
  
  const message = isEnabled
    ? 'Your location will be visible to anyone using EVA Alert within 5 kilometers, even if you\'re not friends. SOS alerts will also be sent to nearby users. This helps create a safer community network.'
    : 'Your location will only be visible to your friends. SOS alerts will only be sent to your friends.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, Platform.OS === 'android' && styles.modalContentAndroid]}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          
          {isEnabled && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Privacy Note: Anyone nearby can see your location. Only enable this if you're comfortable sharing your location with strangers in your area.
              </Text>
            </View>
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButtonCancel} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButtonConfirm, isEnabled && styles.modalButtonConfirmEnabled]} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextConfirm}>
                {isEnabled ? 'Enable' : 'Disable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY_DARK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.BACKGROUND_WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: 24,
    width: width - 80,
    maxWidth: 320,
    ...Platform.select({
      ios: {
        ...SHADOWS.LG,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalContentAndroid: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: BORDER_RADIUS.SM,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirmEnabled: {
    backgroundColor: COLORS.SUCCESS,
  },
  modalButtonTextCancel: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: COLORS.BACKGROUND_WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});


