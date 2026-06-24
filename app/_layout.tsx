import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '../stores/useAuthStore';
import { useNetworkStore } from '../stores/useNetworkStore';
import { ChallengeProvider } from '../contexts/ChallengeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineIndicator from '../components/OfflineIndicator';
import PortalDimensionLogo from '../components/PortalDimensionLogo';
import Toast from '../components/Toast';

import { setupGlobalErrorHandler } from '../lib/globalErrorHandler';
import { validateEnvironment } from '../lib/envValidation';
import { Logger } from '../lib/logger';
import { analytics } from '../lib/analytics';
import { useMutationQueueStore, OfflineMutation } from '../stores/useMutationQueueStore';
import { startBackgroundSync, stopBackgroundSync } from '../lib/backgroundSync';
import { supabase } from '../lib/supabase';
import { checkForOTAUpdate } from '../lib/otaUpdates';

import '../global.css';

// ─── Sentry: init before any component renders ───────────────────────────────
const sentryDsn =
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ??
  process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  enabled: !__DEV__,
  tracesSampleRate: __DEV__ ? 0 : 0.2,
  attachStacktrace: true,
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'Network request failed',
    'Load failed',
    'The network connection was lost',
    'TimeoutError',
    'AbortError',
  ],
  beforeSend(event: Sentry.ErrorEvent) {
    if (__DEV__) return null;
    return event;
  },
});
// ─────────────────────────────────────────────────────────────────────────────

// Keep splash visible while auth resolves
SplashScreen.preventAutoHideAsync().catch(() => {});

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not signed in — send to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Signed in — send to app
      router.replace('/(tabs)/');
    }
  }, [user, loading, segments]);

  // Hide splash once auth state is known
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View className="flex-1 bg-[#05070B] justify-center items-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  return <Slot />;
}
// ─────────────────────────────────────────────────────────────────────────────

function RootLayout() {
  useEffect(() => {
    const cleanupAuth = useAuthStore.getState().initialize();
    const cleanupNetwork = useNetworkStore.getState().initialize();

    const initializeApp = async () => {
      try {
        validateEnvironment();
        await SystemUI.setBackgroundColorAsync('#d2673d');
        await useMutationQueueStore.getState().rehydrate();
        const mutationExecutor = async (mutation: OfflineMutation) => {
          if (mutation.table === 'session_attendees') {
            if (mutation.type === 'create') {
              const { error } = await supabase.from('session_attendees').insert(mutation.payload);
              if (error) throw error;
            } else if (mutation.type === 'delete') {
              const { session_id, user_id } = mutation.payload;
              const { error } = await supabase
                .from('session_attendees')
                .delete()
                .eq('session_id', session_id)
                .eq('user_id', user_id);
              if (error) throw error;
            }
          }
        };
        startBackgroundSync([], mutationExecutor);
        checkForOTAUpdate({ silent: true });
        Logger.info('SkateQuest initialized');
        Sentry.addBreadcrumb({
          category: 'app',
          message: 'App initialized',
          level: 'info',
        });
      } catch (error) {
        Logger.error('App init failed:', error);
        Sentry.captureException(error, {
          tags: { error_type: 'app_init_failure' },
        });
      }
    };

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ChallengeProvider>
            <StatusBar style="light" />
            <OfflineIndicator />
            <PortalDimensionLogo />
            <Toast />
            <AuthGuard />
          </ChallengeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap entire app with Sentry for native crash reporting
export default Sentry.wrap(RootLayout);
