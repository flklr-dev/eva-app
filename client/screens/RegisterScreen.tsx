import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
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

export const RegisterScreen: React.FC<Props> = ({ onNavigate }) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = winW < 360;
  const isMedium = winW < 400;
  const isShortScreen = winH < 700;
  const isTallScreen = winH > 800;
  
  // Dynamic spacing based on screen height
  const brandingTopMargin = isShortScreen ? winH * 0.04 : winH * 0.08;
  const switchBottomOffset = isShortScreen ? 15 : 40;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const { register, isLoading, commitAuth, pendingAuth } = useAuth();

  // Handle modal dismiss - commit auth if it was a success
  const handleModalDismiss = () => {
    console.log('[RegisterScreen] Modal dismissed, type:', modalType);
    setModalVisible(false);
    if (modalType === 'success' && pendingAuth) {
      console.log('[RegisterScreen] Committing auth after success modal');
      commitAuth();
    }
  };

  // Real-time validation
  const handleNameChange = (text: string) => {
    setName(text);
    const result = validators.name(text);
    if (text.length > 0) {
      setFieldErrors(prev => ({
        ...prev,
        name: result.isValid ? '' : (result.error || ''),
      }));
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.name;
        return newErrors;
      });
    }
  };

  const handleEmailChange = (text: string) => {
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
  };

  const handlePasswordChange = (text: string) => {
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
  };

  const handleRegister = async () => {
    // Validate form
    const nameValidation = validators.name(name);
    const emailValidation = validators.email(email);
    const passwordValidation = validators.password(password);
    const errors: Record<string, string> = {};
    
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error || '';
    }
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error || '';
    }
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error || '';
    }
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setModalType('error');
      setModalTitle('Invalid Input');
      setModalMessage('Please check all fields and try again.');
      setModalVisible(true);
      return;
    }

    try {
      await register(name, email, password);
      console.log('[RegisterScreen] Registration successful, committing auth');
      
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setFieldErrors({});
      
      // Immediately navigate to home
      commitAuth();
    } catch (error: any) {
      setModalType('error');
      setModalTitle('Registration Failed');
      const errorMsg = error.message || 'Unable to create account. Please try again.';
      setModalMessage(
        errorMsg.includes('already exists') 
          ? 'This email is already registered. Please login instead.'
          : errorMsg
      );
      setModalVisible(true);
    }
  };

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
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={handleNameChange}
                    autoCapitalize="words"
                    error={fieldErrors.name}
                  />
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
                </View>
                
                <View style={[styles.bottomSection, { paddingBottom: switchBottomOffset }]}>
                  <Button
                    onPress={handleRegister}
                    style={StyleSheet.flatten([styles.signupButton, isSmall ? styles.signupButtonSmall : {}])}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Sign Up'}
                  </Button>
                  <View style={[styles.switchContainer, isSmall && styles.switchContainerSmall]}>
                    <Text style={styles.switchText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => onNavigate('LOGIN')}>
                      <Text style={styles.switchAction}>Login here</Text>
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
    gap: 4,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  bodySmall: {
    gap: 2,
    paddingVertical: 10,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
  },
  signupButton: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  signupButtonSmall: {
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
});
