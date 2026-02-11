const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withMapboxRepo(config) {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{/,
        `allprojects {
    repositories {
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = 'mapbox'
                password = System.getenv("RNMAPBOX_MAPS_DOWNLOAD_TOKEN")
            }
        }
    }`
      );
    }
    return config;
  });
};
