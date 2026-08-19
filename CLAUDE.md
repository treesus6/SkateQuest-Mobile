# CLAUDE.md — SkateQuest current engineering source of truth

This repository is a real React Native / Expo product, not a mockup project. Read **AGENTS.md** first. The product owner's current request, live Supabase schema, current repository state, and GitHub issue **#37** override stale historical notes.

## Current project

- Repo: `treesus6/SkateQuest-Mobile`
- App: React Native `0.86.2`, React `19.2.7`, Expo SDK `57`, Expo Router `~57.0.14`
- Backend: Supabase project `hreeuqdgrwvnxquxohod` with PostgreSQL + PostGIS
- Maps: `@rnmapbox/maps` on native; Mapbox GL JS in the dedicated web map
- State/data: Zustand + Supabase service modules
- Production web/PWA: **https://skatequest.me**
- Web deploy: `.github/workflows/deploy-web-pages.yml` → GitHub Pages
- Release checklist/source of truth: GitHub issue **#37**

Do not copy version numbers, domains, deployment steps, or schema assumptions from old planning documents without verifying them against current files/live systems.

---

## Product integrity — non-negotiable

**NO SHORTCUTS. NO FAKE DATA. NO LOCAL-ONLY REPLACEMENTS FOR SERVER FEATURES. NO NO-OPS. NO FAKE SUCCESS. NO DEAD BUTTONS. NO EMPTY FEEDS USED TO HIDE BACKEND FAILURES.**

When something fails:

1. Inspect the current screen/service call.
2. Inspect the live Supabase table/RPC/RLS/storage contract.
3. Decide the intended real product behavior.
4. Fix the schema/RPC/policy/storage contract and add a migration when needed.
5. Wire the UI to the real backend.
6. Verify success with a read-back/server result.
7. Verify failure behavior; optimistic UI must roll back.
8. Run type/lint/build checks.
9. Test native-only behavior on a real Android device before calling the release complete.

Never remove or downgrade a requested feature merely to make CI pass.

---

## Current backend integrity rules

These rules reflect the live hardened backend and must not be bypassed.

### XP / level progression

- `profiles.xp` and `profiles.level` are **server managed**.
- Never directly update XP/level from a client screen or service.
- Rewards must come from verified server RPCs / reward ledger paths.
- `get_level_progress` must stay aligned with `calculate_level`.
- Client-provided XP amounts are not a trusted reward source.

### Challenges / proofs

- `challenges` definitions and reward values are server managed.
- Authenticated clients may not create arbitrary reward-bearing challenges or directly mark them complete.
- Proof submission + judging RPCs are the supported completion path.

### Crews / messaging

- Crew creation is atomic through `create_crew`; the creator is automatically a member.
- A user has one active crew membership under the current product model.
- `member_count` is database maintained.
- Direct conversations are created through `create_or_get_direct_conversation`.
- Crew conversations are created through `create_crew_conversation` and membership syncs from crew membership.
- Never let a client insert itself into an arbitrary `conversation_members` row.
- Per-user read state lives on `conversation_members.last_read_at`.

### Crew territory

- Clients may **not** insert/update `crew_territories` directly.
- Use `claim_crew_territory`.
- The verified flow requires the caller's real GPS location near the spot, a landed trick, crew membership, and server cooldown/rate rules.
- Do not reintroduce the old "spend 100 XP to set territory points" client behavior.

### Crew battles

- Clients may not directly set battle vote totals, status, winner, or crew XP.
- Create via `create_crew_battle`.
- Vote via `vote_crew_battle`; one server-recorded vote per skater.
- Expired battles are finalized server-side; the winner receives the configured crew XP once. Ties receive no fake payout.

### Spots / community content

- User-created `skate_spots` must belong to `auth.uid()`.
- Community spot creation cannot self-assign sponsor fields, QR reward state, crew ownership, reputation points, or admin status.
- Spot photo identity must match the uploader.
- Spot creation does not directly award XP.
- Never invent a fallback city/spot/location when GPS is missing; show a neutral state or ask for a real location.

### Storage

- Upload paths include the authenticated user's folder and Storage RLS enforces it.
- Keep `upsert: false` for user media unless a reviewed overwrite flow requires otherwise.
- Public reads are intentional for public SkateQuest media; write ownership remains authenticated.

---

## Supabase / PostGIS safety

All new application tables require RLS and explicit policies.

**DO NOT modify PostGIS-owned objects such as `public.spatial_ref_sys` or move the PostGIS extension solely to silence a Supabase advisor warning.** Those objects are extension-managed and used by map/location functionality. Treat advisor findings on extension-owned objects separately from SkateQuest-owned schema. Change them only with a verified extension-safe migration and a clear reason.

Similarly, do not mass-revoke every authenticated `SECURITY DEFINER` RPC just because the linter warns that signed-in users can execute it. Many SkateQuest RPCs intentionally run with elevated privileges but must validate `auth.uid()` internally. Audit the function body and grants individually.

Never expose service-role credentials to the app bundle or repository.

---

## Web/PWA

Production is **https://skatequest.me** on GitHub Pages.

The Pages workflow must verify at least:

- Expo web export succeeds
- `/` loads over HTTPS
- `/map` loads over HTTPS
- `/login` loads over HTTPS
- `manifest.webmanifest` is correct
- `service-worker.js` is reachable

Browser GPS requires HTTPS. Do not weaken secure-context checks to make HTTP location appear to work.

Platform-specific implementations belong in `.web.ts(x)` / native/default modules when browser/native APIs differ. Shared components should not contain DOM calls. Web-only files may use browser/DOM APIs when necessary (for example Mapbox GL JS).

---

## Native release gate

CI/web success does **not** prove native release readiness.

Before marking the Android release complete, issue #37 still requires real-device verification for the applicable flows, including:

- cold start / no crash
- email/password auth and reset flow
- Google auth callback
- map render + GPS + nearby spots
- spot detail / add spot / condition report
- verified check-in and XP
- sessions
- crew create/join/chat/territory/battles
- challenge proof/judging
- SkateTV upload/playback/engagement
- push notification permissions/deep links if enabled
- camera/media picker
- offline/reconnect behavior

Do not mark these complete from TypeScript, Jest, Expo export, or GitHub Actions alone.

---

## Architecture

Route files under `app/(tabs)` and `app/(screens)` are normally thin Expo Router wrappers. Real screen implementations live in `screens/`. Edit the screen/service rather than duplicating logic in a route wrapper unless routing behavior itself is the task.

Data access should live in `lib/*Service.ts` rather than scattered raw Supabase writes in UI components. Security-sensitive mutations should prefer verified RPCs over direct table updates.

When the live schema and TypeScript assumptions disagree, **fix the contract**. Do not cast the mismatch away with `any` and move on.

---

## Current product decisions

- SkateQuest is intended to work globally, not only Vancouver/Portland.
- Real spots, parks, shops, community content, and user activity only; do not fabricate content to make a screen look busy.
- Portal Dimension is a Newport, Oregon map/community listing. It must not appear as a login/front-screen logo. Current placement decisions override old partnership notes.
- No fake mockups or pretend-interactive UI for features presented as working.

---

## Required checks before declaring code done

```bash
npm run type-check
npm run lint
npm test
npx expo-doctor
```

For web-impacting changes also run/export equivalent to:

```bash
npm run export:web
```

For Android release readiness, use the EAS profiles in `eas.json` and complete the real-device checks in issue #37.

Do not bypass broken checks with `--no-verify` as a normal workflow. If a local environment cannot run a check, use GitHub Actions/EAS where available and report the exact remaining verification gap.

---

## Runtime configuration

Important CI/runtime variables include:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_SENTRY_DSN`
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` / `MAPBOX_DOWNLOADS_TOKEN` for native Mapbox dependency download
- `EXPO_TOKEN` for EAS CI
- Play submission credentials where required

Do not hardcode private values. Public Expo variables can be embedded in client bundles by design, but service-role/API secrets cannot.

In EAS production, runtime config should be available through `Constants.expoConfig.extra` as configured by `app.config.js`; do not assume `process.env` is present after the native bundle is built.

---

## High-risk areas

Inspect live contracts before changing:

- `lib/supabase.ts` / auth storage
- `app/_layout.tsx` auth/bootstrap flow
- `screens/MapScreen*` + location helpers
- XP/reward RPCs and `profiles` progression triggers
- challenge/bounty/callout judging RPCs
- crew/messaging/territory/battle RPCs
- Storage upload paths and policies
- `.github/workflows/deploy-web-pages.yml`
- Supabase migrations

A warning or failing feature is not permission to substitute an easier feature. Fix the actual behavior or leave a clear blocker.
