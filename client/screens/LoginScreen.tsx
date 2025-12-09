import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { NotificationModal } from '../components/NotificationModal';
import { validators } from '../utils/validators';
import { useAuth } from '../context/AuthContext';

const backgroundImage = require('../assets/background.png');
const { width, height } = Dimensions.get('window');

type Props = {
  onNavigate: (screen: string) => void;
};

export const LoginScreen: React.FC<Props> = ({ onNavigate }) => {
  console.log('[LoginScreen] Component rendered');
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
          <View style={styles.container}>
            <View style={styles.branding}>
              <Text style={styles.brand}>EVA</Text>
            </View>

            <View style={styles.body}>
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
            <Button onPress={handleLogin} style={styles.loginButton} disabled={isLoading}>
              {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Login'}
            </Button>
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => onNavigate('REGISTER')}>
                <Text style={styles.switchAction}>Sign up here</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branding: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 40,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  brand: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 2,
    opacity: 1,
    fontFamily: 'Helvetica',
  },
  body: {
    flex: 1,
    gap: 2,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    position: 'absolute',
    bottom: 100,
    width: '100%',
    maxWidth: 320,
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
    marginTop: 20,
    position: 'absolute',
    bottom: 40,
    width: '100%',
    paddingHorizontal: 28,
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