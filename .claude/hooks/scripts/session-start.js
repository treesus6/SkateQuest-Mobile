'use strict';

const fs = require('fs');
const path = require('path');

const projectDir = process.env.ERNE_PROJECT_DIR || process.cwd();

function dirExists(relPath) {
  try {
    return fs.statSync(path.join(projectDir, relPath)).isDirectory();
  } catch {
    return false;
  }
}

function findFilesWithExt(dir, ext) {
  const fullDir = path.join(projectDir, dir);
  try {
    const entries = fs.readdirSync(fullDir, {
      withFileTypes: true,
      recursive: true,
    });
    return entries.some((entry) => entry.isFile() && entry.name.endsWith(ext));
  } catch {
    return false;
  }
}

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectDir, relPath), 'utf8'));
  } catch {
    return null;
  }
}

function hasExpoDependency(pkg) {
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return 'expo' in deps;
}

const layers = ['common'];
const pkg = readJson('package.json');
const settings = readJson(path.join('.claude', 'settings.json'));
const hasIosDir = dirExists('ios');
const hasAndroidDir = dirExists('android');

if (hasExpoDependency(pkg)) {
  layers.push('expo');
} else if (hasIosDir && hasAndroidDir) {
  layers.push('bare-rn');
}

if (hasIosDir && findFilesWithExt('ios', '.swift')) {
  layers.push('native-ios');
}

if (hasAndroidDir && findFilesWithExt('android', '.kt')) {
  layers.push('native-android');
}

const parts = ['Claude'];

if (settings?.profile) {
  parts.push(settings.profile);
}

parts.push(`layers: ${layers.join(', ')}`);

console.error(parts.join(' | '));

if (layers.length <= 1) {
  process.exit(2);
} else {
  process.exit(0);
}
