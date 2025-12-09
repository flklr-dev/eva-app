import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your machine's IP address instead of localhost for Expo
// Your IP: 192.168.1.118 (found via ipconfig)
const API_BASE_URL = __DEV__ 
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.118:3000')  // Use env var with fallback
  : 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export const authService = {
  // Register user
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    console.log('[authService] Starting registration...');
    console.log('[authService] API URL:', `${API_BASE_URL}/api/auth/register`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      console.log('[authService] Register response status:', response.status);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('[authService] Register response is not JSON:', contentType);
        throw new Error('Server returned invalid response format');
      }
      
      const data = await response.json();
      console.log('[authService] Register response data:', JSON.stringify(data));

      if (!response.ok) {
        console.log('[authService] Register failed:', data.message);
        throw new Error(data.message || 'Registration failed');
      }

      // Store token and user data
      console.log('[authService] Storing token and user data...');
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      console.log('[authService] Registration successful!');

      return data;
    } catch (error: any) {
      console.log('[authService] Register error:', error.message);
      // Network error (server not reachable)
      if (error.message === 'Failed to fetch' || error.message.includes('Network request failed')) {
        const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        throw new Error(`Cannot connect to server. Please check:\n1. Server is running on ${serverUrl}\n2. Both devices are on the same WiFi\n3. Your internet connection is active`);
      }
      throw error instanceof Error ? error : new Error('Network error');
    }
  },

  // Login user
  login: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('[authService] Starting login...');
    console.log('[authService] API URL:', `${API_BASE_URL}/api/auth/login`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('[authService] Login response status:', response.status);
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('[authService] Login response is not JSON:', contentType);
        // Try to get text content for debugging
        const textResponse = await response.text();
        console.log('[authService] Login response text:', textResponse.substring(0, 200) + '...');
        throw new Error(`Server returned invalid response format. Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[authService] Login response data:', JSON.stringify(data));

      if (!response.ok) {
        console.log('[authService] Login failed:', data.message);
        throw new Error(data.message || 'Login failed');
      }

      // Store token and user data
      console.log('[authService] Storing token and user data...');
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      console.log('[authService] Login successful!');

      return data;
    } catch (error: any) {
      console.log('[authService] Login error:', error.message);
      // Network error (server not reachable)
      if (error.message === 'Failed to fetch' || error.message.includes('Network request failed')) {
        const serverUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        throw new Error(`Cannot connect to server. Please check:\n1. Server is running on ${serverUrl}\n2. Both devices are on the same WiFi\n3. Your internet connection is active`);
      }
      throw error instanceof Error ? error : new Error('Network error');
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,  // Fixed header format
        },
      });

      if (!response.ok) {
        await authService.logout();
        return null;
      }
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('[authService] getCurrentUser response is not JSON:', contentType);
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get stored token
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      return null;
    }
  },
};