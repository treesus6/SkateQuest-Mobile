const {
  withSettingsGradle,
  withGradleProperties,
  withAppBuildGradle,
} = require('@expo/config-plugins');

// Maven block injected into settings.gradle's dependencyResolutionManagement.repositories.
// This is the correct location for Gradle 7+ with FAIL_ON_PROJECT_REPOS or PREFER_SETTINGS —
// project-level allprojects{} repos are ignored in those modes.
const MAPBOX_MAVEN_BLOCK = `
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            credentials {
                username = 'mapbox'
                password = System.getenv("MAPBOX_DOWNLOADS_TOKEN") ?: System.getenv("RNMAPBOX_MAPS_DOWNLOAD_TOKEN") ?: ""
            }
            authentication {
                basic(BasicAuthentication)
            }
        }`;

const LIBCPP_PACKAGING = `    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    }`;

module.exports = function withMapboxRepo(config, { RNMapboxMapsVersion } = {}) {
  // 1. settings.gradle — inject Mapbox Maven into dependencyResolutionManagement.repositories.
  //    With FAIL_ON_PROJECT_REPOS (Gradle 7+ default) or PREFER_SETTINGS, project-level
  //    allprojects{} repository declarations are ignored. The only correct place to add
  //    a repo for all modules is inside dependencyResolutionManagement.repositories here.
  config = withSettingsGradle(config, cfg => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('api.mapbox.com/downloads/v2/releases/maven')) {
      // Insert Mapbox Maven right after the opening brace of the repositories block
      // inside dependencyResolutionManagement (lazy match stops at first occurrence).
      contents = contents.replace(
        /(dependencyResolutionManagement[\s\S]*?repositories\s*\{)/,
        `$1${MAPBOX_MAVEN_BLOCK}`
      );
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  // 2. gradle.properties — tell @rnmapbox/maps which Mapbox Maps SDK version to use
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

  // 3. app/build.gradle — avoid duplicate libc++ conflicts from multiple native libs
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
