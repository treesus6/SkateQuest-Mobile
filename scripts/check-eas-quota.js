#!/usr/bin/env node

const { execSync } = require('node:child_process');

function parseArgs(argv) {
  const args = {
    total: Number(process.env.EAS_BUILD_QUOTA_TOTAL || 25),
    warnThreshold: Number(process.env.EAS_BUILD_WARN_THRESHOLD || 5),
    format: 'text',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--total') {
      args.total = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--warn-threshold') {
      args.warnThreshold = Number(argv[i + 1]);
      i += 1;
    } else if (arg === '--format') {
      args.format = argv[i + 1] || 'text';
      i += 1;
    }
  }

  if (!Number.isFinite(args.total) || args.total < 0) {
    throw new Error('Invalid --total value');
  }

  if (!Number.isFinite(args.warnThreshold) || args.warnThreshold < 0) {
    throw new Error('Invalid --warn-threshold value');
  }

  return args;
}

function runEasBuildList() {
  const output = execSync('npx eas-cli build:list --json --limit 200 --non-interactive', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [];
}

function monthStartUtc(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
}

function writeGithubOutput(result) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    return;
  }

  const lines = [
    `quota_total=${result.total}`,
    `quota_used=${result.usedThisMonth}`,
    `quota_remaining=${result.remaining}`,
    `quota_status=${result.status}`,
    `quota_percentage_used=${result.percentageUsed}`,
  ];

  require('node:fs').appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv);

  if (!process.env.EXPO_TOKEN) {
    console.error('Missing EXPO_TOKEN. Set EXPO_TOKEN as a repository secret to query EAS builds.');
    process.exit(1);
  }

  let builds;
  try {
    builds = runEasBuildList();
  } catch (error) {
    console.error('Failed to read EAS build history.');
    console.error(error.message || error);
    process.exit(1);
  }

  const start = monthStartUtc();
  const usedThisMonth = builds.filter(build => {
    if (!build || !build.createdAt) return false;
    const createdAt = new Date(build.createdAt);
    return !Number.isNaN(createdAt.valueOf()) && createdAt >= start;
  }).length;

  const remaining = Math.max(args.total - usedThisMonth, 0);
  const percentageUsed = args.total === 0 ? 0 : Math.round((usedThisMonth / args.total) * 100);

  let status = 'healthy';
  if (remaining === 0) {
    status = 'exhausted';
  } else if (remaining <= args.warnThreshold) {
    status = 'warning';
  }

  const result = {
    total: args.total,
    usedThisMonth,
    remaining,
    status,
    percentageUsed,
    sampledBuilds: builds.length,
    period: `${start.toISOString()}..${new Date().toISOString()}`,
  };

  writeGithubOutput(result);

  if (args.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`EAS Build quota status: ${result.status}`);
    console.log(
      `Used this month: ${result.usedThisMonth}/${result.total} (${result.percentageUsed}%)`
    );
    console.log(`Remaining builds: ${result.remaining}`);
    console.log(`Sample size: ${result.sampledBuilds} builds`);
  }

  if (result.status === 'exhausted') {
    process.exit(2);
  }
}

main();
