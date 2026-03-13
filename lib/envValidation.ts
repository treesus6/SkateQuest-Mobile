import { Logger } from './logger';

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SENTRY_DSN: string;
  MAPBOX_ACCESS_TOKEN: string;
  POSTHOG_API_KEY?: string;
  POSTHOG_HOST?: string;
  ENV?: 'development' | 'staging' | 'production';
}

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

export function validateEnvironment(): EnvConfig {
  const missing: RequiredEnvKey[] = [];
  const invalid: RequiredEnvKey[] = [];

  for (const varName of REQUIRED_VARS) {
    const value = RAW_ENV[varName];
    if (!value) {
      missing.push(varName);
    } else if (value.trim() === '') {
      invalid.push(varName);
    }
  }

  // Log errors but never throw - throwing before React mounts = white screen
  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    Logger.error(errorMsg);
    console.error('[ENV]', errorMsg);
  }

  if (invalid.length > 0) {
    const errorMsg = `Invalid (empty) environment variables: ${invalid.join(', ')}`;
    Logger.error(errorMsg);
    console.error('[ENV]', errorMsg);
  }

  // Validate URL formats - log only, never throw
  const supabaseUrl = RAW_ENV.EXPO_PUBLIC_SUPABASE_URL as string;
  if (supabaseUrl && !isValidUrl(supabaseUrl)) {
    console.error(`[ENV] Invalid EXPO_PUBLIC_SUPABASE_URL format: ${supabaseUrl}`);
  }

  const sentryDsn = RAW_ENV.EXPO_PUBLIC_SENTRY_DSN as string;
  if (sentryDsn && !isValidUrl(sentryDsn)) {
    console.error(`[ENV] Invalid EXPO_PUBLIC_SENTRY_DSN format: ${sentryDsn}`);
  }

  for (const varName of OPTIONAL_VARS) {
    const value = RAW_ENV[varName];
    if (!value) {
      Logger.warn(`Optional environment variable not set: ${varName}`);
    }
  }

  return {
    SUPABASE_URL: RAW_ENV.EXPO_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: RAW_ENV.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    SENTRY_DSN: RAW_ENV.EXPO_PUBLIC_SENTRY_DSN || '',
    MAPBOX_ACCESS_TOKEN: RAW_ENV.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    POSTHOG_API_KEY: RAW_ENV.EXPO_PUBLIC_POSTHOG_API_KEY,
    POSTHOG_HOST: RAW_ENV.EXPO_PUBLIC_POSTHOG_HOST,
    ENV: (RAW_ENV.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'production',
  };
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getEnvironment(): 'development' | 'staging' | 'production' {
  return (RAW_ENV.EXPO_PUBLIC_ENV as 'development' | 'staging' | 'production') || 'production';
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development' || __DEV__;
}

export function isProduction(): boolean {
  return getEnvironment() === 'production' && !__DEV__;
}

export function isStaging(): boolean {
  return getEnvironment() === 'staging';
}
