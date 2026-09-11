module.exports = {
  expo: {
    name: 'SkateQuest',
    slug: 'skatequest',
    owner: 'treesus',
    scheme: 'com.treesus6.skatequest',
    // Native SDK changes require a new appVersion runtime before publishing OTA updates.
    version: '1.0.2',
    runtimeVersion: {
      policy: 'appVersion',
    },
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    description:
      'The skateboarding companion app for finding real skate spots, tracking trick progression, competing in SKATE games, completing challenges for XP, joining crews, sharing clips, and exploring the skate scene.',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#d2673d',
    },
    assetBundlePatterns: ['**/*'],
    platforms: ['ios', 'android', 'web'],
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
        'RECORD_AUDIO',
      ],
      // SkateQuest uses Android's system photo/video picker for user-selected media.
      // Block broad storage/media permissions added by native packages so the Play
      // build follows Google's photo/video permissions policy.
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
      ],
    },

    plugins: [
      'expo-router',
      'expo-image',
      'expo-localization',
      'expo-video',
      'expo-build-properties',
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
      name: 'SkateQuest',
      shortName: 'SkateQuest',
      lang: 'en',
      themeColor: '#D2673D',
      backgroundColor: '#05070B',
    },

    experiments: {
      baseUrl: process.env.EXPO_PUBLIC_BASE_URL || undefined,
    },

    extra: {
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@skatequest.me',
      eas: {
        projectId: '09a104b9-9e22-4ae0-9836-2701e366d8e5',
      },
    },
  },
};
