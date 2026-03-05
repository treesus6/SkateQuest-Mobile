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

// Raw env snapshot (no dynamic access to process.env)
const RAW_ENV = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  EXPO_PUBLIC_POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
} as const;

type RequiredEnvKey =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_SENTRY_DSN'
  | 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN';

type OptionalEnvKey =
  | 'EXPO_PUBLIC_POSTHOG_API_KEY'
  | 'EXPO_PUBLIC_POSTHOG_HOST';

const REQUIRED_VARS: RequiredEnvKey[] = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
];

const OPTIONAL_VARS: OptionalEnvKey[] = [
  'EXPO_PUBLIC_POSTHOG_API_KEY',
  'EXPO_PUBLIC_POSTHOG_HOST',
];

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): EnvConfig {
  const missing: RequiredEnvKey[] = [];
  const invalid: RequiredEnvKey[] = [];

  // Check required variables using RAW_ENV (no dynamic process.env access)
  for (const varName of REQUIRED_VARS) {
    const value = RAW_ENV[varName];

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
  const supabaseUrl = RAW_ENV.EXPO_PUBLIC_SUPABASE_URL as string;
  if (!isValidUrl(supabaseUrl)) {
    throw new Error(`Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
  }

  const sentryDsn = RAW_ENV.EXPO_PUBLIC_SENTRY_DSN as string;
  if (!isValidUrl(sentryDsn)) {
    throw new Error(`Invalid EXPO_PUBLIC_SENTRY_DSN format: ${sentryDsn}`);
  }

  // Log optional variables status
  for (const varName of OPTIONAL_VARS) {
    const value = RAW_ENV[varName];
    if (!value) {
      Logger.warn(`Optional environment variable not set: ${varName}`);
    }
  }

  // Return validated config
  const config: EnvConfig = {
    SUPABASE_URL: RAW_ENV.EXPO_PUBLIC_SUPABASE_URL as string,
    SUPABASE_ANON_KEY: RAW_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
    SENTRY_DSN: RAW_ENV.EXPO_PUBLIC_SENTRY_DSN as string,
    MAPBOX_ACCESS_TOKEN: RAW_ENV.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN as string,
    POSTHOG_API_KEY: RAW_ENV.EXPO_PUBLIC_POSTHOG_API_KEY,
    POSTHOG_HOST: RAW_ENV.EXPO_PUBLIC_POSTHOG_HOST,
    ENV: (RAW_ENV.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development',
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
  return (RAW_ENV.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'development';
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
