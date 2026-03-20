const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const defaultAssetExts = config.resolver.assetExts;
  config.resolver.assetExts = [
    ...defaultAssetExts,
    'db',
    'sqlite',
    'mp3',
    'wav',
    'm4a',
    'ttf',
    'otf',
    'woff',
    'woff2',
    'obj',
    'mtl',
    'fbx',
    'mp4',
    'mov',
    'avi'
  ];

  return config;
})();
