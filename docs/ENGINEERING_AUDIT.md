# SkateQuest Engineering Audit

Updated: 2026-09-07

Audited baseline: `main` at `853d8ac`

## Executive summary

SkateQuest has a real, unusually broad product implementation and a healthy automated baseline. It is not yet release-ready because production persistence and native behavior have not been verified end to end on the exact release build. The highest-value work is consolidation and verification, not more feature surface.

Baseline results:

- TypeScript: pass
- ESLint: pass
- Jest baseline: 29 suites / 232 tests pass
- Jest on this branch: 30 suites / 243 tests pass
- Expo Doctor 1.20.2: 21/21 checks pass
- Expo web static export: pass, 138 routes generated
- Current GitHub `main` quality gate, CodeQL, production auth, and uptime workflows: pass
- Approximate application TypeScript: 45,628 lines
- Explicit `any` occurrences: 375
- Direct Supabase calls from screens/components/routes: 77

## Critical blockers

1. No APK or signed AAB built from and physically verified against this working branch.
2. Authenticated persistence has not been verified against production for signup/profile creation, restart restoration, refresh, token renewal, password recovery, and account deletion.
3. Migration history is divergent. Production has 197 recorded migrations and the repository has 180 files. There are 54 same-name migrations with different versions, 39 remote-only semantic names, and 22 local-only semantic names. See `docs/SUPABASE_RECONCILIATION.md`.
4. Exact end-to-end spot creation, media attachment, read-back, duplicate rejection, and cleanup failure behavior still require an authenticated production probe.

## High-priority bugs

- Fixed on this branch: the auth guard previously reconstructed only the pathname. A signed-out user opening `/spot-detail?spotId=<uuid>` was sent through login and returned without `spotId`.
- Fixed on this branch: spot detail attempted a backend query for a missing or malformed ID and reduced failures to an alert. It now validates the ID and provides a persistent error/retry state.
- Fixed on this branch: shared spot URLs now use the statically hosted canonical route `/spot-detail?spotId=<uuid>`.
- `/videos` works through static compatibility files, but it is not a first-class Expo Router route. Its exported and production behavior remains covered as a legacy alias.
- `/spot/<uuid>` is recovered by `public/404.html`, but GitHub Pages still returns HTTP 404 before browser-side recovery. New shared links must use the canonical query route. Moving to a rewrite-capable host would be required for a true 200 response on arbitrary path parameters.

## UX problems

- The app exports more than 100 feature routes. New users can discover many secondary systems before understanding the core loop: find a spot, join/start a session, skate, capture progress, interact locally.
- Many secondary screens independently implement loading, alerts, empty states, and Supabase access, creating inconsistent failure UX.
- Spot detail is useful but dense. The first viewport needs to prioritize current conditions, location/directions, sessions, and check-in before territory, competitive, and archive surfaces.
- Progression is spread across XP, levels, achievements, streaks, seasonal pass, quests, challenges, Passport, bingo, bounties, and territory. Reward overlap and terminology need a product-level pass.

## Architecture problems

- Route groups contain thin wrappers as intended, but static export produces both public and route-group variants. CI verifies only a small subset.
- 77 direct Supabase calls remain in UI files despite the service-layer rule. This complicates typed contracts, error handling, retries, and tests.
- 375 `any` occurrences weaken schema mismatch detection. Prioritize auth, spots, sessions, media, progression, and competitive services rather than a repo-wide rewrite.
- Several features have parallel `Verified`, `Live`, `current`, base, native, and web implementations. Each route must be traced before dead code is removed.
- `FEATURES.md` and the former `RELEASE_NOTES.md` describe obsolete or unverified systems and overstate readiness.

## Security concerns

- Production dependency audit reports 5 high and 17 moderate advisories, primarily in the Expo/Metro toolchain. No critical advisory is reported. Suggested npm fixes downgrade or cross major framework versions and must not be applied blindly.
- The direct `sanitize-html` advisory is fixed on this branch by pinning 2.17.7. `@expo/ngrok` is moved to development dependencies.
- Supabase leaked-password protection is disabled and requires a dashboard setting change.
- Supabase advisors report PostGIS-owned `spatial_ref_sys` and extension findings. Per repository rules, do not alter PostGIS-owned objects merely to silence the advisor.
- Sixty-nine authenticated `SECURITY DEFINER` RPC warnings require function-by-function authorization review. Many are intentional product entry points; blanket revocation would break the app.
- `admin/portal-stats.html` contains the public Supabase anon JWT inline. This is not a service-role secret, but it should be centralized to reduce stale-key and configuration drift.

## Performance issues

- The web entry bundle is approximately 6.7 MB before transport compression. Route-level lazy loading and dependency analysis are justified.
- Map, media feeds, and long lists require device profiling; static analysis cannot prove render or memory behavior.
- Supabase performance advisors currently report 242 informational findings: 102 unindexed foreign keys, one table without a primary key, and 139 unused indexes. Usage must be measured before adding or deleting indexes.
- Realtime subscriptions and location watchers need route-by-route lifecycle verification.

## Data integrity risks

- Migration history cannot currently reproduce production from repository files with confidence.
- Core tables inspected in production have RLS enabled, and the spot-condition-to-profile FK is present.
- Production has an `auth.users` insert trigger that calls `handle_new_user()`, supporting automatic profile creation. The full signup lifecycle still needs a real account test.
- Competitive state and XP are server-managed in the current architecture; any remaining client-side direct mutation should be treated as P0.
- Media uploads must verify both storage ownership and the database record. Failed record attachment needs orphan cleanup evidence.

## Test gaps

- No authenticated browser E2E suite.
- No physical Android smoke automation or recorded device matrix.
- Limited route alias/direct-refresh coverage.
- No complete media failure matrix for size, type, cancellation, upload interruption, retry, and orphan cleanup.
- No second-device persistence checks.
- Test output includes expected error logs and one React `act()` warning, which should be cleaned up so real warnings remain visible.

## Release gaps

- Exact-branch preview APK and production AAB are missing.
- Play signing certificate, target SDK, version code, embedded public runtime configuration, and deep links need artifact inspection.
- Store disclosures and media permissions need confirmation against the generated release manifest.
- iOS bundle, associated links, OAuth return, notification, camera, photo, and location flows are unverified.

## Product gaps

- Sessions need to become the bridge between discovery and recorded progression.
- Nearby activity and condition freshness should drive retention before additional game modes.
- Shareable spot/session links need canonical URL ownership and notification/deep-link tests.
- Moderation, blocking, reports, privacy, and media ownership require user-flow verification.

## Recommended order of execution

1. Keep auth/deep-link parameters intact and harden spot detail errors.
2. Reconcile migration history without applying destructive SQL.
3. Run authenticated production probes for auth, spots, conditions, media, and sessions.
4. Build an exact-branch preview APK and complete the Android device matrix.
5. Consolidate data access for the core loop into typed services.
6. Simplify navigation and progression presentation only after core flows are measured and verified.
7. Address performance hot paths from profiles, not assumptions.
