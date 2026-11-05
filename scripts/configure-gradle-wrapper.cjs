#!/usr/bin/env node
// EAS runs this after npm install and Android expo prebuild. The generated
// Gradle wrapper defaults to a 10-second network timeout with no retries,
// which is too brittle for GitHub-hosted local builds.
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
if (!fs.existsSync(file)) {
  console.log('No Android Gradle wrapper present (non-Android build); skipping retry configuration.');
  process.exit(0);
}
let contents = fs.readFileSync(file, 'utf8');
for (const [key, value] of Object.entries({
  networkTimeout: '120000',
  retries: '4',
  retryBackOffMs: '2000',
})) {
  const line = key + '=' + value;
  const pattern = new RegExp('^' + key + '=.*$', 'm');
  contents = pattern.test(contents) ? contents.replace(pattern, line) : contents.trimEnd() + '\n' + line + '\n';
}
fs.writeFileSync(file, contents);
console.log('Configured Gradle wrapper with 120s network timeout and 4 download retries.');
