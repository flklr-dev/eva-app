import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { AddToHomeScreen } from '../screens/AddToHomeScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { VerifyOTPScreen } from '../screens/VerifyOTPScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { preloadImages } from '../utils/imageCache';
import { useAuth } from '../context/AuthContext';

export type RootStackParamList = {
  SPLASH: undefined;
  LOGIN: undefined;
  REGISTER: undefined;
  HOME: undefined;
  ADD_TO_HOME: undefined;
  FORGOT_PASSWORD: undefined;
  VERIFY_OTP: {
    email: string;
  };
  RESET_PASSWORD: {
    email: string;
    otp: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Preload images on app initialization
preloadImages().catch(error => {
  console.warn('Image preload error:', error);
});

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAuth();
  const [appReady, setAppReady] = React.useState(false);
  
  console.log('[AppNavigator] Render - isAuthenticated:', isAuthenticated, 'isInitializing:', isInitializing);

  useEffect(() => {
    preloadImages()
      .then(() => setAppReady(true))
      .catch(error => {
        console.warn('Image preload error:', error);
        setAppReady(true);
      });
  }, []);

  // Only show loading during initial app startup, NOT during login/register
  if (isInitializing || !appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'HOME' : 'SPLASH'}
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="SPLASH">
              {props => <SplashScreen {...props} onNavigate={screen => props.navigation.replace(screen)} />}
            </Stack.Screen>
            <Stack.Screen name="LOGIN">
              {props => <LoginScreen {...props} onNavigate={(screen) => {
                console.log('[AppNavigator] Navigating from LOGIN to:', screen);
                props.navigation.replace(screen);
              }} />
              }
            </Stack.Screen>
            <Stack.Screen name="REGISTER">
              {props => <RegisterScreen {...props} onNavigate={screen => props.navigation.replace(screen)} />}
            </Stack.Screen>
            <Stack.Screen name="FORGOT_PASSWORD" component={ForgotPasswordScreen} />
            <Stack.Screen name="VERIFY_OTP" component={VerifyOTPScreen} />
            <Stack.Screen name="RESET_PASSWORD" component={ResetPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="HOME" component={HomeScreen} />
            <Stack.Screen name="ADD_TO_HOME" component={AddToHomeScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
