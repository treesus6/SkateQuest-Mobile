import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from '@rnmapbox/maps';

import ChallengeApp from './components/ChallengeApp';
import AuthProvider from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
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

// Initialize Mapbox
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const Stack = createNativeStackNavigator();

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Validate environment variables on app startup
        validateEnvironment();

        // Configure system UI to match brand colors
        // Set root background color to brand color
        await SystemUI.setBackgroundColorAsync('#d2673d');

        // Check if onboarding has been completed
        const onboardingStatus = await AsyncStorage.getItem('onboarding_completed');
        setIsOnboardingComplete(onboardingStatus === 'true');

        Logger.info('SkateQuest Mobile app initialized with system UI configured');
      } catch (error) {
        Logger.error('App initialization failed:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    };

    // Set up global error handler
    setupGlobalErrorHandler();

    // Initialize app
    initializeApp();
  }, []);

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <OfflineIndicator />
          <PortalDimensionLogo />
          <Toast />

          {!isOnboardingComplete ? (
            <Onboarding onComplete={handleOnboardingComplete} />
          ) : (
            <NavigationContainer>
              <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName="Login"
              >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Main" component={ChallengeApp} />
              </Stack.Navigator>
            </NavigationContainer>
          )}
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
