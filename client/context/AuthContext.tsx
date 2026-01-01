import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../utils/authService';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  profilePicture?: string;
  settings: {
    shareLocation: boolean;
    shareWithEveryone: boolean;
    notificationsEnabled: boolean;
  };
  homeAddress?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    details?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

interface PendingAuth {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  pendingAuth: PendingAuth | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
  commitAuth: () => void; // Call this after showing success modal
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  
  console.log('[AuthContext] Provider render - token:', !!token, 'pendingAuth:', !!pendingAuth);

  // Restore token on app launch
  const restoreToken = useCallback(async () => {
    try {
      setIsInitializing(true);
      const storedToken = await authService.getToken();
      if (storedToken) {
        setToken(storedToken);
      const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // Fetch full profile to get phone, countryCode, and settings
          try {
            const fullProfile = await import('../services/profileService').then(mod => mod.getProfile(storedToken));
            setUser({
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              phone: fullProfile.phone,
              countryCode: fullProfile.countryCode,
              profilePicture: currentUser.profilePicture,
              settings: fullProfile.settings,
              homeAddress: fullProfile.homeAddress,
            });
          } catch (profileError) {
            console.error('Failed to fetch full profile, using basic user data:', profileError);
            // Fallback to basic user data with default settings
            setUser({
              ...currentUser,
              settings: {
                shareLocation: true,
                shareWithEveryone: false,
                notificationsEnabled: true,
              },
            });
          }
        } else {
          // Token invalid or expired
          await authService.logout();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to restore token:', error);
      setToken(null);
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    restoreToken();
  }, [restoreToken]);

  // Login handler - stores auth in pending state, NOT active state
  const handleLogin = useCallback(async (email: string, password: string) => {
    console.log('[AuthContext] handleLogin called');
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      console.log('[AuthContext] Login successful, setting token and user immediately');
      // Set token immediately, then fetch full profile
      setToken(response.token);
      
      // Fetch full profile to get phone and countryCode
      try {
        const fullProfile = await import('../services/profileService').then(mod => mod.getProfile(response.token));
        setUser({
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          phone: fullProfile.phone,
          countryCode: fullProfile.countryCode,
          profilePicture: response.user.profilePicture,
          homeAddress: fullProfile.homeAddress,
        });
      } catch (profileError) {
        console.error('Failed to fetch full profile after login, using basic user data:', profileError);
        // Fallback to basic user data
        setUser(response.user);
      }
      setPendingAuth(null);
    } catch (error: any) {
      console.log('[AuthContext] Login error:', error.message);
      if (error.message === 'Network error' || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and make sure the server is running.');
      }
      // Re-throw the error so the LoginScreen can handle it appropriately
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Register handler - stores auth in pending state, NOT active state
  const handleRegister = useCallback(async (name: string, email: string, password: string) => {
    console.log('[AuthContext] handleRegister called');
    try {
      setIsLoading(true);
      const response = await authService.register(name, email, password);
      console.log('[AuthContext] Register successful, setting token and user immediately');
      // Set token immediately, then fetch full profile
      setToken(response.token);
      
      // Fetch full profile to get phone and countryCode
      try {
        const fullProfile = await import('../services/profileService').then(mod => mod.getProfile(response.token));
        setUser({
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          phone: fullProfile.phone,
          countryCode: fullProfile.countryCode,
          profilePicture: response.user.profilePicture,
          homeAddress: fullProfile.homeAddress,
        });
      } catch (profileError) {
        console.error('Failed to fetch full profile after registration, using basic user data:', profileError);
        // Fallback to basic user data
        setUser(response.user);
      }
      setPendingAuth(null);
    } catch (error: any) {
      console.log('[AuthContext] Register error:', error.message);
      if (error.message === 'Network error' || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and make sure the server is running.');
      }
      // Re-throw the error so the RegisterScreen can handle it appropriately
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Commit pending auth - simplified for backward compatibility
  const commitAuth = useCallback(() => {
    // This function is kept for backward compatibility but no longer needed
    console.log('[AuthContext] commitAuth called (no-op)');
  }, []);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isInitializing,
    isAuthenticated: !!token && !!user,
    pendingAuth,
    setUser,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    restoreToken,
    commitAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};