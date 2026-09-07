# SkateQuest Release Status

Updated: 2026-09-07

Target: Android closed alpha and production web/PWA

## Status

**Not ready for Android alpha upload.** Automated source checks and production web health are green, but exact-build Android QA and authenticated persistence remain unverified.

| Area                                | State                  | Evidence / next action                                                                         |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| TypeScript, lint, Jest              | Verified               | 30 suites and 243 tests pass on this branch.                                                   |
| Expo diagnostics                    | Verified               | Expo Doctor 1.20.2 passes 21/21.                                                               |
| Static web export                   | Verified               | Export succeeds; 138 routes emitted and 18 critical artifacts verified.                        |
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
