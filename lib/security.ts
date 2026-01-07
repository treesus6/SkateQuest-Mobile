import * as Sentry from '@sentry/react-native';
import { Logger } from './logger';

/**
 * Security utilities and rate limiting
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple client-side rate limiting
 * Prevents excessive API calls from a single client
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Start new window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    Logger.warn('Rate limit exceeded', { key, retryAfter });
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Check for exposed API keys in code
 * This is a helper for development
 */
export function checkForExposedSecrets(): void {
  const envVars = process.env;

  const suspiciousPatterns = [
    /EXPO_PUBLIC_.*KEY/i,
    /EXPO_PUBLIC_.*SECRET/i,
    /EXPO_PUBLIC_.*PASSWORD/i,
  ];

  const exposed: string[] = [];

  for (const [key, value] of Object.entries(envVars)) {
    // Check if it's a public env var that might contain secrets
    if (key.startsWith('EXPO_PUBLIC_') && value) {
      // Check for hardcoded values (not placeholder text)
      if (
        !value.includes('your_') &&
        !value.includes('placeholder') &&
        !value.includes('example') &&
        value.length > 10
      ) {
        // Check if key name suggests it's a secret
        if (
          key.includes('KEY') ||
          key.includes('SECRET') ||
          key.includes('PASSWORD') ||
          key.includes('TOKEN')
        ) {
          // SUPABASE_KEY is OK to expose (it's the anon key)
          if (!key.includes('SUPABASE_KEY')) {
            exposed.push(key);
          }
        }
      }
    }
  }

  if (exposed.length > 0) {
    const message = `Warning: Potentially sensitive keys exposed in EXPO_PUBLIC_ variables: ${exposed.join(', ')}`;
    console.warn(message);
    if (__DEV__) {
      Sentry.captureMessage(message, 'warning');
    }
  }
}

/**
 * Prevent SQL injection in search queries
 * (Although Supabase client library handles this, extra safety)
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  return query
    .replace(/[';-]/g, '') // Remove SQL comment characters and dashes
    .replace(/\\/g, '') // Remove escape characters
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Generate secure random ID
 */
export function generateSecureId(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

/**
 * Validate URL to prevent open redirect attacks
 */
export function isValidUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // If allowedDomains is provided, check domain
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(domain => parsed.hostname.endsWith(domain));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Content Security Policy headers (for documentation)
 * These would be implemented on the backend/CDN level
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.supabase.co'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://sentry.io',
    'https://app.posthog.com',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Check for common security headers
 * (Informational - actual headers are set by backend)
 */
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
};

/**
 * Throttle function calls (debounce with leading edge)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): T {
  let lastCall = 0;

  return ((...args: any[]) => {
    const now = Date.now();

    if (now - lastCall >= limitMs) {
      lastCall = now;
      return func(...args);
    }
  }) as T;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): T {
  let timeoutId: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  }) as T;
}

export default {
  checkRateLimit,
  checkForExposedSecrets,
  sanitizeSearchQuery,
  generateSecureId,
  isValidUrl,
  throttle,
  debounce,
  CSP_POLICY,
  SECURITY_HEADERS,
};
