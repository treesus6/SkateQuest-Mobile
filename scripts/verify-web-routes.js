const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(process.argv[2] || 'dist');
const requiredFiles = [
  'index.html',
  'login.html',
  'signup.html',
  'forgot-password.html',
  'map.html',
  'add-spot.html',
  'spots.html',
  'crews.html',
  'quests.html',
  'skate-tv.html',
  'spot-detail.html',
  'upload-media.html',
  'sessions.html',
  'manifest.webmanifest',
  'service-worker.js',
  'videos.html',
  path.join('videos', 'index.html'),
  '404.html',
];

const missing = requiredFiles.filter(file => !fs.existsSync(path.join(outputDirectory, file)));
if (missing.length > 0) {
  throw new Error(`Web export is missing required files:\n${missing.join('\n')}`);
}

const read = file => fs.readFileSync(path.join(outputDirectory, file), 'utf8');
const contentChecks = [
  ['manifest.webmanifest', '"name": "SkateQuest"'],
  [path.join('videos', 'index.html'), 'SKATEQUEST_LEGACY_VIDEOS_REDIRECT'],
  ['404.html', 'SKATEQUEST_LEGACY_ROUTE_RECOVERY'],
  ['404.html', '/spot-detail'],
];

for (const [file, expected] of contentChecks) {
  if (!read(file).includes(expected)) {
    throw new Error(`${file} does not contain expected marker: ${expected}`);
  }
}

console.log(`Verified ${requiredFiles.length} web/PWA route artifacts in ${outputDirectory}`);
