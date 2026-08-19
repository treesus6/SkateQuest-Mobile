# SkateQuest Launch / Release Plan — Current

This file is intentionally short. **GitHub issue #37 is the release checklist/source of truth.** Do not use old screenshots, old domain notes, or old dependency versions to decide whether SkateQuest is ready.

## Current production shape

- Repo: `treesus6/SkateQuest-Mobile`
- React Native: `0.86.2`
- React: `19.2.7`
- Expo SDK: `57`
- Production web/PWA: **https://skatequest.me**
- Web hosting: **GitHub Pages**, deployed by `.github/workflows/deploy-web-pages.yml`
- Backend: Supabase project `hreeuqdgrwvnxquxohod`
- Maps: Mapbox native + Mapbox GL JS web
- Android builds: EAS

## What “ready” means

A green web build or TypeScript check is not enough. SkateQuest is ready only when the real user actions work against the live backend and the required native flows pass on a real Android device.

### Automated / server checks

Before a release candidate:

```bash
npm run type-check
npm run lint
npm test
npx expo-doctor
npm run export:web
```

The GitHub Pages workflow must also pass the production HTTPS smoke check for:

- `/`
- `/map`
- `/login`
- `manifest.webmanifest`
- `service-worker.js`

### Real Android device checks

Issue #37 owns the full list. At minimum verify on the installed preview build:

- cold start and repeat start
- signup/sign-in/sign-out/password reset
- Google auth callback if enabled
- map render, GPS permission, recenter, nearby real spots
- spot detail, add real spot, condition report
- verified check-in and XP read-back
- sessions start/finish/RSVP
- crew create/join/chat
- verified territory scoring
- crew battle create/vote/finalize display
- challenge proof/judging
- SkateTV upload/playback/likes/views
- media picker/camera permissions
- push/deep links if enabled
- offline/reconnect behavior

Do not check these off based only on CI.

## Backend integrity rules

The live Supabase schema is the source of truth.

- XP/level are server managed; clients do not directly change them.
- Challenges/reward values are server managed; completion uses proof/judging paths.
- Conversation membership is server controlled.
- Crew creation is atomic and creator membership is automatic.
- Crew territory writes go through the verified GPS/trick RPC.
- Crew battle votes/results/rewards are server controlled.
- Community spot submissions cannot self-assign sponsor/QR/crew/reputation/admin state.
- Storage writes are scoped to the authenticated user's folder.
- Do not modify PostGIS-owned objects just to silence database-linter warnings.

## Current web deployment

The production domain is **skatequest.me**. Do not reintroduce old `sk8.quest` or Vercel deployment instructions unless the product owner explicitly changes hosting.

GitHub Pages deploys automatically from `main`. The workflow validates required Supabase/Mapbox public runtime variables, exports Expo web, publishes the artifact, and performs live HTTPS route checks.

## Release order

1. Keep `main` buildable and web production healthy.
2. Finish server/schema/security fixes and commit matching migrations.
3. Produce/install a fresh Android preview build after those fixes.
4. Complete the real-device checklist in issue #37.
5. Fix every blocker found; do not substitute a different feature.
6. Produce the production Android AAB only after device QA is clean.
7. Complete Play Store privacy/data-safety/listing/signing checks.
8. Publish only when issue #37 has no unresolved launch blockers.

## Important

There is no blanket “everything is ready” statement in this file on purpose. Release readiness changes as code and schema change. Verify the current system every time.
