import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCleanedApiBaseUrl } from '../utils/apiConfig';

const { width } = Dimensions.get('window');

interface QRCodeDisplayProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

/**
 * QR Code Display Modal
 * Shows user's QR code that others can scan to add them as a friend
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  visible,
  onClose,
  userId,
  userName,
}) => {
  const insets = useSafeAreaInsets();
  
  // Generate QR code data using HTTPS URL that iPhone Camera can recognize
  // Format: https://{apiUrl}/invite/{userId}
  // iPhone Camera will recognize this as a valid URL and allow opening it
  // The server will serve an HTML page that redirects to the app deep link
  const qrData = `${getCleanedApiBaseUrl()}/invite/${userId}`;

  const qrSize = Math.min(width * 0.6, 280);

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
          style={styles.modalContainer}
        >
          {Platform.OS === 'ios' ? (
            <View style={[styles.modalContent, styles.modalContentIOS]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerText}>My QR Code</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Separator */}
              <View style={styles.separator} />

              {/* QR Code Container */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrData}
                    size={qrSize}
                    color={COLORS.TEXT_PRIMARY}
                    backgroundColor="white"
                    logoSize={qrSize * 0.2}
                    logoMargin={4}
                    logoBackgroundColor="white"
                    logoBorderRadius={BORDER_RADIUS.SM}
                  />
                </View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.instructionText}>
                  Ask others to scan this QR code to add you as a friend
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.modalContent, styles.modalContentAndroid]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerText}>My QR Code</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>

              {/* Separator */}
              <View style={styles.separator} />

              {/* QR Code Container */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrData}
                    size={qrSize}
                    color={COLORS.TEXT_PRIMARY}
                    backgroundColor="white"
                    logoSize={qrSize * 0.2}
                    logoMargin={4}
                    logoBackgroundColor="white"
                    logoBorderRadius={BORDER_RADIUS.SM}
                  />
                </View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.instructionText}>
                  Ask others to scan this QR code to add you as a friend
                </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    ...SHADOWS.LG,
  },
  modalContentIOS: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.06)',
  },
  modalContentAndroid: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      android: { 
        elevation: 8, 
        shadowColor: 'rgba(0,0,0,0.15)', 
        shadowOpacity: 0.15, 
        shadowRadius: 8 
      },
      ios: {},
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    padding: SPACING.XS,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginHorizontal: SPACING.MD,
  },
  qrContainer: {
    padding: SPACING.XL,
    alignItems: 'center',
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    ...SHADOWS.SM,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
  },
});


