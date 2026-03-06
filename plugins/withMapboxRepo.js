const {
  withSettingsGradle,
  withGradleProperties,
  withAppBuildGradle,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

// Appended to android/build.gradle so Gradle can resolve Mapbox artifacts.
// Only adds credentials when a token env var is present; otherwise tries anonymously
// (Mapbox removed mandatory auth for public SDK artifacts as of 2024).
const MAPBOX_MAVEN = `
allprojects {
  repositories {
    maven {
      url 'https://api.mapbox.com/downloads/v2/releases/maven'
      def mapboxToken = System.getenv("MAPBOX_DOWNLOADS_TOKEN") ?: System.getenv("RNMAPBOX_MAPS_DOWNLOAD_TOKEN")
      if (mapboxToken) {
        authentication { basic(BasicAuthentication) }
        credentials {
          username = 'mapbox'
          password = mapboxToken
        }
      }
    }
  }
}`;

const LIBCPP_PACKAGING = `    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    }`;

module.exports = function withMapboxRepo(config, { RNMapboxMapsVersion } = {}) {
  // 1. settings.gradle — switch to PREFER_SETTINGS so allprojects.repositories works
  config = withSettingsGradle(config, cfg => {
    let contents = cfg.modResults.contents;
    if (contents.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')) {
      contents = contents.replace(
        'RepositoriesMode.FAIL_ON_PROJECT_REPOS',
        'RepositoriesMode.PREFER_SETTINGS'
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  // 2. android/build.gradle — add Mapbox Maven as an allprojects block
  config = withProjectBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (!cfg.modResults.contents.includes('api.mapbox.com/downloads/v2/releases/maven')) {
      cfg.modResults.contents += '\n' + MAPBOX_MAVEN;
    }
    return cfg;
  });

  // 3. gradle.properties — tell @rnmapbox/maps which Mapbox Maps SDK version to use
  if (RNMapboxMapsVersion) {
    config = withGradleProperties(config, cfg => {
      cfg.modResults = cfg.modResults.filter(
        item => !(item.type === 'property' && item.key === 'expoRNMapboxMapsVersion')
      );
      cfg.modResults.push({
        type: 'property',
        key: 'expoRNMapboxMapsVersion',
        value: RNMapboxMapsVersion,
      });
      return cfg;
    });
  }

  // 4. app/build.gradle — avoid duplicate libc++ conflicts from multiple native libs
  config = withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (!cfg.modResults.contents.includes("pickFirst 'lib/x86/libc++_shared.so'")) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /^(\s*android\s*\{)/m,
        `$1\n${LIBCPP_PACKAGING}`
      );
    }
    return cfg;
  });

  return config;
};
