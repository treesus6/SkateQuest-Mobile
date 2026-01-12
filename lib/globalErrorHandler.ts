import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';
import { Logger } from './logger';

/**
 * Global error handler for unhandled promise rejections and native errors
 */

let isSetup = false;

export function setupGlobalErrorHandler() {
  if (isSetup) {
    return;
  }

  // Handle unhandled promise rejections
  const originalPromiseRejection = global.Promise.prototype.catch;
  global.Promise.prototype.catch = function (onRejected) {
    return originalPromiseRejection.call(this, (error: Error) => {
      Logger.error('Unhandled promise rejection:', error);
      Sentry.captureException(error, {
        tags: { error_type: 'unhandled_promise_rejection' },
      });

      if (onRejected) {
        return onRejected(error);
      }
      throw error;
    });
  };

  // Handle global errors
  if (typeof ErrorUtils !== 'undefined') {
    const originalGlobalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      Logger.error('Global error:', error);

      Sentry.captureException(error, {
        tags: {
          error_type: 'global_error',
          is_fatal: isFatal ? 'true' : 'false',
        },
      });

      if (isFatal && !__DEV__) {
        Alert.alert(
          'Unexpected Error',
          'The app encountered an unexpected error. Please restart the app.',
          [
            {
              text: 'Restart',
              onPress: () => {
                // You can add restart logic here if needed
              },
            },
          ]
        );
      }

      if (originalGlobalHandler) {
        originalGlobalHandler(error, isFatal);
      }
    });
  }

  // Console error interception for development
  if (__DEV__) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      Logger.error('Console error:', ...args);
      originalConsoleError(...args);
    };
  }

  isSetup = true;
  Logger.info('Global error handler initialized');
}

/**
 * Manually report an error to the global error handler
 */
export function reportError(error: Error, context?: Record<string, any>) {
  Logger.error('Manually reported error:', error, context);
  Sentry.captureException(error, {
    contexts: { manual_report: context || {} },
  });
}

/**
 * Report a non-fatal error (doesn't crash the app)
 */
export function reportNonFatalError(error: Error, context?: Record<string, any>) {
  Logger.warn('Non-fatal error', context);
  Sentry.captureException(error, {
    level: 'warning',
    contexts: { non_fatal: context || {} },
  });
}
