#!/usr/bin/env node

const path = require('path');
const { readJson, ensureKeys, ensureEnv } = require('./build-utils');

const skipEnv = process.argv.includes('--skip-env');
const rootDir = path.resolve(__dirname, '..');

const requiredEnv = [
  'EXPO_TOKEN',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'MAPBOX_DOWNLOADS_TOKEN',
];

function validateAppConfig() {
  const appJson = readJson(path.join(rootDir, 'app.json'));
  ensureKeys(appJson, ['expo'], 'app.json');
  ensureKeys(
    appJson.expo,
    ['name', 'slug', 'version', 'ios', 'android', 'plugins', 'updates'],
    'app.json expo'
  );
  ensureKeys(appJson.expo.ios, ['bundleIdentifier', 'buildNumber'], 'app.json expo.ios');
  ensureKeys(appJson.expo.android, ['package', 'versionCode'], 'app.json expo.android');

  const appConfig = require(path.join(rootDir, 'app.config.js'));
  ensureKeys(appConfig, ['expo'], 'app.config.js');
  ensureKeys(
    appConfig.expo,
    ['name', 'slug', 'version', 'ios', 'android', 'plugins', 'updates'],
    'app.config.js expo'
  );
  ensureKeys(appConfig.expo.ios, ['bundleIdentifier', 'buildNumber'], 'app.config.js expo.ios');
  ensureKeys(appConfig.expo.android, ['package', 'versionCode'], 'app.config.js expo.android');
}

function validateEasConfig() {
  const easJson = readJson(path.join(rootDir, 'eas.json'));
  ensureKeys(easJson, ['cli', 'build', 'submit'], 'eas.json');
  ensureKeys(easJson.build, ['development', 'preview', 'production'], 'eas.json build profiles');
  ensureKeys(easJson.build.preview, ['channel'], 'eas.json preview profile');
  ensureKeys(easJson.build.production, ['channel', 'autoIncrement'], 'eas.json production profile');
}

function main() {
  validateAppConfig();
  validateEasConfig();
  ensureEnv(requiredEnv, { skipEnv });

  console.log('✅ Build configuration validation passed.');
}

try {
  main();
} catch (error) {
  console.error(`❌ Build configuration validation failed: ${error.message}`);
  process.exit(1);
}
