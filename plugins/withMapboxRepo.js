const {
  withSettingsGradle,
  withGradleProperties,
  withAppBuildGradle,
} = require('@expo/config-plugins');

const MAPBOX_MAVEN = `        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = 'mapbox'
                password = System.getenv("MAPBOX_DOWNLOADS_TOKEN") ?: System.getenv("RNMAPBOX_MAPS_DOWNLOAD_TOKEN")
            }
        }`;

const LIBCPP_PACKAGING = `    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    }`;

module.exports = function withMapboxRepo(config, { RNMapboxMapsVersion } = {}) {
  // 1. settings.gradle — add Mapbox Maven repo + fix PREFER_SETTINGS
  config = withSettingsGradle(config, cfg => {
    let contents = cfg.modResults.contents;

    if (contents.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')) {
      contents = contents.replace(
        'RepositoriesMode.FAIL_ON_PROJECT_REPOS',
        'RepositoriesMode.PREFER_SETTINGS'
      );
    }

    if (!/url\s+'https:\/\/api\.mapbox\.com\/downloads\/v2\/releases\/maven'/.test(contents)) {
      contents = contents.replace(
        /(dependencyResolutionManagement[\s\S]*?repositories\s*\{)/,
        `$1\n${MAPBOX_MAVEN}`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  // 2. gradle.properties — set expoRNMapboxMapsVersion so the native module
  //    knows which Mapbox Maps SDK version to use (replaces @rnmapbox/maps plugin)
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

  // 3. app/build.gradle — add packagingOptions to avoid duplicate libc++ conflicts
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
