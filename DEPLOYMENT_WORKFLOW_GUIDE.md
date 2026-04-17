# Deployment Workflow Guide (EAS + Expo)

This repository now includes a complete EAS CI/CD setup for preview and production builds.

## Workflows

- `.github/workflows/quality-checks.yml`
  - Runs on push/PR
  - Executes config validation, lint, type-check, and tests

- `.github/workflows/eas-preview-build.yml`
  - Runs automatically for pull requests
  - Triggers EAS Android preview build (`preview` profile)
  - Posts build URL to the PR
  - Optional Slack notification via `SLACK_WEBHOOK_URL`

- `.github/workflows/eas-production-build.yml`
  - Runs on release tags (`v*`) and published GitHub releases
  - Triggers production EAS builds for Android and iOS
  - Writes build links to GitHub job summary
  - Optional Slack notification via `SLACK_WEBHOOK_URL`

- `.github/workflows/eas-manual-build.yml`
  - Manual `workflow_dispatch` trigger
  - Inputs: `platform`, `profile`, `wait_for_completion`
  - Supports ad-hoc development/preview/production builds

## Required GitHub Secrets

- `EXPO_TOKEN`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_SENTRY_DSN`
- `MAPBOX_DOWNLOADS_TOKEN`
- `EXPO_ASC_APP_ID` (production submit metadata)
- `EXPO_APPLE_TEAM_ID` (production submit metadata)
- `SLACK_WEBHOOK_URL` (optional)

## Local Build Utility Scripts

- `scripts/setup-env.sh`
  - Creates `.env.local` from `.env.example`
  - Adds placeholders for missing required keys

- `scripts/validate-build.js`
  - Validates `app.json` and `eas.json` structure
  - Validates required environment variables (unless `--skip-env` is set)

## Recommended Local Validation

```bash
bash scripts/setup-env.sh
node scripts/validate-build.js --skip-env
npm run lint
npm run type-check
npm test -- --watchAll=false
```
