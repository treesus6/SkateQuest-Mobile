const { withSettingsGradle } = require('@expo/config-plugins');

const MAPBOX_MAVEN = `        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = 'mapbox'
                password = System.getenv("RNMAPBOX_MAPS_DOWNLOAD_TOKEN")
            }
        }`;

module.exports = function withMapboxRepo(config) {
  return withSettingsGradle(config, config => {
    let contents = config.modResults.contents;

    // Gradle 8+ enforces repository declarations in settings.gradle.
    // Change FAIL_ON_PROJECT_REPOS to PREFER_SETTINGS so that
    // @rnmapbox/maps allprojects{} declarations don't break the build,
    // while the Mapbox Maven repo added below in settings.gradle is used.
    if (contents.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')) {
      contents = contents.replace(
        'RepositoriesMode.FAIL_ON_PROJECT_REPOS',
        'RepositoriesMode.PREFER_SETTINGS'
      );
    }

    // Add Mapbox Maven repo to dependencyResolutionManagement.repositories
    if (!contents.includes('https://api.mapbox.com/downloads/v2/releases/maven')) {
      // Insert right after the opening of the repositories block inside
      // dependencyResolutionManagement (lazy match stops at first repositories {)
      contents = contents.replace(
        /(dependencyResolutionManagement[\s\S]*?repositories\s*\{)/,
        `$1\n${MAPBOX_MAVEN}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
