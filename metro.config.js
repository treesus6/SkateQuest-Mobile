const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...config.resolver.assetExts,
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
  'avi',
];

module.exports = withNativeWind(config, { input: './global.css' });
