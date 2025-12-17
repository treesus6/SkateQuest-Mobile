import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize Sentry for Error Tracking & Performance Monitoring
// Get your DSN from: https://sentry.io/settings/projects/YOUR_PROJECT/keys/
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Performance Monitoring - lower rate in production to reduce costs
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in production
  enableAutoPerformanceTracing: true,

  // Session Tracking
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,

  // Environment Configuration
  environment: __DEV__ ? 'development' : 'production',
  debug: __DEV__,

  // Breadcrumbs Configuration
  maxBreadcrumbs: 50, // Increase for better debugging context
  attachStacktrace: true,

  // Filter noisy breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out console.log (keep console.warn and console.error)
    if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
      return null;
    }
    return breadcrumb;
  },

  // Filter known non-critical errors
  beforeSend(event, hint) {
    // Don't send network errors that will be handled by offline UI
    if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
      return null;
    }
    return event;
  },
});

function App() {
  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}

// Wrap the app with Sentry for error tracking
export default Sentry.wrap(App);
