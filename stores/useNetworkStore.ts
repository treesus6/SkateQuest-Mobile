import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  initialize: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,

  initialize: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({
        isConnected: state.isConnected ?? false,
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
    });

    return unsubscribe;
  },
}));
