import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { CheckCircle, AlertCircle } from 'lucide-react-native';

interface ModalProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onDismiss: () => void;
  autoClose?: boolean;
}

const { width } = Dimensions.get('window');

export const NotificationModal: React.FC<ModalProps> = ({
  visible,
  type,
  title,
  message,
  onDismiss,
  autoClose = true,
}) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  console.log('[NotificationModal] Render - visible:', visible, 'type:', type);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      // Reset and animate in
      scaleValue.setValue(0.8);
      opacityValue.setValue(0);
      
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]); // Only depend on visible, not on refs

  // Auto-close for success messages
  useEffect(() => {
    if (visible && autoClose && type === 'success') {
      const timer = setTimeout(() => {
        onDismiss();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, type, onDismiss]);

  const isSuccess = type === 'success';
  const iconColor = isSuccess ? '#34C759' : '#FF3B30';
  const bgColor = isSuccess ? '#F0FDF4' : '#FEF2F2';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        console.log('[NotificationModal] onRequestClose called');
        onDismiss();
      }}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
            },
          ]}
        >
          <View style={[styles.content, { backgroundColor: bgColor }]}>
          <View style={styles.iconContainer}>
            {type === 'success' ? (
              <CheckCircle size={48} color={iconColor} strokeWidth={2} />
            ) : (
              <AlertCircle size={48} color={iconColor} strokeWidth={2} />
            )}
          </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity
              style={[
                styles.actionButton,
                type === 'error' && styles.actionButtonError,
              ]}
              onPress={onDismiss}
            >
              <Text style={styles.actionButtonText}>
                {type === 'error' ? 'Try Again' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
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
    width: width - 60,
    maxWidth: 280,
  },
  content: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
  },
  actionButtonError: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
