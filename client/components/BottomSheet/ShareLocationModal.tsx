import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface ShareLocationModalProps {
  visible: boolean;
  isEnabled: boolean; // true if user is turning it ON, false if turning it OFF
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Share Location Modal - Informs user what happens when they toggle location sharing
 */
export const ShareLocationModal: React.FC<ShareLocationModalProps> = ({
  visible,
  isEnabled,
  onConfirm,
  onCancel,
}) => {
  const title = isEnabled 
    ? 'Share Your Location?' 
    : 'Stop Sharing Location?';
  
  const message = isEnabled
    ? 'Your friends will be able to see your current location. Your location will update automatically every minute while this is enabled.'
    : 'Your friends will only see your last known location. Your location will no longer update automatically.';

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
                {isEnabled ? 'Share Location' : 'Stop Sharing'}
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
    marginBottom: 24,
    textAlign: 'center',
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

