import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
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
  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Validate environment variables on app startup
        validateEnvironment();

        // Configure system UI to match brand colors
        // Set root background color to brand color
        await SystemUI.setBackgroundColorAsync('#d2673d');

        Logger.info('SkateQuest Mobile app initialized with system UI configured');
      } catch (error) {
        Logger.error('App initialization failed:', error);
        throw error;
      }
    };

    // Set up global error handler
    setupGlobalErrorHandler();

    // Initialize app
    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <OfflineIndicator />
            <PortalDimensionLogo />
            <Toast />

            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Onboarding" component={Onboarding} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="Main" component={ChallengeApp} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
