# SkateQuest Release Status

Updated: 2026-09-09

Target: Android closed alpha and production web/PWA

## Status

**Not ready for Android alpha upload.** Automated source checks and production web health are green, but exact-build Android QA and authenticated persistence remain unverified.

| Area                                | State                  | Evidence / next action                                                                         |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| TypeScript, lint, Jest              | Verified               | 32 suites and 265 tests pass on this branch.                                                   |
| Expo diagnostics                    | Verified               | Expo Doctor 1.20.2 passes 21/21.                                                               |
| Static web export                   | Verified               | Export succeeds; 138 routes emitted and 20 critical artifacts verified.                        |
| Production web home/map/login       | Verified               | Current uptime workflow passes.                                                                |
| Production Google OAuth start       | Verified               | Current production auth workflow passes; completion/session restoration still needs manual QA. |
| Spot-condition profile relationship | Verified               | Named FK exists live and migration is recorded.                                                |
| Core-table RLS enabled              | Verified               | Read-only live inspection of critical tables. Policy behavior still needs role-based tests.    |
| Auth query/deep-link return         | Fixed / needs QA       | Branch preserves route query parameters across login; focused tests pass.                      |
| Canonical shared spot link          | Fixed / needs QA       | Uses `/spot-detail?spotId=<uuid>`; direct production test required after deployment.           |
| Legacy `/videos`                    | Verified compatibility | Static alias responds 200 and redirects in a browser.                                          |
| Legacy `/spot/<uuid>`               | Limited                | GitHub Pages returns 404 with client recovery. Do not use for new shares.                      |
| Migration reproducibility           | Blocked                | 197 remote vs 180 local; follow reconciliation document.                                       |
| Authenticated spot/media lifecycle  | Needs QA               | Run unique create/read/restart/duplicate/failure probe.                                        |
| Android preview APK                 | Blocked                | Build from this branch after CI is green.                                                      |
| Android AAB/signing/Play            | Blocked                | Build and inspect only after physical preview QA.                                              |
| iOS                                 | Post-alpha / needs QA  | Source config exists; production build/device behavior unverified.                             |

## September 9 follow-up

- Exclude generated `dist`/`dist-quality` bundles from TypeScript checks; checking after web export previously crashed the compiler.

- Android system-picker entry points no longer request blocked broad library permissions. Camera and existing iOS permission checks remain.
- Native uploads, media size checks, optimization, and GoPro downloads now import the working `expo-file-system/legacy` API; the SDK 57 root exports used previously throw at runtime.
- Shared spot URLs fall back to the production root when the browser origin is missing or opaque, without carrying a GitHub Pages base path into the fallback URL.
- Patched xmldom, js-yaml, and nanoid. Production dependency audit now reports 4 high / 14 moderate / 0 critical (18 affected packages), down from 7 high / 14 moderate before these updates. Remaining advisories include Metro/image-size and Expo toolchain transitive dependencies; they remain open.
- Read-only live inspection reconfirmed 197 migration records, the profile trigger, condition/profile FK, and the four upload buckets. Session creation and RSVP RPC definitions enforce authentication; RSVP uses row locking and capacity checks. This does not substitute for authenticated lifecycle or role-based tests.
- No live writes, migration-history repair, signing changes, or Play submission were performed. Migration replay verification is blocked here by the absence of a local database runtime and confirmed recoverable backup. Physical Android testing remains required.

## Manual verification required

- Email and Google auth lifecycle, refresh, restart, expiry, and reset.
- Profile trigger result and missing-profile recovery.
- Spot create with image, read-back, map refresh, detail, restart, and duplicate rejection.
- Spot condition attribution and expiry.
- Media size/type/cancel/failure/retry/playback/orphan behavior.
- Session create, RSVP, capacity, finish, and progression.
- Physical Android deep links, permissions, camera, microphone, location, notifications, offline/reconnect, and account deletion.

## Post-launch candidates

- Session recap and weekly progress recap.
- Saved-spot condition/activity alerts.
- Rewrite-capable hosting for true `/spot/<uuid>` responses and richer share previews.
- Measured bundle splitting and list/map performance work.
