import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import './global.css';

import ChallengeApp from './components/ChallengeApp';
import { useAuthStore } from './stores/useAuthStore';
import { useNetworkStore } from './stores/useNetworkStore';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import Onboarding from './components/Onboarding';
import PortalDimensionLogo from './components/PortalDimensionLogo';
import Toast from './components/Toast';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';

import { setupGlobalErrorHandler } from './lib/globalErrorHandler';
import { validateEnvironment } from './lib/envValidation';
import { Logger } from './lib/logger';
import { useMutationQueueStore } from './stores/useMutationQueueStore';
import { startBackgroundSync, stopBackgroundSync } from './lib/backgroundSync';
import * as Linking from 'expo-linking';

import { vexo } from 'vexo-analytics';
import { analytics } from './lib/analytics';
import { logNavigation } from './lib/sentryUtils';
import { checkForOTAUpdate } from './lib/otaUpdates';

// ─── Sentry: initialize before any component code ────────────────────────────
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  enabled: !__DEV__,
  // 20% sample rate — enough for perf insights without noise or cost
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  attachStacktrace: true,
  // Filter out common RN false positives to keep Sentry signal clean
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'Network request failed',
    'Load failed',
    'The network connection was lost',
    'TimeoutError',
    'AbortError',
  ],
  beforeSend(event: any) {
    if (__DEV__) return null;
    return event;
  },
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Navigation ref: shared across auth + main navigators ───────────────────
// Only one NavigationContainer mounts at a time so a single ref is safe.
const navigationRef = createNavigationContainerRef();

/** Walk nested nav state to get the currently active route name */
function getActiveRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined
): string {
  if (!state || typeof state.index !== 'number') return 'Unknown';
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name ?? 'Unknown';
}

/** Fires on every nav state change — posts to PostHog + Sentry breadcrumb */
function onNavigationStateChange(state: NavigationState | undefined) {
  const routeName = getActiveRouteName(state);
  analytics.screen(routeName);   // PostHog: automatic screen view tracking
  logNavigation(routeName);      // Sentry: breadcrumb for error attribution
}
// ─────────────────────────────────────────────────────────────────────────────

// Keep splash screen visible while fonts/auth load
SplashScreen.preventAutoHideAsync().catch(() => {});

const linking = {
  prefixes: [Linking.createURL('/'), 'skatequest://'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      ForgotPassword: 'forgot-password',
    },
  },
};

const Stack = createNativeStackNavigator();
const VEXO_API_KEY =
  process.env.EXPO_PUBLIC_VEXO_API_KEY ?? '62a73927-b566-4be6-9ae6-0f062705b2f8';

function RootNavigator() {
  const { user, loading } = useAuthStore();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const status = await AsyncStorage.getItem('onboarding_completed');
        setIsOnboardingComplete(status === 'true');
      } catch (error) {
        Logger.error('Failed to check onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (!isCheckingOnboarding && !loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isCheckingOnboarding, loading]);

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  if (isCheckingOnboarding || loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#05070B',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!isOnboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (user) {
    return (
      <NavigationContainer ref={navigationRef} onStateChange={onNavigationStateChange}>
        <ChallengeApp />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef} onStateChange={onNavigationStateChange}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  useEffect(() => {
    const cleanupAuth = useAuthStore.getState().initialize();
    const cleanupNetwork = useNetworkStore.getState().initialize();

    const initializeApp = async () => {
      try {
        validateEnvironment();
        await SystemUI.setBackgroundColorAsync('#d2673d');
        await useMutationQueueStore.getState().rehydrate();
        startBackgroundSync();

        // Check for OTA updates silently on launch
        checkForOTAUpdate({ silent: true });
        Logger.info('SkateQuest Mobile app initialized');
        Sentry.addBreadcrumb({
          category: 'app',
          message: 'App initialized successfully',
          level: 'info',
        });
      } catch (error) {
        Logger.error('App initialization failed:', error);
        Sentry.captureException(error, {
          tags: { error_type: 'app_init_failure' },
        });
      }
    };

    if (!__DEV__) {
      try {
        vexo(VEXO_API_KEY);
        Logger.info('Vexo analytics initialized');
      } catch (error) {
        Logger.error('Vexo analytics initialization failed:', error);
      }
    }

    analytics.track('app_launched', {
      environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    });

    setupGlobalErrorHandler();
    initializeApp();

    return () => {
      cleanupAuth();
      cleanupNetwork();
      stopBackgroundSync();
    };
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <OfflineIndicator />
      <PortalDimensionLogo />
      <Toast />
      <RootNavigator />
    </ErrorBoundary>
  );
}

// Wrap with Sentry.wrap for native crash reporting + automatic RN breadcrumbs
// @ts-ignore - Sentry.wrap exists at runtime; TS defs may be incomplete
export default (Sentry as any).wrap(App);
