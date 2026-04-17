#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/parse-eas-output.js <json-file>');
  process.exit(1);
}

const absoluteInputPath = path.resolve(inputPath);

try {
  const payload = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
  const build = Array.isArray(payload) ? payload[0] : payload;
  const buildUrl = build?.artifacts?.buildUrl || build?.logs?.url || build?.webUrl || '';
  process.stdout.write(`build_url=${buildUrl}`);
} catch (error) {
  console.error(`Failed to parse EAS output from ${absoluteInputPath}: ${error.message}`);
  process.exit(1);
}
