const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function ensureKeys(obj, keys, label) {
  const missing = keys.filter(key => obj?.[key] === undefined || obj?.[key] === null);
  if (missing.length > 0) {
    throw new Error(`${label} is missing required keys: ${missing.join(', ')}`);
  }
}

function ensureEnv(requiredEnv, { skipEnv = false } = {}) {
  if (skipEnv) {
    return;
  }

  const missing = requiredEnv.filter(envName => !process.env[envName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  readJson,
  ensureKeys,
  ensureEnv,
};
