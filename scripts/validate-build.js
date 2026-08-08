#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const skipEnv = process.argv.includes('--skip-env');
const rootDir = path.resolve(__dirname, '..');

const requiredEnv = [
  'EXPO_TOKEN',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'MAPBOX_DOWNLOADS_TOKEN',
];

const oneOfRequiredEnv = [['EXPO_PUBLIC_MAPBOX_TOKEN', 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN']];

function ensureKeys(obj, keys, label) {
  for (const key of keys) {
    if (!(key in obj)) {
      throw new Error(`Missing required key "${label}.${key}"`);
    }
  }
}

function ensureEnv(keys) {
  for (const key of keys) {
    if (!process.env[key] || process.env[key].trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

function ensureOneOfEnv(groups) {
  for (const group of groups) {
    const hasAny = group.some(key => !!process.env[key] && process.env[key].trim() !== '');
    if (!hasAny) {
      throw new Error(
        `Missing required environment variable. Set one of: ${group.join(', ')}`
      );
    }
  }
}

function validateAppConfig() {
  const appConfig = require(path.join(rootDir, 'app.config.js'));
  ensureKeys(appConfig, ['expo'], 'app.config.js');
  ensureKeys(
    appConfig.expo,
    ['name', 'slug', 'version', 'android', 'plugins', 'updates', 'extra'],
    'app.config.js expo'
  );
  ensureKeys(appConfig.expo.android, ['package'], 'app.config.js expo.android');
}

function validateEasConfig() {
  const easJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'eas.json'), 'utf8'));
  ensureKeys(easJson, ['build'], 'eas.json');
  ensureKeys(easJson.build, ['production'], 'eas.json build profiles');
}

function main() {
  validateAppConfig();
  validateEasConfig();
  if (!skipEnv) {
    ensureEnv(requiredEnv);
    ensureOneOfEnv(oneOfRequiredEnv);
  }
  console.log('✅ Build configuration validation passed.');
}

try {
  main();
} catch (error) {
  console.error(`❌ Build configuration validation failed: ${error.message}`);
  process.exit(1);
}
