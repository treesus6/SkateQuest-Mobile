import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { onNetworkReconnect } from '../lib/backgroundSync';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  initialize: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,

  initialize: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasConnected = get().isConnected;
      const isNowConnected = state.isConnected ?? false;

      set({
        isConnected: isNowConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });

      Sentry.addBreadcrumb({
        category: 'network',
        message: `Connection changed: ${state.type} (${state.isConnected ? 'connected' : 'disconnected'})`,
        level: state.isConnected ? 'info' : 'warning',
        data: {
          type: state.type,
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
        },
      });

      // Trigger sync when reconnecting after being offline
      if (!wasConnected && isNowConnected) {
        onNetworkReconnect();
      }
    });

    return unsubscribe;
  },
}));
