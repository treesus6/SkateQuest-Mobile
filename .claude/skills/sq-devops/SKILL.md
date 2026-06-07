---
name: sq-devops
description: GitHub Actions builds, EAS, environment variables, and Termux workflow for SkateQuest-Mobile. Use when debugging build failures, updating the pipeline, or managing releases.
---

# DevOps & Build Standards — SkateQuest-Mobile

## Build Environment
- **Primary build**: GitHub Actions (not local — Termux can't run Metro)
- **Repo**: `treesus6/SkateQuest-Mobile`
- **Gradle**: 8.10.2 | **AGP**: 8.5.2 | **Node**: 20+
- **Build time**: ~38 minutes per Android build

## Termux Workflow
```bash
git commit --no-verify -m "fix: description"
git push origin main
```

## Required GitHub Secrets
- `EXPO_PUBLIC_MAPBOX_TOKEN` — **missing = white screen on launch**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_TOKEN` — robot bot token for EAS builds
- `GOOGLE_SERVICE_ACCOUNT_KEY` — needed for Play Store submission

## EAS Profiles
- `preview` → internal APK testing
- `production` → AAB for Play Store

## Before Any Build
1. `npx expo-doctor`
2. Verify all secrets set
3. `npx tsc --noEmit` passes
4. `npm run lint`

## OTA vs Native Build
| Change | OTA | New Build |
|---|---|---|
| JS/TS logic | ✅ | ❌ |
| New native module | ❌ | ✅ |
| Gradle/AGP change | ❌ | ✅ |
| Mapbox SDK changes | ❌ | ✅ |

## Known Fixed Issues (Never Reintroduce)
- Missing `expo-splash-screen` → white screen
- Mapbox init at app start → crash on low RAM
- `return null` during auth loading → gray screen
- `this.lock is not a function` → use `processLock` from `@supabase/auth-js`
- NativeWind/StyleSheet mix in ErrorBoundary → fixed
