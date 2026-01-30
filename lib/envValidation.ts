import { Logger } from './logger';

/**
 * Environment variable validation
 * Ensures all required environment variables are present at app startup
 */

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SENTRY_DSN?: string;
  MAPBOX_ACCESS_TOKEN: string;
  POSTHOG_API_KEY?: string;
  POSTHOG_HOST?: string;
  ENV?: 'development' | 'staging' | 'production';
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): EnvConfig {
  const missing: string[] = [];

  // Check required variables using static access (Expo requirement)
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!supabaseUrl || supabaseUrl.trim() === '') {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseKey || supabaseKey.trim() === '') {
    missing.push('EXPO_PUBLIC_SUPABASE_KEY');
  }
  if (!mapboxToken || mapboxToken.trim() === '') {
    missing.push('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN');
  }

  // Report errors
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    Logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate URL formats
  if (!isValidUrl(supabaseUrl)) {
    throw new Error(`Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
  }

  // Optional variables - validate format only if provided
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

  if (sentryDsn && !isValidUrl(sentryDsn)) {
    Logger.warn(`Invalid EXPO_PUBLIC_SENTRY_DSN format: ${sentryDsn}`);
  }

  // Log optional variables status
  if (!sentryDsn) {
    Logger.warn('Optional environment variable not set: EXPO_PUBLIC_SENTRY_DSN');
  }
  if (!posthogApiKey) {
    Logger.warn('Optional environment variable not set: EXPO_PUBLIC_POSTHOG_API_KEY');
  }
  if (!posthogHost) {
    Logger.warn('Optional environment variable not set: EXPO_PUBLIC_POSTHOG_HOST');
  }

  // Return validated config
  const config: EnvConfig = {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_KEY: supabaseKey,
    SENTRY_DSN: sentryDsn,
    MAPBOX_ACCESS_TOKEN: mapboxToken,
    POSTHOG_API_KEY: posthogApiKey,
    POSTHOG_HOST: posthogHost,
    ENV: (process.env.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development',
  };

  Logger.info(`Environment validated successfully (${config.ENV})`);
  Logger.info(`Supabase URL: ${config.SUPABASE_URL}`);
  Logger.info(`Mapbox: ${config.MAPBOX_ACCESS_TOKEN ? 'configured' : 'not configured'}`);
  Logger.info(`Sentry: ${config.SENTRY_DSN ? 'configured' : 'not configured (optional)'}`);
  Logger.info(`PostHog: ${config.POSTHOG_API_KEY ? 'configured' : 'not configured'}`);

  return config;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  return (process.env.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development' || __DEV__;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production' && !__DEV__;
}

/**
 * Check if running in staging
 */
export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}
