import { act } from '@testing-library/react-native';
import { useNetworkStore } from '../../stores/useNetworkStore';
import NetInfo from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

describe('useNetworkStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the store state before each test
    useNetworkStore.setState({
      isConnected: true,
      isInternetReachable: true,
      connectionType: null,
    });
  });

  describe('initial state', () => {
    it('should have isConnected true by default', () => {
      const state = useNetworkStore.getState();

      expect(state.isConnected).toBe(true);
    });

    it('should have isInternetReachable true by default', () => {
      const state = useNetworkStore.getState();

      expect(state.isInternetReachable).toBe(true);
    });

    it('should have connectionType null by default', () => {
      const state = useNetworkStore.getState();

      expect(state.connectionType).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should subscribe to NetInfo events', () => {
      const mockUnsubscribe = jest.fn();
      mockAddEventListener.mockReturnValue(mockUnsubscribe);

      useNetworkStore.getState().initialize();

      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
      expect(typeof mockAddEventListener.mock.calls[0][0]).toBe('function');
    });

    it('should return an unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      mockAddEventListener.mockReturnValue(mockUnsubscribe);

      const unsubscribe = useNetworkStore.getState().initialize();

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should update state when network becomes connected via wifi', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      act(() => {
        netInfoCallback!({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      const state = useNetworkStore.getState();
      expect(state.isConnected).toBe(true);
      expect(state.isInternetReachable).toBe(true);
      expect(state.connectionType).toBe('wifi');
    });

    it('should update state when network becomes disconnected', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      act(() => {
        netInfoCallback!({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      const state = useNetworkStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.isInternetReachable).toBe(false);
      expect(state.connectionType).toBe('none');
    });

    it('should handle isConnected being null by defaulting to false', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      act(() => {
        netInfoCallback!({
          isConnected: null,
          isInternetReachable: null,
          type: 'unknown',
        });
      });

      const state = useNetworkStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.isInternetReachable).toBeNull();
      expect(state.connectionType).toBe('unknown');
    });

    it('should update state when switching from wifi to cellular', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      // First: wifi connected
      act(() => {
        netInfoCallback!({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      expect(useNetworkStore.getState().connectionType).toBe('wifi');

      // Then: switch to cellular
      act(() => {
        netInfoCallback!({
          isConnected: true,
          isInternetReachable: true,
          type: 'cellular',
        });
      });

      const state = useNetworkStore.getState();
      expect(state.connectionType).toBe('cellular');
      expect(state.isConnected).toBe(true);
    });

    it('should add a Sentry breadcrumb when connected', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      act(() => {
        netInfoCallback!({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'network',
        message: 'Connection changed: wifi (connected)',
        level: 'info',
        data: {
          type: 'wifi',
          isConnected: true,
          isInternetReachable: true,
        },
      });
    });

    it('should add a Sentry breadcrumb with warning level when disconnected', () => {
      let netInfoCallback: Function;
      mockAddEventListener.mockImplementation((callback) => {
        netInfoCallback = callback;
        return jest.fn();
      });

      useNetworkStore.getState().initialize();

      act(() => {
        netInfoCallback!({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'network',
        message: 'Connection changed: none (disconnected)',
        level: 'warning',
        data: {
          type: 'none',
          isConnected: false,
          isInternetReachable: false,
        },
      });
    });
  });
});
