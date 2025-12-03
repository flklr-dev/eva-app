import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
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

export const RegisterScreen: React.FC<Props> = ({ onNavigate }) => {
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
      console.log('[RegisterScreen] Registration successful, committing auth immediately');
      
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setFieldErrors({});
      
      commitAuth(); // Immediately navigate to home
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
          <View style={styles.container}>
            <View style={styles.branding}>
              <Text style={styles.brand}>EVA</Text>
            </View>
            <View style={styles.body}>
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
              <Button onPress={handleRegister} style={styles.signupButton} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="#111827" /> : 'Sign Up'}
              </Button>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => onNavigate('LOGIN')}>
                <Text style={styles.switchAction}>Login here</Text>
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
    marginBottom: 40,
    marginTop: height * 0.08,
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
    gap: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButton: {
    position: 'absolute',
    bottom: 100,
    width: '100%',
    maxWidth: 320,
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
