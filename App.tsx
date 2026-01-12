import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

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

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Validate environment variables on app startup
    try {
      validateEnvironment();
      Logger.info('SkateQuest Mobile app initialized');
    } catch (error) {
      Logger.error('Environment validation failed:', error);
      throw error;
    }

    // Set up global error handler
    setupGlobalErrorHandler();
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
