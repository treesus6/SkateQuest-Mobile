#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const { writeFileSync, appendFileSync } = require('node:fs');

function parseArgs(argv) {
  const command = argv[2] || 'trigger';
  const args = {
    command,
    platform: 'android',
    profile: 'preview',
    autoSubmit: false,
    buildId: '',
    outputFile: '',
  };

  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--platform') {
      args.platform = argv[i + 1] || args.platform;
      i += 1;
    } else if (arg === '--profile') {
      args.profile = argv[i + 1] || args.profile;
      i += 1;
    } else if (arg === '--auto-submit') {
      args.autoSubmit = (argv[i + 1] || 'false') === 'true';
      i += 1;
    } else if (arg === '--build-id') {
      args.buildId = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--output-file') {
      args.outputFile = argv[i + 1] || '';
      i += 1;
    }
  }

  return args;
}

function assertAllowedValue(name, value, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${name} must be one of: ${allowedValues.join(', ')}`);
  }
}

function assertBuildId(value) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error('buildId must contain only alphanumeric characters, hyphens, and underscores.');
  }
}

function runJsonCommand(args) {
  let output = '';
  try {
    output = execFileSync('npx', ['eas-cli', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    throw new Error(`EAS CLI command failed${stderr ? `: ${stderr.trim()}` : ''}`);
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse EAS CLI JSON output: ${error.message || error}`);
  }
}

function normalizeBuildPayload(payload) {
  const build = Array.isArray(payload) ? payload[0] : payload;
  if (!build || typeof build !== 'object') {
    throw new Error('Unable to parse EAS build output.');
  }

  const urlCandidates = [
    build?.buildDetailsPageUrl,
    build?.dashboardUrl,
    build?.webUrl,
    build?.logsUrl,
    build?.artifacts?.buildUrl,
    build?.metadata?.buildDetailsPageUrl,
    build?.details?.url,
  ];

  const url =
    urlCandidates.find(candidate => typeof candidate === 'string' && candidate.trim().length > 0) ||
    '';

  return {
    id: build.id || '',
    status: build.status || 'unknown',
    platform: build.platform || 'unknown',
    profile: build.profile || 'unknown',
    url,
    raw: build,
  };
}

function setGithubOutput(build) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const lines = [
    `build_id=${build.id}`,
    `build_status=${build.status}`,
    `build_platform=${build.platform}`,
    `build_profile=${build.profile}`,
    `build_url=${build.url}`,
  ];

  appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv);

  if (!process.env.EXPO_TOKEN) {
    console.error('Missing EXPO_TOKEN. Configure repository secret EXPO_TOKEN.');
    process.exit(1);
  }

  try {
    if (args.command === 'status') {
      if (!args.buildId) {
        throw new Error('The status command requires --build-id.');
      }
      assertBuildId(args.buildId);

      const payload = runJsonCommand(['build:view', args.buildId, '--json', '--non-interactive']);
      const build = normalizeBuildPayload(payload);

      if (args.outputFile) {
        writeFileSync(args.outputFile, `${JSON.stringify(build, null, 2)}\n`, 'utf8');
      }

      setGithubOutput(build);
      console.log(JSON.stringify(build, null, 2));
      return;
    }

    assertAllowedValue('platform', args.platform, ['android', 'ios']);
    assertAllowedValue('profile', args.profile, ['preview', 'production', 'development']);

    const commandArgs = [
      'build',
      '--platform',
      args.platform,
      '--profile',
      args.profile,
      '--non-interactive',
      '--no-wait',
      '--json',
    ];
    if (args.autoSubmit) {
      commandArgs.push('--auto-submit');
    }

    const payload = runJsonCommand(commandArgs);
    const build = normalizeBuildPayload(payload);

    if (args.outputFile) {
      writeFileSync(args.outputFile, `${JSON.stringify(build, null, 2)}\n`, 'utf8');
    }

    setGithubOutput(build);
    console.log(JSON.stringify(build, null, 2));
  } catch (error) {
    console.error('Failed to manage EAS build.');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
