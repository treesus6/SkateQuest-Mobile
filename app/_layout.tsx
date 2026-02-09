import '../global.css';

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';

import AuthProvider, { useAuth } from '../contexts/AuthContext';
import { ChallengeProvider } from '../contexts/ChallengeContext';
import { NetworkProvider } from '../contexts/NetworkContext';
import ErrorBoundary from '../components/ErrorBoundary';
import OfflineIndicator from '../components/OfflineIndicator';
import PortalDimensionLogo from '../components/PortalDimensionLogo';
import Toast from '../components/Toast';

import { setupGlobalErrorHandler } from '../lib/globalErrorHandler';
import { validateEnvironment } from '../lib/envValidation';
import { Logger } from '../lib/logger';

// Initialize Sentry
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableInExpoDevelopment: false,
    debug: __DEV__,
  });
}

// Initialize Mapbox
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const segments = useSegments();
  const router = useRouter();

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
    if (isCheckingOnboarding || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (isOnboardingComplete && !user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isOnboardingComplete && user && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, loading, isCheckingOnboarding, isOnboardingComplete, segments]);

  if (isCheckingOnboarding || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#d2673d' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        validateEnvironment();
        await SystemUI.setBackgroundColorAsync('#d2673d');
        Logger.info('SkateQuest Mobile app initialized');
      } catch (error) {
        Logger.error('App initialization failed:', error);
        throw error;
      }
    };

    setupGlobalErrorHandler();
    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <ChallengeProvider>
            <StatusBar style="light" />
            <OfflineIndicator />
            <PortalDimensionLogo />
            <Toast />
            <RootLayoutNav />
          </ChallengeProvider>
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
