---
name: sq-devops
description: GitHub Actions builds, EAS, environment variables, and Termux workflow for SkateQuest-Mobile. Use when debugging build failures, updating the pipeline, or managing releases.
---

# DevOps & Build Standards — SkateQuest-Mobile

## Build Environment
- **Primary build**: GitHub Actions (not local — Termux can't run Metro)
- **Repo**: `treesus6/SkateQuest-Mobile`
- **Gradle**: 8.10.2 | **AGP**: 8.5.2 | **Node**: 20 (nvm) | **Java**: 21
- **Build time**: ~38 minutes per Android build

## Termux Workflow
```bash
git commit --no-verify -m "fix: description"
git push origin main
```

## Claude Code — Allowed vs Blocked Commands
`.claude/settings.local.json` gates what Claude can run automatically:
```json
{
  "permissions": {
    "allow": [
      "Bash(npx expo start*)",
      "Bash(npx jest*)",
      "Bash(eas build:inspect*)",
      "Bash(eas diagnostics*)",
      "Bash(eas whoami*)",
      "Bash(npx expo doctor*)",
      "Bash(npx expo install*)"
    ],
    "deny": [
      "Bash(eas build*)",
      "Bash(eas submit*)",
      "Bash(eas update*)",
      "Bash(eas secret*)"
    ]
  }
}
```
EAS build/submit/update/secret = irreversible or slow — always require explicit instruction.

## Required GitHub Secrets
- `EXPO_PUBLIC_MAPBOX_TOKEN` — **missing = white screen on launch**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_TOKEN` — robot bot token for EAS builds
- `GOOGLE_SERVICE_ACCOUNT_KEY` — needed for Play Store submission

## Runtime Env — CRITICAL
In EAS builds, `process.env.EXPO_PUBLIC_*` is NOT available at runtime in JS.
Set values in `app.config.js` under `extra:{}` and read via:
```ts
import Constants from 'expo-constants';
const key = Constants.expoConfig?.extra?.myKey ?? process.env.EXPO_PUBLIC_MY_KEY ?? '';
```

## EAS Profiles
- `preview` → internal APK testing
- `production` → AAB for Play Store

## Before Any Build Checklist
1. `npx expo-doctor`
2. All GitHub secrets confirmed set
3. `npx tsc --noEmit` passes
4. `npm run lint` passes

## Workflow Files (active)
- `ci.yml` — lint + typecheck on push/PR
- `eas-manual-build.yml` — manual EAS build trigger
- `build-android-apk.yml` — Gradle AAB build (Java 21 required)

## OTA vs Native Build
| Change | OTA | New Build |
|---|---|---|
| JS/TS logic | ✅ | ❌ |
| New native module | ❌ | ✅ |
| Gradle/AGP change | ❌ | ✅ |
| Mapbox SDK changes | ❌ | ✅ |
| app.config.js changes | ❌ | ✅ |

## Known Fixed Issues (Never Reintroduce)
- Missing `expo-splash-screen` → white screen
- Mapbox init at app start → crash on low RAM — init in MapScreen only
- `return null` during auth loading → gray screen — use `<ActivityIndicator />`
- `this.lock is not a function` → use `processLock` from `@supabase/auth-js`
- Sentry v8 + RN 0.81 conflict → resolved, don't change Sentry version
- NativeWind/StyleSheet mix in ErrorBoundary → fixed
- Java 17 in build-android-apk.yml → upgraded to Java 21
- `process.env` at runtime → use `Constants.expoConfig.extra`
