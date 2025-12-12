import Constants from 'expo-constants';

/**
 * Get API base URL from environment variables or app config
 * Priority: EXPO_PUBLIC_API_URL (from eas.json) > API_URL (from app.json extra) > fallback
 */
export const getApiBaseUrl = (): string => {
  // In development, use environment variable or local IP
  if (__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.118:3000';
  }
  
  // In production, check multiple sources
  // 1. EXPO_PUBLIC_API_URL from eas.json build env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. API_URL from app.json extra config (via Constants)
  const apiUrlFromConfig = Constants.expoConfig?.extra?.API_URL;
  if (apiUrlFromConfig) {
    return apiUrlFromConfig;
  }
  
  // 3. Fallback (should not happen in production builds)
  console.warn('[apiConfig] No API URL configured, using fallback');
  return 'http://localhost:3000';
};

/**
 * Get cleaned API base URL (no extra spaces or newlines)
 */
export const getCleanedApiBaseUrl = (): string => {
  return getApiBaseUrl().replace(/\s+/g, '').replace(/\n/g, '').trim();
};

