import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import Mapbox from '@rnmapbox/maps';

import AppNavigator from './navigation/AppNavigator';
import AuthProvider from './contexts/AuthContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ChallengeProvider } from './contexts/ChallengeContext';
import PortalDimensionLogo from './components/PortalDimensionLogo';
import Toast from './components/Toast';

import { setupGlobalErrorHandler } from './lib/globalErrorHandler';
import { validateEnvironment } from './lib/envValidation';
import { Logger } from './lib/logger';

// Initialize Mapbox
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        validateEnvironment();
        await SystemUI.setBackgroundColorAsync('#d2673d');
        Logger.info('SkateQuest Mobile initialized');
      } catch (error) {
        Logger.error('App initialization failed:', error);
        throw error;
      }
    };

    setupGlobalErrorHandler();
    initializeApp();
  }, []);

  return (
    <NetworkProvider>
      <AuthProvider>
        <ChallengeProvider>
          <StatusBar style="light" />
          <PortalDimensionLogo />
          <Toast />
          <AppNavigator />
        </ChallengeProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}
