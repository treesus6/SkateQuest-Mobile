import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import ChallengeApp from './components/ChallengeApp';
import AuthProvider from './contexts/AuthContext';
import NetworkProvider from './contexts/NetworkContext';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineIndicator from './components/OfflineIndicator';
import Onboarding from './components/Onboarding';
import PortalDimensionLogo from './components/PortalDimensionLogo';
import SpotConditionsWidget from './components/SpotConditionsWidget';

import parks from './data/parks.json';

export default function App() {
  return (
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <OfflineIndicator />
            <PortalDimensionLogo />

            {/* Onboarding → Main App */}
            <Onboarding />
            <ChallengeApp />

            <SpotConditionsWidget parks={parks} />
          </NavigationContainer>
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}
