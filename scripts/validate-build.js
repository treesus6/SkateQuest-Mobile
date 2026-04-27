#!/usr/bin/env node

const path = require('path');
const { ensureKeys, ensureEnv } = require('./build-utils');

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
  const appConfig = require(path.join(rootDir, 'app.config.js'));
  ensureKeys(appConfig, ['expo'], 'app.config.js');
  ensureKeys(
    appConfig.expo,
    ['name', 'slug', 'version', 'android', 'plugins', 'updates'],
    'app.config.js expo'
  );
  ensureKeys(appConfig.expo.android, ['package'], 'app.config.js expo.android');
}

function validateEasConfig() {
  const fs = require('fs');
  const easJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'eas.json'), 'utf8'));
  ensureKeys(easJson, ['build'], 'eas.json');
  ensureKeys(easJson.build, ['production'], 'eas.json build profiles');
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
