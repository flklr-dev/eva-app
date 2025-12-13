import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface LocationPermissionModalProps {
  visible: boolean;
  message: string;
  onRequestClose: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

/**
 * Location Permission Modal - Requests location permission from user
 */
export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  visible,
  message,
  onRequestClose,
  onRetry,
  onOpenSettings,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Location Permission Required</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButtonCancel} onPress={onRequestClose}>
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButtonConfirm} onPress={onRetry}>
              <Text style={styles.modalButtonTextConfirm}>Retry</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalButtonSecondary} onPress={onOpenSettings}>
            <Text style={styles.modalButtonTextSecondary}>Open Settings</Text>
          </TouchableOpacity>
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
    ...SHADOWS.LG,
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
    marginBottom: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.BACKGROUND_GRAY,
    alignItems: 'center',
    marginRight: 6,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    marginLeft: 6,
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
  modalButtonSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
  },
  modalButtonTextSecondary: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
});

