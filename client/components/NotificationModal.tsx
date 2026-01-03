import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
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
  const androidCard = Platform.OS === 'android' ? styles.contentAndroid : null;

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
          <View style={[styles.content, { backgroundColor: bgColor }, androidCard]}>
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
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)',
      },
      android: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      default: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width - 60,
    maxWidth: 280,
  },
  content: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        backgroundColor: '#fff',
        elevation: 8,
        shadowColor: 'rgba(0,0,0,0.15)',
      },
      default: {},
    }),
  },
  contentAndroid: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderWidth: 0.5,
    borderColor: '#A0A0A0',
  },
  actionButtonError: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
