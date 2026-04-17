# SkateQuest-Mobile Build Automation Guide

This guide documents the EAS preview build check and the GitHub Actions automation added for intelligent build usage.

## 1) Preview Build Validation (Task 1)

### Command requested

```bash
eas build --platform android --profile preview
```

### Execution result in this environment

`eas` was not installed globally on the runner, so the equivalent command was executed with `npx`:

```bash
npx eas-cli build --platform android --profile preview --non-interactive
```

### Output summary

- EAS CLI installed successfully via `npx eas-cli@18.7.0`
- Build start was blocked due to missing Expo authentication
- Exact EAS error:

```text
An Expo user account is required to proceed.
Either log in with eas login or set the EXPO_TOKEN environment variable if you're using EAS CLI on CI
Error: build command failed.
```

### Quick validation report

| Check                  | Result | Notes                                           |
| ---------------------- | ------ | ----------------------------------------------- |
| EAS CLI available      | ✅     | Via `npx eas-cli`                               |
| EAS command invocation | ✅     | Android preview build command reached EAS       |
| Auth/token setup       | ❌     | `EXPO_TOKEN` not present in this runner         |
| Build created          | ❌     | Blocked until Expo authentication is configured |

To run successfully in GitHub Actions, set repository secret `EXPO_TOKEN`.

---

## 2) GitHub Actions Workflows Added (Task 3)

### Files created

- `.github/workflows/auto-preview-build.yml`
- `.github/workflows/auto-production-build.yml`
- `.github/workflows/build-quota-check.yml`
- `.github/workflows/manual-build-trigger.yml`
- `.github/workflows/build-notifications.yml`
- `.github/workflows/build-management.yml`
- `scripts/check-eas-quota.js`
- `scripts/manage-builds.js`

### Workflow behavior

1. **Auto Preview Build on PR**
   - Trigger: PR opened/reopened/ready_for_review
   - Action: Starts Android preview build through reusable build manager
   - Result: Posts build status/link comment to PR

2. **Auto Production Build on Release**
   - Trigger: Release published
   - Action: Starts Android + iOS production builds
   - Optional auto-submit: Controlled by repo variable `EAS_ENABLE_AUTO_SUBMIT=true`
   - Result: Appends build links to release notes

3. **Build Quota Manager**
   - Trigger: Daily schedule + manual dispatch
   - Action: Runs quota estimation from EAS build history
   - Result: Warns via issue/comment when quota is low

4. **Manual Build Trigger**
   - Trigger: `workflow_dispatch`
   - Inputs: platform (`android`/`ios`/`all`), profile (`preview`/`production`), auto_submit
   - Result: One-click on-demand builds with summary output

5. **Build Success Notification**
   - Trigger: completion of build workflows
   - Action: Posts completion details and artifact links
   - Result: Creates/updates a prerelease record for successful production/manual runs

6. **Build Management Utility** (reusable)
   - Shared entrypoint used by preview/production/manual workflows
   - Performs token check, quota check, build trigger, metadata artifact upload

---

## 3) Configuration Required in GitHub

### Required secrets

- `EXPO_TOKEN` (required)
- `MAPBOX_DOWNLOADS_TOKEN` (required for native Mapbox package fetch in EAS environment)
- Any Expo public env vars used by app config as needed (`EXPO_PUBLIC_*`)

### Optional repository variables

- `EAS_BUILD_QUOTA_TOTAL` (default: `25`)
- `EAS_BUILD_WARN_THRESHOLD` (default: `5`)
- `EAS_ENABLE_AUTO_SUBMIT` (`true` or `false`, default effectively `false`)

---

## 4) Quota and Rate-Limit Strategy

- PR preview workflow uses per-PR concurrency to cancel redundant in-progress runs
- Quota check runs before build trigger in reusable workflow
- Low quota warning opens/updates an issue to prevent accidental exhaustion

---

## 5) Manual Usage

- Open **Actions** → **Manual Build Trigger**
- Choose platform/profile
- Toggle auto-submit if credentials are configured
- Run workflow and use summary links
