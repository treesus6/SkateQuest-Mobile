module.exports = {
  expo: {
    name: 'SkateQuest',
    slug: 'skatequest',
    owner: 'treesus',
    scheme: 'skatequest',
    version: '1.0.0',
    runtimeVersion: {
      policy: 'appVersion',
    },
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
    assetBundlePatterns: ['**/*'],
    platforms: ['ios', 'android'],
    jsEngine: 'hermes',
    updates: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/09a104b9-9e22-4ae0-9836-2701e366d8e5',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.treesus6.skatequest',
      buildNumber: '1',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'SkateQuest needs your location to show nearby skate spots on the map.',
        NSCameraUsageDescription:
          'SkateQuest needs camera access to record your tricks and upload videos.',
        NSPhotoLibraryUsageDescription:
          'SkateQuest needs photo library access to upload photos and videos of your tricks.',
        NSPhotoLibraryAddUsageDescription:
          'SkateQuest needs permission to save trick videos and photos to your library.',
        NSMicrophoneUsageDescription:
          'SkateQuest needs microphone access to record audio with your trick videos.',
      },
    },

    android: {
      package: 'com.treesus6.skatequest',
      enableProguardInReleaseBuilds: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#d2673d',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'RECORD_AUDIO',
      ],
    },

    plugins: [
      [
        './plugins/withMapboxRepo',
        {
          RNMapboxMapsVersion: '11.20.1',
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOADS_TOKEN,
        },
      ],

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
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#d2673d',
        },
      ],
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission: 'SkateQuest needs access to your photos to upload trick videos.',
        },
      ],
    ],

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/icon.png',
    },

    extra: {
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
      eas: {
        projectId: '09a104b9-9e22-4ae0-9836-2701e366d8e5',
      },
    },
  },
};
