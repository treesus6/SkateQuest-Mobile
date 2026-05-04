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

// Regex guards — more precise than .includes() and avoids CodeQL URL-substring-sanitization flag.
// Each checks for the actual structural pattern we care about, not a raw URL substring.
const MAPBOX_MAVEN_PRESENT = /maven\s*\{[^}]*api\.mapbox\.com\/downloads\/v2\/releases\/maven/;
const PREFER_SETTINGS_PRESENT = /RepositoriesMode\.PREFER_SETTINGS/;
const LIBCPP_PRESENT = /pickFirst\s+'lib\/x86\/libc\+\+_shared\.so'/;
const SIGNING_CONFIG_PRESENT = /signingConfigs\s*\{/;

/**
 * Validate a version string before injecting it into a Gradle file.
 * Only semver-compatible strings are allowed (digits, dots, hyphens, alphanumerics).
 * This prevents any code-injection through the RNMapboxMapsVersion config option.
 */
function sanitizeVersion(version) {
  if (typeof version !== 'string') {
    throw new Error('withMapboxRepo: RNMapboxMapsVersion must be a string');
  }
  if (!/^[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9._-]+)?(\+[a-zA-Z0-9._-]+)?$/.test(version)) {
    throw new Error(
      `withMapboxRepo: RNMapboxMapsVersion "${version}" is not a valid version string. ` +
      'Only semver-compatible values are accepted (e.g. "11.20.1").'
    );
  }
  return version;
}

module.exports = function withMapboxRepo(config, { RNMapboxMapsVersion } = {}) {
  // 1. settings.gradle — switch to PREFER_SETTINGS so allprojects.repositories works
  config = withSettingsGradle(config, cfg => {
    let contents = cfg.modResults.contents;
    if (!PREFER_SETTINGS_PRESENT.test(contents) &&
        /RepositoriesMode\.FAIL_ON_PROJECT_REPOS/.test(contents)) {
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
    if (!MAPBOX_MAVEN_PRESENT.test(cfg.modResults.contents)) {
      cfg.modResults.contents += '\n' + MAPBOX_MAVEN;
    }
    return cfg;
  });

  // 3. gradle.properties — tell @rnmapbox/maps which Mapbox Maps SDK version to use
  if (RNMapboxMapsVersion) {
    const safeVersion = sanitizeVersion(RNMapboxMapsVersion);
    config = withGradleProperties(config, cfg => {
      cfg.modResults = cfg.modResults.filter(
        item => !(item.type === 'property' && item.key === 'expoRNMapboxMapsVersion')
      );
      cfg.modResults.push({
        type: 'property',
        key: 'expoRNMapboxMapsVersion',
        value: safeVersion,
      });
      return cfg;
    });
  }

  // 4. app/build.gradle — avoid duplicate libc++ conflicts from multiple native libs
  config = withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    if (!LIBCPP_PRESENT.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /^(\s*android\s*\{)/m,
        `$1\n${LIBCPP_PACKAGING}`
      );
    }
    return cfg;
  });

  return config;
};

// Export a separate signing plugin for GitHub Actions builds
module.exports.withAndroidSigning = function withAndroidSigning(config) {
  const { withAppBuildGradle } = require('@expo/config-plugins');

  return withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') return cfg;

    const signingConfig = `
    signingConfigs {
        release {
            def keystorePath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }`;

    if (!SIGNING_CONFIG_PRESENT.test(cfg.modResults.contents)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /^(\s*android\s*\{)/m,
        `$1\n${signingConfig}`
      );
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /release\s*\{(\s*)/,
        `release {\n            signingConfig signingConfigs.release\n            `
      );
    }
    return cfg;
  });
};
