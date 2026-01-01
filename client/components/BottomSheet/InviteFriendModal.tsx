import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Platform, InteractionManager } from 'react-native';
import { sendSMSInvite } from '../../utils/shareUtils';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

interface InviteFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onShare?: () => void;
  onMessage?: () => void;
  onScan?: () => void; // Now shows QR code instead of scanning
  buttonPosition?: { x: number; y: number; width: number; height: number } | null;
  onShareAfterClose?: () => void; // Callback to call after modal is fully closed
}

/**
 * Invite Friend Modal - iOS-style modal for inviting friends
 */
export const InviteFriendModal: React.FC<InviteFriendModalProps> = ({
  visible,
  onClose,
  onShare,
  onMessage,
  onScan,
  buttonPosition,
  onShareAfterClose,
}) => {
  // Calculate modal position (right side, directly above the button)
  const modalWidth = 200;
  const { height } = Dimensions.get('window');
  
  // Position modal directly above the plus button
  let topOffset: number;
  let rightOffset: number;
  
  if (buttonPosition) {
    // Position above the button with some spacing (modal height is approximately 180px)
    topOffset = buttonPosition.y - 180; // Position modal above button
    // Align right edge of modal with right edge of button
    // buttonPosition.x is the left edge, so right edge is x + width
    rightOffset = width - (buttonPosition.x + buttonPosition.width); // Distance from screen right to button right
  } else {
    // Fallback position if button position not available
    rightOffset = SPACING.MD;
    topOffset = height * 0.52;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.modalContainer,
            {
              top: topOffset,
              right: rightOffset,
              width: modalWidth,
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="light" style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerText}>Invite new contact</Text>
              </View>

              {/* Separator */}
              <View style={styles.separator} />

              {/* Options */}
              <View style={styles.optionsContainer}>
                {/* Share Option */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    // Close modal and call share function
                    onClose();
                    onShareAfterClose?.();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="share-variant"
                    size={20}
                    color={COLORS.TEXT_PRIMARY}
                  />
                  <Text style={styles.optionText}>Share</Text>
                </TouchableOpacity>

                {/* Message Option */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onMessage?.();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="message-text"
                    size={20}
                    color={COLORS.TEXT_PRIMARY}
                  />
                  <Text style={styles.optionText}>Message</Text>
                </TouchableOpacity>

                {/* Scan Option - Now shows QR code */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onScan?.();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="qrcode"
                    size={20}
                    color={COLORS.TEXT_PRIMARY}
                  />
                  <Text style={styles.optionText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.modalContent, styles.modalContentAndroid]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerText}>Invite new contact</Text>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Share Option */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  // Close modal and call share function
                  onClose();
                  onShareAfterClose?.();
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="share-variant"
                  size={20}
                  color={COLORS.TEXT_PRIMARY}
                />
                <Text style={styles.optionText}>Share</Text>
              </TouchableOpacity>

              {/* Message Option */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onMessage?.();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="message-text"
                  size={20}
                  color={COLORS.TEXT_PRIMARY}
                />
                <Text style={styles.optionText}>Message</Text>
              </TouchableOpacity>

              {/* Scan Option - Now shows QR code */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onScan?.();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="qrcode"
                  size={20}
                  color={COLORS.TEXT_PRIMARY}
                />
                <Text style={styles.optionText}>Scan</Text>
              </TouchableOpacity>
            </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.LG,
  },
  modalContentAndroid: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      android: { elevation: 6, shadowColor: 'rgba(0,0,0,0.12)', shadowOpacity: 0.12, shadowRadius: 6 },
      ios: {},
      default: {},
    }),
  },
  header: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginHorizontal: SPACING.SM,
  },
  optionsContainer: {
    paddingVertical: SPACING.XS,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    gap: SPACING.MD,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.TEXT_PRIMARY,
  },
});

