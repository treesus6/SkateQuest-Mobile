import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage - required by persistentCache and useMutationQueueStore
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(path => `skatequest://${path}`),
}));

// Mock Mapbox
jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    setAccessToken: jest.fn(),
    MapView: 'MapView',
    Camera: 'Camera',
    PointAnnotation: 'PointAnnotation',
  },
  MapView: 'MapView',
  Camera: 'Camera',
  PointAnnotation: 'PointAnnotation',
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Home: () => null,
  Trophy: () => null,
  MapPin: () => null,
  Users: () => null,
  User: () => null,
  Calendar: () => null,
  X: () => null,
  Crosshair: () => null,
  Navigation: () => null,
  Plus: () => null,
  Star: () => null,
  QrCode: () => null,
  Gamepad2: () => null,
  Music: () => null,
  ShoppingBag: () => null,
  Zap: () => null,
  BarChart3: () => null,
  Flame: () => null,
  Award: () => null,
  Bug: () => null,
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    setTag: jest.fn(),
    finish: jest.fn(),
  })),
}));

// Mock React Native modules
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path may not exist in all RN versions
}

// Mock Animated to prevent issues with Animated.loop in components like LoadingSkeleton
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.loop = jest.fn((animation) => ({
    start: jest.fn((cb) => cb && cb({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  return RN;
});
try {
  jest.mock('react-native-maps', () => {
    const React = require('react');
    return {
      __esModule: true,
      default: Object.assign(React.forwardRef(() => null), { displayName: 'MockMapView' }),
      Marker: () => null,
      Callout: () => null,
    };
  });
} catch {
  // react-native-maps not installed (using Mapbox)
}

// Mock Supabase
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}));

// Setup environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
process.env.EXPO_PUBLIC_SENTRY_DSN = '';
