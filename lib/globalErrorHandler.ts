import * as Sentry from '@sentry/react-native';
import { Alert, Platform } from 'react-native';
import { Logger } from './logger';

/**
 * Global error handler for native fatal errors.
 *
 * Sentry already installs unhandled-rejection instrumentation. Never patch
 * Promise.prototype.catch here: doing so reports every handled rejection as
 * unhandled and changes Promise behavior for the entire app.
 */

let isSetup = false;

export function setupGlobalErrorHandler() {
  if (isSetup) {
    return;
  }

  // Keep the platform's Promise implementation untouched. The Sentry SDK owns
  // unhandled-rejection capture and only reports promises that are truly
  // unhandled.

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

      if (isFatal && !__DEV__ && Platform.OS !== 'web') {
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
