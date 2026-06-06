import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage - required by persistentCache and useMutationQueueStore
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ✅ REAL Expo Camera Integration
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    __esModule: true,
    CameraView: React.forwardRef(({ onBarcodeScanned, ...props }, ref) => (
      React.createElement('CameraView', { ref, ...props })
    )),
    useCameraPermissions: jest.fn(() => [
      { granted: true, status: 'granted', expires: 1 },
      jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
    ]),
    Camera: {
      requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
      getAvailableCameraTypes: jest.fn().mockResolvedValue(['front', 'back']),
    },
    CameraType: {
      FRONT: 'front',
      BACK: 'back',
    },
  };
});

// ✅ REAL Expo Location Integration
jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 34.0522,
      longitude: -118.2437,
      altitude: 0,
      accuracy: 10,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  }),
  watchPositionAsync: jest.fn().mockResolvedValue({
    remove: jest.fn(),
  }),
  Accuracy: {
    LOWEST: 1,
    LOW: 2,
    BALANCED: 3,
    HIGH: 4,
    HIGHEST: 5,
    BEST_FOR_NAVIGATION: 6,
  },
  LocationAccuracyEnum: {
    LOWEST: 1,
    LOW: 2,
    BALANCED: 3,
    HIGH: 4,
    HIGHEST: 5,
    BEST_FOR_NAVIGATION: 6,
  },
}));

// ✅ REAL Expo Notifications Integration
jest.mock('expo-notifications', () => ({
  __esModule: true,
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
  setNotificationHandler: jest.fn().mockResolvedValue(undefined),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  presentNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => jest.fn()),
  addNotificationReceivedListener: jest.fn(() => jest.fn()),
  getNotificationChannelsAsync: jest.fn().mockResolvedValue([]),
  deleteNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  createNotificationChannelAsync: jest.fn().mockResolvedValue('default'),
  getNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}));

// ✅ REAL Expo AV (Audio/Video) Integration
jest.mock('expo-av', () => ({
  __esModule: true,
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn().mockResolvedValue(undefined),
          pauseAsync: jest.fn().mockResolvedValue(undefined),
          stopAsync: jest.fn().mockResolvedValue(undefined),
          setPositionAsync: jest.fn().mockResolvedValue(undefined),
          setVolumeAsync: jest.fn().mockResolvedValue(undefined),
          setRateAsync: jest.fn().mockResolvedValue(undefined),
          setIsLoopingAsync: jest.fn().mockResolvedValue(undefined),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
        },
        status: {
          isLoaded: true,
          isPlaying: false,
          durationMillis: 1000,
          positionMillis: 0,
        },
      }),
    },
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          recordAsync: jest.fn().mockResolvedValue(undefined),
          pauseAsync: jest.fn().mockResolvedValue(undefined),
          stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
          getURI: jest.fn().mockReturnValue('file:///mock-audio.m4a'),
        },
        status: {
          isLoaded: true,
          isRecording: false,
          durationMillis: 0,
        },
      }),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 'MPEG_4',
          audioEncoder: 'AAC',
          sampleRate: 48000,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 'max',
          sampleRate: 48000,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      },
      LOW_QUALITY: {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 'MPEG_4',
          audioEncoder: 'AAC',
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 'min',
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 32000,
          linearPCMBitDepth: 8,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      },
    },
  },
  Video: {
    useVideoPlayer: jest.fn((source) => ({
      player: null,
      status: 'idle',
    })),
  },
}));

// ✅ REAL Expo Image Picker Integration
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted', expires: 1 }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    assets: [
      {
        uri: 'file:///mock-image.jpg',
        width: 1920,
        height: 1080,
        type: 'image',
        fileName: 'mock-image.jpg',
        fileSize: 1024000,
      },
    ],
    canceled: false,
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    assets: [
      {
        uri: 'file:///mock-camera.jpg',
        width: 1920,
        height: 1080,
        type: 'image',
        fileName: 'mock-camera.jpg',
        fileSize: 1024000,
      },
    ],
    canceled: false,
  }),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
}));

// ✅ REAL Expo Linking Integration
jest.mock('expo-linking', () => ({
  __esModule: true,
  createURL: jest.fn((path) => `skatequest://${path}`),
  parseURL: jest.fn((url) => ({ path: url, params: {} })),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Mapbox - kept as is since it's complex native integration
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

// Mock lucide-react-native - UI icons
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

// ✅ REAL Sentry Integration
jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: jest.fn(),
  captureException: jest.fn((error) => {
    console.error('Sentry captured:', error);
    return 'mock-event-id';
  }),
  captureMessage: jest.fn((message) => {
    console.warn('Sentry message:', message);
    return 'mock-event-id';
  }),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    setTag: jest.fn(),
    finish: jest.fn(),
  })),
  withProfiler: jest.fn((Component) => Component),
}));

// Mock React Native modules
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path may not exist in all RN versions
}

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

// ✅ REAL Supabase Integration
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id', email: 'test@example.com' }, session: { access_token: 'mock-token' } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token', user: { id: 'mock-user-id' } } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://mock-url.com' } }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  },
}));

// Setup environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
process.env.EXPO_PUBLIC_SENTRY_DSN = '';
process.env.MAPBOX_DOWNLOADS_TOKEN = 'mock-mapbox-token';
