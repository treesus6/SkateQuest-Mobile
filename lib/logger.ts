import { logger, consoleTransport, configLoggerType } from 'react-native-logs';
import * as Sentry from '@sentry/react-native';

/**
 * Production-grade logging system
 * - Console logs in development
 * - Sentry breadcrumbs in production
 * - Never logs sensitive data
 */

const config: configLoggerType<any, any> = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? 'debug' : 'info',
  transport: __DEV__ ? consoleTransport : sentryTransport,
  transportOptions: {
    colors: {
      debug: 'blueBright',
      info: 'greenBright',
      warn: 'yellowBright',
      error: 'redBright',
    },
  },
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  enabled: true,
};

/**
 * Custom transport to send logs to Sentry in production
 */
function sentryTransport(props: any) {
  const { msg, rawMsg, level, extension, options } = props;

  // Add as Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: extension || 'app',
    message: msg,
    level: mapLogLevelToSentryLevel(level.text),
    data: {
      ...options,
      raw_message: rawMsg,
    },
  });

  // Also send errors directly to Sentry
  if (level.severity >= 3) {
    Sentry.captureMessage(msg, mapLogLevelToSentryLevel(level.text));
  }

  // Also log to console in development
  if (__DEV__) {
    consoleTransport(props);
  }
}

function mapLogLevelToSentryLevel(level: string): Sentry.SeverityLevel {
  switch (level) {
    case 'debug':
      return 'debug';
    case 'info':
      return 'info';
    case 'warn':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
}

const log = logger.createLogger(config);

/**
 * Sanitize data to remove sensitive information
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'privateKey',
    'private_key',
    'creditCard',
    'credit_card',
    'ssn',
    'social_security',
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Logger with automatic sanitization
 */
export const Logger = {
  /**
   * Debug log (development only)
   */
  debug: (message: string, data?: any) => {
    log.debug(message, sanitizeData(data));
  },

  /**
   * Info log
   */
  info: (message: string, data?: any) => {
    log.info(message, sanitizeData(data));
  },

  /**
   * Warning log
   */
  warn: (message: string, data?: any) => {
    log.warn(message, sanitizeData(data));
  },

  /**
   * Error log
   */
  error: (message: string, error?: Error | any, data?: any) => {
    const errorData = {
      ...sanitizeData(data),
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };
    log.error(message, errorData);
  },

  // Specific logging helpers

  /**
   * Log API calls
   */
  api: (method: string, endpoint: string, data?: any) => {
    log.info(`API ${method} ${endpoint}`, sanitizeData(data));
  },

  /**
   * Log navigation
   */
  navigation: (screen: string, params?: any) => {
    log.debug(`Navigation to ${screen}`, sanitizeData(params));
  },

  /**
   * Log user actions
   */
  userAction: (action: string, data?: any) => {
    log.info(`User action: ${action}`, sanitizeData(data));
  },

  /**
   * Log authentication events
   */
  auth: (event: string, userId?: string) => {
    log.info(`Auth: ${event}`, { user_id: userId });
  },

  /**
   * Log database operations
   */
  database: (operation: string, table: string, data?: any) => {
    log.debug(`DB ${operation} on ${table}`, sanitizeData(data));
  },

  /**
   * Log media operations
   */
  media: (operation: string, mediaType: string, data?: any) => {
    log.info(`Media ${operation}: ${mediaType}`, sanitizeData(data));
  },

  /**
   * Log performance metrics
   */
  performance: (metric: string, value: number, unit: string = 'ms') => {
    log.info(`Performance: ${metric} = ${value}${unit}`);
  },
};

// Export for backwards compatibility with console.log usage
export default Logger;
