# Mistakes Already Made — Do Not Repeat

This file exists so the same bug never gets debugged twice. Check this before touching related code.

## Auth
- **`this.lock is not a function`** — Supabase auth error caused by the Web Locks API not existing in React Native. Fixed with an `rnLock` polyfill. If touching Supabase auth config, this polyfill must stay in place.

## Build / Native
- **White screen on APK launch** — caused by two compounding issues: aggressive Terser minification settings in `metro.config.js`, and `validateEnvironment()` throwing before React had a chance to mount. Do not re-enable aggressive minification without testing a real APK install, not just Metro dev mode.
- **JDK mismatch** — EAS/GitHub Actions build failures traced to Java version mismatch. Resolved by pinning Java 17→21 in the workflow. Do not let this drift.
- **Missing `package-lock.json`** — EAS builds failed silently/oddly without a committed lockfile. Always commit the lockfile; use `npm install` over `npm ci` only where CI config expects it (see ai/constraints.md).
- **Mapbox version conflict** — dependency conflict between Mapbox and other native deps during the Expo Router v4 migration. Resolved by version pinning; check Mapbox compatibility before bumping Expo SDK again.
- **Corrupted PNG assets** — turned out to be Git LFS pointer files, not real images. If an asset "looks broken" after a fresh clone, check `git lfs pull` before debugging the image pipeline.

## CI/CD
- **Sentry DSN pattern** — build failures from an invalid/malformed Sentry DSN pattern in CI. DSN must be injected correctly as an env var, not hardcoded or malformed in workflow YAML.
- **Invalid GitHub Actions versions** — CI failures from action versions that didn't exist / were deprecated. Pin to known-good versions, don't assume "latest" tag names.
- **PostHog broken in EAS builds** — `process.env` is undefined at runtime in EAS builds. Analytics must read from `Constants.expoConfig?.extra`, never raw `process.env`, in any code that runs on-device.

## Config file corruption
- A Pipedream MCP write operation once overwrote `package.json`, `tsconfig.json`, and `eas.json` with its own response envelope instead of the actual file contents. If a config file looks like it contains tool-response JSON instead of real config, it's corrupted — restore from git history immediately, don't try to patch it.

## Plugin files
- `withMapboxRepo.js` was accidentally emptied during a PR apply. Recovered from git history. Any Expo config plugin file that goes suspiciously empty should be treated as corrupted, not "cleaned up."

## Play Store
- Auto-submit to Play Store is still blocked on account-level keystore pairing — this is not a code problem, don't waste time debugging it as one. It needs to be resolved at the Play Console account level.