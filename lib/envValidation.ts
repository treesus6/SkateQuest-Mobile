import { Logger } from './logger';

/**
 * Environment variable validation
 * Ensures all required environment variables are present at app startup
 */

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SENTRY_DSN: string;
  MAPBOX_ACCESS_TOKEN: string;
  POSTHOG_API_KEY?: string;
  POSTHOG_HOST?: string;
  ENV?: 'development' | 'staging' | 'production';
}

const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
];

const OPTIONAL_VARS = [
  'EXPO_PUBLIC_POSTHOG_API_KEY',
  'EXPO_PUBLIC_POSTHOG_HOST',
];

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): EnvConfig {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];

    if (!value) {
      missing.push(varName);
    } else if (value.trim() === '') {
      invalid.push(varName);
    }
  }

  // Report errors
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    Logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (invalid.length > 0) {
    const errorMsg = `Invalid (empty) environment variables: ${invalid.join(', ')}`;
    Logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate URL formats
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  if (!isValidUrl(supabaseUrl)) {
    throw new Error(`Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
  }

  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN!;
  if (!isValidUrl(sentryDsn)) {
    throw new Error(`Invalid EXPO_PUBLIC_SENTRY_DSN format: ${sentryDsn}`);
  }

  // Log optional variables status
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (!value) {
      Logger.warn(`Optional environment variable not set: ${varName}`);
    }
  }

  // Return validated config
  const config: EnvConfig = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN!,
    MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN!,
    POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
    POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    ENV: (process.env.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development',
  };

  Logger.info(`Environment validated successfully (${config.ENV})`);
  Logger.info(`Supabase URL: ${config.SUPABASE_URL}`);
  Logger.info(`Mapbox: ${config.MAPBOX_ACCESS_TOKEN ? 'configured' : 'not configured'}`);
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
