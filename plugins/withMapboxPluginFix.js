// Fix for Expo not finding the Mapbox plugin
module.exports = function withMapboxPluginFix(config) {
  return {
    ...config,
    plugins: [...(config.plugins || []), ['@rnmapbox/maps/app.plugin', {}]],
  };
};
