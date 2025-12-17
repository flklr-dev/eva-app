import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, Platform, useWindowDimensions, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { NotificationModal } from '../components/NotificationModal';
import { validators } from '../utils/validators';
import { useAuth } from '../context/AuthContext';

const backgroundImage = require('../assets/background.png');

type Props = {
  onNavigate: (screen: string) => void;
};

export const LoginScreen: React.FC<Props> = ({ onNavigate }) => {
  console.log('[LoginScreen] Component rendered');
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
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  
  const { login, isLoading } = useAuth();

  // Handle modal dismiss - commit auth if it was a success
  const handleModalDismiss = useCallback(() => {
    console.log('[LoginScreen] Modal dismissed, type:', modalType);
    setModalVisible(false);
  }, [modalType]);

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log('[LoginScreen] Component mounted');
    return () => {
      console.log('[LoginScreen] Component unmounted');
    };
  }, []);

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

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    const result = validators.password(text);
    if (text.length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        password: result.isValid ? '' : (result.error || ''),
      }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  }, []);

  const handleLogin = useCallback(async () => {
    console.log('[LoginScreen] handleLogin called');
    // Validate form
    const emailValidation = validators.email(email);
    const passwordValidation = validators.password(password);
    const errors: Record<string, string> = {};
    
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || '';
    }
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error || '';
    }
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('[LoginScreen] Validation errors:', errors);
      setModalType('error');
      setModalTitle('Invalid Input');
      setModalMessage('Please check all fields and try again.');
      setModalVisible(true);
      return;
    }

    console.log('[LoginScreen] Calling login...');
    try {
      await login(email, password);
      console.log('[LoginScreen] Login successful');
      // Clear only the password field on successful login
      setPassword('');
    } catch (error: any) {
      console.log('[LoginScreen] Login failed:', error.message);
      setModalType('error');
      setModalTitle('Login Failed');
      setModalMessage(
        error.message || 'Unable to login. Please check your credentials and try again.'
      );
      setModalVisible(true);
      console.log('[LoginScreen] Error modal visible set to true');
      // DON'T clear the fields on error - let user correct mistakes
      // Ensure password field retains its value
    }
  }, [email, password, login]);

  return (
    <>
      <ImageBackground source={backgroundImage} style={{ flex: 1 }} imageStyle={{ resizeMode: 'cover' }}>
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
                  <Input
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldErrors.email}
                    autoCorrect={false}
                  />
                  <Input
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry
                    error={fieldErrors.password}
                  />
                  <TouchableOpacity style={styles.forgotWrapper}>
                    <Text style={styles.forgot}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.bottomSection, { paddingBottom: switchBottomOffset }]}>
                  <Button
                    onPress={handleLogin}
                    style={StyleSheet.flatten([styles.loginButton, isSmall ? styles.loginButtonSmall : {}])}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Login'}
                  </Button>
                  <View style={[styles.switchContainer, isSmall && styles.switchContainerSmall]}>
                    <Text style={styles.switchText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => onNavigate('REGISTER')}>
                      <Text style={styles.switchAction}>Sign up here</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
      <NotificationModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onDismiss={handleModalDismiss}
        autoClose={modalType === 'success'}
      />
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
  loginButton: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  loginButtonSmall: {
    maxWidth: 280,
  },
  forgotWrapper: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 16,
    marginLeft: 24,
  },
  forgot: {
    color: '#6B7280',
    textDecorationLine: 'underline',
    fontSize: 14,
    marginLeft: 6,
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
});