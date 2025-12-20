import Constants from 'expo-constants';

/**
 * Get API base URL from environment variables or app config
 * Priority: EXPO_PUBLIC_API_URL (from eas.json) > API_URL (from app.json extra) > fallback
 */
const stripTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

const isLocalhostUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const getExpoDevHost = (): string | null => {
  // Expo can expose the dev machine host via different fields depending on runtime (Expo Go vs dev client).
  // We intentionally access a few known-but-not-always-typed properties defensively.
  const anyConstants = Constants as any;
  const hostUri: string | undefined =
    (Constants.expoConfig as any)?.hostUri ||
    anyConstants?.expoGoConfig?.debuggerHost ||
    anyConstants?.manifest?.debuggerHost ||
    anyConstants?.manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri || typeof hostUri !== 'string') return null;

  // Examples:
  // - "192.168.1.84:8081"
  // - "exp://192.168.1.84:8081"
  // - "https://192.168.1.84:8081"
  const cleaned = hostUri
    .replace(/^https?:\/\//, '')
    .replace(/^exp:\/\//, '')
    .replace(/^exps:\/\//, '');

  const hostPort = cleaned.split('/')[0];
  const host = hostPort.split(':')[0];

  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
};

const tryReplaceLocalhostHostname = (url: string, hostname: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return null;
    u.hostname = hostname;
    return stripTrailingSlashes(u.toString());
  } catch {
    return null;
  }
};

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const apiUrlFromConfig = Constants.expoConfig?.extra?.API_URL;
  const apiUrlProduction = Constants.expoConfig?.extra?.API_URL_PRODUCTION;

  // Production behavior: prefer explicit env, then production config, then fallback config.
  if (!__DEV__) {
    if (envUrl) return stripTrailingSlashes(envUrl);
    if (apiUrlProduction) return stripTrailingSlashes(apiUrlProduction);
    if (apiUrlFromConfig) return stripTrailingSlashes(apiUrlFromConfig);
    console.warn('[apiConfig] No API URL configured, using fallback');
    return 'http://localhost:3000';
  }

  // Development behavior:
  // - Respect EXPO_PUBLIC_API_URL / API_URL when they are already a non-localhost URL
  // - If they point at localhost, replace hostname with the Expo dev host IP so physical devices can reach it
  if (envUrl && !isLocalhostUrl(envUrl)) return stripTrailingSlashes(envUrl);
  if (apiUrlFromConfig && !isLocalhostUrl(apiUrlFromConfig)) return stripTrailingSlashes(apiUrlFromConfig);

  const candidate = envUrl || apiUrlFromConfig || 'http://localhost:3000';
  const expoHost = getExpoDevHost();

  if (expoHost && isLocalhostUrl(candidate)) {
    const replaced = tryReplaceLocalhostHostname(candidate, expoHost);
    if (replaced) {
      console.log('[apiConfig] Development mode - using Expo host:', replaced);
      return replaced;
    }
  }

  console.log('[apiConfig] Development mode - using:', stripTrailingSlashes(candidate));
  return stripTrailingSlashes(candidate);
};

/**
 * Get cleaned API base URL (no extra spaces or newlines)
 */
export const getCleanedApiBaseUrl = (): string => {
  return getApiBaseUrl().replace(/\s+/g, '').replace(/\n/g, '').trim();
};

