import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
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
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineIndicator from '../components/OfflineIndicator';
import Toast from '../components/Toast';
import PwaInstallGuide from '../components/PwaInstallGuide';

import { setupGlobalErrorHandler } from '../lib/globalErrorHandler';
import { validateEnvironment } from '../lib/envValidation';
import { Logger } from '../lib/logger';
import { analytics } from '../lib/analytics';
import { useMutationQueueStore, OfflineMutation } from '../stores/useMutationQueueStore';
import { startBackgroundSync, stopBackgroundSync } from '../lib/backgroundSync';
import { checkForOTAUpdate } from '../lib/otaUpdates';
import { supabase } from '../lib/supabase';

import '../global.css';

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

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGuard() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const routeSegments = segments as readonly string[];
    const inAuthGroup = routeSegments[0] === '(auth)';
    const authScreen = routeSegments[1];
    const isPasswordRecovery = inAuthGroup && authScreen === 'reset-password';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup && !isPasswordRecovery) {
      router.replace('/');
    }
  }, [user, loading, segments]);

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

function RootLayout() {
  useEffect(() => {
    const cleanupAuth = useAuthStore.getState().initialize();
    const cleanupNetwork = useNetworkStore.getState().initialize();

    const initializeApp = async () => {
      try {
        validateEnvironment();

        if (Platform.OS !== 'web') {
          await SystemUI.setBackgroundColorAsync('#d2673d');
        }

        await useMutationQueueStore.getState().rehydrate();
        const mutationExecutor = async (mutation: OfflineMutation) => {
          if (mutation.table !== 'session_attendees') return;
          const { session_id } = mutation.payload;
          const { data, error } = await supabase.rpc('set_session_rsvp', {
            p_session_id: session_id,
            p_attending: mutation.type === 'create',
          });
          if (error) throw error;
          const result = data as { error?: string } | null;
          if (result?.error) throw new Error(result.error);
        };
        startBackgroundSync([], mutationExecutor);

        if (Platform.OS !== 'web') {
          checkForOTAUpdate({ silent: true });
        }

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
          <StatusBar style="light" />
          <OfflineIndicator />
          <Toast />
          <PwaInstallGuide />
          <AuthGuard />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
