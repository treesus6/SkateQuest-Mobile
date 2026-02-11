import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';

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

import { setupGlobalErrorHandler } from './lib/globalErrorHandler';
import { validateEnvironment } from './lib/envValidation';
import { Logger } from './lib/logger';
import { useMutationQueueStore } from './stores/useMutationQueueStore';
import { startBackgroundSync, stopBackgroundSync } from './lib/backgroundSync';

// Initialize Mapbox
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const Stack = createNativeStackNavigator();

// Root Navigator that handles auth state
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

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  // Show nothing while checking onboarding or auth status
  if (isCheckingOnboarding || loading) {
    return null;
  }

  // Show onboarding if not completed
  if (!isOnboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Show main app if user is logged in
  if (user) {
    return (
      <NavigationContainer>
        <ChallengeApp />
      </NavigationContainer>
    );
  }

  // Show auth screens if not logged in
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    // Initialize stores
    const cleanupAuth = useAuthStore.getState().initialize();
    const cleanupNetwork = useNetworkStore.getState().initialize();

    // Initialize app
    const initializeApp = async () => {
      try {
        validateEnvironment();
        await SystemUI.setBackgroundColorAsync('#d2673d');

        // Rehydrate offline mutation queue from local storage
        await useMutationQueueStore.getState().rehydrate();

        // Start background sync for key data and queued mutations
        startBackgroundSync();

        Logger.info('SkateQuest Mobile app initialized');
      } catch (error) {
        Logger.error('App initialization failed:', error);
        throw error;
      }
    };

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
