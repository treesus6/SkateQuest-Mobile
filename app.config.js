module.exports = ({ config }) => {
  const environment = process.env.EXPO_PUBLIC_ENV || 'development';
  const isProduction = environment === 'production';

  return {
    ...config,
    name: 'SkateQuest',
    slug: 'skatequest',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    description:
      'The ultimate skateboarding companion app. Find skate spots with an interactive map, track your trick progression, compete in SKATE games, complete challenges for XP, and level up your skating journey. Features AI trick analysis, social feed, crew system, and a comprehensive database of 27,000+ skateparks worldwide.',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#d2673d',
    },
    platforms: ['ios', 'android'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.skatequest.app',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'SkateQuest needs your location to show nearby skate spots on the map.',
        NSCameraUsageDescription:
          'SkateQuest needs camera access to record your tricks and upload videos.',
        NSPhotoLibraryUsageDescription:
          'SkateQuest needs photo library access to upload photos and videos of your tricks.',
        NSMicrophoneUsageDescription:
          'SkateQuest needs microphone access to record audio with your trick videos.',
      },
    },
    android: {
      package: 'com.skatequest.app',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#d2673d',
      },
      navigationBar: {
        backgroundColor: '#d2673d',
        barStyle: 'light-content',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },
    plugins: [
      'expo-system-ui',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow SkateQuest to access your camera to record tricks.',
          microphonePermission:
            'Allow SkateQuest to access your microphone to record audio with videos.',
          recordAudioAndroid: true,
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow SkateQuest to use your location to find nearby skate spots.',
        },
      ],
      [
        '@rnmapbox/maps',
        {
          RNMapboxMapsVersion: '11.0.0',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '09a104b9-9e22-4ae0-9836-2701e366d8e5',
      },
      // Environment configuration
      environment: environment,
      // Mapbox tokens (public token is safe to expose)
      mapboxAccessToken:
        process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
        'pk.eyJ1IjoidHJlZXN1cyIsImEiOiJja3VtaHBqNDEwaWk5Mm9veGQycm5xdjcyIn0.v14C80FeOwVNzQlkvick6A',
      // Supabase configuration
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hreeuqdgrwvnxquxohod.supabase.co',
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZWV1cWRncnd2bnhxdXhvaG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDkzMjksImV4cCI6MjA3NDY4NTMyOX0.fAHN4tvPdebHzqpgp0Q-g3mLRBfTca5WguRNjiQ1dus',
      // Sentry DSN
      sentryDsn:
        process.env.EXPO_PUBLIC_SENTRY_DSN ||
        'https://fb4b61c45d4df52d09c1a6a589cd180f@o4510502830538752.ingest.us.sentry.io/4510522824261632',
      // PostHog Analytics
      posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    },
  };
};
