import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';

// Initialize Sentry
// Get your DSN from: https://sentry.io/settings/projects/YOUR_PROJECT/keys/
// Uncomment and add your DSN when ready to use Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN, // Only enable if DSN is provided
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,
  // Enable automatic session tracking
  enableAutoSessionTracking: true,
  // Session timeout in milliseconds (default is 30000ms/30s)
  sessionTrackingIntervalMillis: 30000,
  // Enable automatic breadcrumbs for navigation, console, and XHR
  enableAutoPerformanceTracing: true,
  // Set environment
  environment: __DEV__ ? 'development' : 'production',
  // Enable debug mode in development
  debug: __DEV__,
});

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Wrap the app with Sentry for error tracking
export default Sentry.wrap(App);
