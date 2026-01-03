import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { validators } from '../utils/validators';
import { authService } from '../utils/authService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

// Define the navigation type for this screen
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FORGOT_PASSWORD'
>;

const backgroundImage = require('../assets/background.png');

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
};

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  console.log('[ForgotPasswordScreen] Component rendered');
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = winW < 360;
  const isMedium = winW < 400;
  const isShortScreen = winH < 700;
  const isTallScreen = winH > 800;

  // Dynamic spacing based on screen height
  const brandingTopMargin = isShortScreen ? winH * 0.05 : winH * 0.08;
  const buttonBottomOffset = isShortScreen ? 70 : isTallScreen ? 120 : 100;
  const switchBottomOffset = isShortScreen ? 20 : 40;

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalAction, setModalAction] = useState<'close' | 'navigate'>('close');
  const [isLoading, setIsLoading] = useState(false);

  // Handle modal dismiss
  const handleModalDismiss = useCallback(() => {
    console.log('[ForgotPasswordScreen] Modal dismissed, type:', modalType);
    setModalVisible(false);
    
    // If it was a success, navigate to OTP verification screen
    if (modalType === 'success' && modalAction === 'navigate') {
      navigation.navigate('VERIFY_OTP', { email });
    }
  }, [modalType, modalAction, navigation, email]);

  // Real-time validation
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    const result = validators.email(text);
    if (text.length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        email: result.isValid ? '' : (result.error || ''),
      }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  }, []);

  const handleForgotPassword = useCallback(async () => {
    console.log('[ForgotPasswordScreen] handleForgotPassword called');
    
    // Validate form
    const emailValidation = validators.email(email);
    const errors: Record<string, string> = {};
    
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || '';
    }
    
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('[ForgotPasswordScreen] Validation errors:', errors);
      setModalType('error');
      setModalTitle('Invalid Input');
      setModalMessage('Please enter a valid email address.');
      setModalVisible(true);
      return;
    }

    console.log('[ForgotPasswordScreen] Calling forgot password API...');
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      console.log('[ForgotPasswordScreen] Forgot password request successful');
      setModalType('success');
      setModalTitle('Check Your Email');
      setModalMessage('A password reset OTP has been sent to your email address. Please check your inbox and enter the code to continue.');
      setModalAction('navigate');
      setModalVisible(true);
    } catch (error: any) {
      console.log('[ForgotPasswordScreen] Forgot password failed:', error.message);
      setModalType('error');
      setModalTitle('Request Failed');
      
      // Provide specific error messages based on the error received from server
      let errorMessage = error.message || 'Unable to process your request. Please check your email and try again.';
      
      if (error.message && error.message.includes('No account found')) {
        errorMessage = 'No account found with this email address. Please check your email and try again.';
      }
      
      setModalMessage(errorMessage);
      setModalAction('close');
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  return (
    <>
      <ImageBackground 
        source={backgroundImage} 
        style={{ flex: 1 }} 
        imageStyle={{ resizeMode: 'cover' }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.container, isSmall && styles.containerSmall, { minHeight: winH - insets.top - insets.bottom }]}>
                <View style={[styles.branding, { marginTop: brandingTopMargin }]}>
                  <Text style={[styles.brand, isSmall && styles.brandSmall]}>EVA</Text>
                </View>

                <View style={[styles.body, isSmall && styles.bodySmall]}>
                  <Text style={[styles.title, isSmall && styles.titleSmall]}>Forgot Password</Text>
                  <Text style={[styles.subtitle, isSmall && styles.subtitleSmall]}>
                    Enter your email address and we'll send you an OTP to reset your password.
                  </Text>
                  
                  <Input
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldErrors.email}
                    autoCorrect={false}
                  />
                </View>
                
                <View style={[styles.bottomSection, { paddingBottom: switchBottomOffset }]}>
                  <Button
                    onPress={handleForgotPassword}
                    style={StyleSheet.flatten([styles.submitButton, isSmall ? styles.submitButtonSmall : {}])}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Send OTP'}
                  </Button>
                  <View style={[styles.switchContainer, isSmall && styles.switchContainerSmall]}>
                    <Text style={styles.switchText}>Remember your password?</Text>
                    <TouchableOpacity onPress={() => navigation.replace('LOGIN')}>
                      <Text style={styles.switchAction}>Login here</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleModalDismiss}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Title */}
              <Text style={styles.modalTitle}>{modalTitle}</Text>

              {/* Message */}
              <Text style={styles.modalSubtitle}>{modalMessage}</Text>

              {/* Horizontal Line */}
              <View style={styles.modalSeparator} />

              {/* Action Button */}
              <TouchableOpacity
                style={modalType === 'success' ? styles.modalSuccessButton : styles.modalErrorButton}
                onPress={handleModalDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>
                  {modalType === 'success' ? 'OK' : 'Close'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerSmall: {
    paddingHorizontal: 20,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    opacity: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
  },
  brandSmall: {
    fontSize: 40,
  },
  body: {
    flex: 1,
    gap: 2,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  bodySmall: {
    gap: 0,
    paddingVertical: 10,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  subtitleSmall: {
    fontSize: 14,
    marginBottom: 20,
  },
  submitButton: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  submitButtonSmall: {
    maxWidth: 280,
  },
  switchContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 28,
  },
  switchContainerSmall: {
    paddingHorizontal: 20,
  },
  switchText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 0,
    marginBottom: 8,
  },
  switchAction: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 40,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_WHITE,
    backgroundColor: '#F2F2F2',
    ...SHADOWS.LG,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.TEXT_SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    textAlign: 'center',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER_OPACITY,
    marginHorizontal: SPACING.SM,
  },
  modalSuccessButton: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  modalErrorButton: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});