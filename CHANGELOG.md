# Changelog

All notable SkateQuest Mobile changes are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Release status

SkateQuest Mobile is in the v1.0 release-candidate stage. Web/PWA deployment and automated quality gates are active, while final real-device Android QA, the production Android App Bundle, store submission work, and optional iOS launch validation remain release gates.

### Added

- Global Mapbox-powered skate map with real user spots, parks, shops, filters, directions, conditions, check-ins, and community spot creation.
- Web Add Spot flow with explicit real-coordinate selection and read-back verification after save.
- Portal Dimension partner marker in Newport, Oregon with map-only website routing.
- Crew creation, membership, territory, battles, and community flows backed by Supabase RPCs.
- Real SKATE games with server-controlled turn order, set/match state, letters, completion, winner state, and optional media proof.
- Challenges, proof submissions, voting, achievements, XP progression, shop rewards, sessions, Skate Passport, seasonal progression, streaks, trick tracking, and spot discovery features.
- QR Hunt with paid hide flow, GPS-backed placement/claims, trick proof, proof review, support-fund reporting, and generated QR presentation.
- SkateTV/feed playback for real user content, upload flows, comments/social actions, and clip/spot discovery surfaces.
- Web and Android beta/support notice using `support@skatequest.me`.
- Password recovery, confirmation redirects, and GitHub Pages/custom-domain auth routing coverage.
- PWA manifest, service worker, GitHub Pages deployment, HTTPS route smoke checks, and `skatequest.me` production hosting.

### Changed

- Reworked major screens into the current SkateQuest visual system, including Home-adjacent gameplay surfaces, Challenges, Achievements, AI Coach, Demo Day, Spot of the Day, XP Rewards, QR Hunt, and web Add Spot.
- Upgraded to Expo SDK 57 / React Native 0.86 with Node 22.22.1 CI and EAS alignment.
- Replaced client-controlled SKATE state mutation with secure server-managed RPC behavior.
- Standardized public support/legal contact surfaces on `support@skatequest.me`.
- Updated Husky setup to its current prepare command.

### Fixed

- Expo SDK patch-package alignment so Expo Doctor passes the configured project checks.
- Auth redirect handling for `skatequest.me`, GitHub Pages project paths, missing browser origins, and opaque origins.
- Crew RPC test expectations to match the live server-managed UUID return contract.
- Native map partner marker placement without restoring partner branding to login/front-door screens.
- XP Rewards list typing and other TypeScript blockers found by the full quality gate.
- Web/native platform separation for Mapbox-dependent screens and static web export.
- SKATE Game Detail compatibility with the server-controlled game state machine.
- SKATE game foreign-key relationships to profile records.

### Security

- Supabase production migration revokes direct anonymous/authenticated execution of the internal Passport stamp trigger function and keeps execution on the service role.
- RLS policies flagged for per-row auth evaluation were rewritten to preserve permissions while avoiding repeated auth-function evaluation.
- Removed a duplicate SkateTV likes read policy already covered by the existing owner policy.
- Supabase performance advisor has no remaining WARN-level findings after the verified cleanup; remaining advisor items are informational or require deliberate product/security decisions rather than blanket changes.
- Privileged Supabase Edge Functions obtain service-role credentials from environment variables; browser code uses the public Supabase anon key.

### Verification completed

- GitHub CI runs TypeScript, ESLint, Jest, Expo Doctor, static web export, and key-route checks.
- CodeQL runs on release work.
- Production PWA deployment has automated HTTPS checks for home, map, login, manifest, and service worker routes.
- Live Supabase schema/RPC behavior was verified for the security cleanup and server-controlled SKATE flow.

### Still required before public v1.0 release

- Install the current preview APK on a real Android device and complete end-to-end device QA.
- Build the production Android AAB only after real-device QA passes.
- Validate Android signing / Play Console setup and complete store disclosures, screenshots, feature graphics, and internal-track submission.
- Enable Supabase leaked-password protection in the Auth dashboard.
- Verify production Sentry events and final production environment secrets.
- Run iOS production build/device QA if iOS is included in the initial public launch.

[Unreleased]: https://github.com/treesus6/SkateQuest-Mobile/commits/main
