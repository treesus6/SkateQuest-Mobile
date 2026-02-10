const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for SkateQuest Mobile
 * Optimized for build performance and bundle size
 */
module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Enable minification in production
  config.transformer.minifierPath = require.resolve('metro-minify-terser');
  config.transformer.minifierConfig = {
    compress: {
      // Drop console.log in production builds
      drop_console: true,
      // Remove unused code
      dead_code: true,
      // Optimize conditionals
      conditionals: true,
      // Optimize comparisons
      comparisons: true,
    },
    mangle: {
      // Mangle top-level names for smaller bundle
      toplevel: false,
      // Keep function names for better debugging
      keep_fnames: false,
    },
    output: {
      // Remove comments
      comments: false,
      // Use ASCII-only output
      ascii_only: true,
    },
  };

  // Optimize asset handling - extend default assetExts
  const defaultAssetExts = config.resolver.assetExts;
  config.resolver.assetExts = [
    ...defaultAssetExts,
    // Database files
    'db',
    'sqlite',
    // Audio files (some may already be in defaults)
    'mp3',
    'wav',
    'm4a',
    // Font files (some may already be in defaults)
    'ttf',
    'otf',
    'woff',
    'woff2',
    // 3D model files
    'obj',
    'mtl',
    'fbx',
    // Video files (some may already be in defaults)
    'mp4',
    'mov',
    'avi',
  ];

  // Keep default source extensions to maintain compatibility
  // The default config already includes the necessary extensions

  return config;
})();
