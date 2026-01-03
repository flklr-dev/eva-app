import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../utils/authService';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

// Define the navigation type for this screen
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type VerifyOTPScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VERIFY_OTP'
>;

const backgroundImage = require('../assets/background.png');

type Props = {
  route: {
    params: {
      email: string;
    };
  };
  navigation: VerifyOTPScreenNavigationProp;
};

export const VerifyOTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email } = route.params;
  // console.log('[VerifyOTPScreen] Component rendered with email:', email);
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

  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalContext, setModalContext] = useState<'verification' | 'resend'>('verification');
  const [modalAction, setModalAction] = useState<'close' | 'navigate'>('close');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  // Countdown timer for resend
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isResendDisabled && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isResendDisabled, countdown]);

  // Handle modal dismiss
  const handleModalDismiss = useCallback(() => {
    console.log('[VerifyOTPScreen] Modal dismissed, type:', modalType, 'context:', modalContext);
    setModalVisible(false);
    
    // Only navigate to reset password after successful OTP verification (not after resend)
    if (modalType === 'success' && modalContext === 'verification' && modalAction === 'navigate') {
      navigation.navigate('RESET_PASSWORD', { email, otp });
    }
  }, [modalType, modalContext, modalAction, navigation, email, otp]);

  // Handle OTP input change
  const handleOtpChange = useCallback((text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    
    // Limit to 6 digits
    if (numericValue.length <= 6) {
      setOtp(numericValue);
      
      // Clear error if OTP has 6 digits
      if (numericValue.length === 6) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.otp;
          return newErrors;
        });
      }
    }
  }, []);

  // Verify OTP
  const handleVerifyOTP = useCallback(async () => {
    console.log('[VerifyOTPScreen] handleVerifyOTP called');
    
    // Validate OTP
    const errors: Record<string, string> = {};
    
    if (otp.length !== 6) {
      errors.otp = 'OTP must be 6 digits';
    }
    
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('[VerifyOTPScreen] Validation errors:', errors);
      setModalType('error');
      setModalTitle('Invalid Input');
      setModalMessage('Please enter a valid 6-digit OTP.');
      setModalVisible(true);
      return;
    }

    console.log('[VerifyOTPScreen] Calling verify OTP API...');
    setIsLoading(true);
    try {
      await authService.verifyOTP(email, otp);
      console.log('[VerifyOTPScreen] OTP verification successful');
      setModalType('success');
      setModalTitle('OTP Verified');
      setModalMessage('OTP verified successfully. Redirecting to reset password...');
      setModalContext('verification');
      setModalAction('navigate');
      setModalVisible(true);
    } catch (error: any) {
      console.log('[VerifyOTPScreen] OTP verification failed:', error.message);
      setModalType('error');
      setModalTitle('Verification Failed');
      
      // Provide specific error messages based on the error received from server
      let errorMessage = error.message || 'Unable to verify OTP. Please check your OTP and try again.';
      
      if (error.message && error.message.includes('expired')) {
        errorMessage = 'The OTP has expired. Please request a new one.';
      } else if (error.message && error.message.includes('Invalid OTP')) {
        errorMessage = 'The OTP you entered is incorrect. Please check and try again.';
      }
      
      setModalMessage(errorMessage);
      setModalAction('close');
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  }, [otp, email]);

  // Resend OTP
  const handleResendOTP = useCallback(async () => {
    console.log('[VerifyOTPScreen] handleResendOTP called');
    
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      console.log('[VerifyOTPScreen] Resend OTP request successful');
      setModalType('success');
      setModalTitle('OTP Resent');
      setModalMessage('A new OTP has been sent to your email address.');
      setModalContext('resend');
      setModalAction('close');
      setModalVisible(true);
      
      // Start countdown again
      setCountdown(60);
      setIsResendDisabled(true);
    } catch (error: any) {
      console.log('[VerifyOTPScreen] Resend OTP failed:', error.message);
      setModalType('error');
      setModalTitle('Resend Failed');
      setModalMessage(
        error.message || 'Unable to resend OTP. Please try again later.'
      );
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
                  <Text style={[styles.title, isSmall && styles.titleSmall]}>Verify OTP</Text>
                  <Text style={[styles.subtitle, isSmall && styles.subtitleSmall]}>
                    We've sent an OTP to {email}. Please enter the 6-digit code below.
                  </Text>
                  
                  <Input
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={handleOtpChange}
                    keyboardType="numeric"
                    maxLength={6}
                    error={fieldErrors.otp}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code?</Text>
                    <TouchableOpacity 
                      onPress={handleResendOTP} 
                      disabled={isResendDisabled || isLoading}
                      style={isResendDisabled ? styles.disabledResendButton : styles.resendButton}
                    >
                      <Text style={[
                        styles.resendButtonText, 
                        isResendDisabled ? styles.disabledResendText : styles.enabledResendText
                      ]}>
                        {isResendDisabled ? `Resend (${countdown}s)` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={[styles.bottomSection, { paddingBottom: switchBottomOffset }]}>
                  <Button
                    onPress={handleVerifyOTP}
                    style={StyleSheet.flatten([styles.submitButton, isSmall ? styles.submitButtonSmall : {}])}
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Verify OTP'}
                  </Button>
                  <View style={[styles.switchContainer, isSmall && styles.switchContainerSmall]}>
                    <Text style={styles.switchText}>Go back to</Text>
                    <TouchableOpacity onPress={() => navigation.replace('LOGIN')}>
                      <Text style={styles.switchAction}>Login</Text>
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
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  resendButton: {
    padding: 0,
  },
  disabledResendButton: {
    padding: 0,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  enabledResendText: {
    color: '#111827',
  },
  disabledResendText: {
    color: '#9CA3AF',
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