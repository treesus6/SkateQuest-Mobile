# SkateQuest Mobile Engineering Rules

**Last updated:** August 21, 2026

This file is the engineering guardrail for SkateQuest-Mobile. It applies to human contributors and coding agents.

## Non-negotiable product rules

### 1. No fake features

Do not add placeholder counts, fabricated users, fake spots, mock rewards, fake videos, fake events, seeded production-looking content, or buttons that pretend an action succeeded.

If a feature is not connected to its real data/device/backend behavior, it is not finished.

### 2. No shortcut replacements

When a real feature is broken, fix the real feature. Do not replace it with a weaker local-only version, a static card, a fake fallback, or a different flow just because the original path is harder to repair.

A failure is not permission to silently change the product requirement.

### 3. Do not delete working product behavior to make CI pass

Tests, types, and CI must describe the product—not force the product to regress.

When a test is stale, update the test. When production code is wrong, fix production code. Determine which one is wrong before changing either.

### 4. Newer verified work wins

`main` moves quickly. Before transplanting a branch or old PR, compare it with current `main` and preserve newer implementations.

Do not revive a stale branch wholesale when its useful changes can be carried forward cleanly.

### 5. Global product, not a Vancouver-only app

SkateQuest is designed for skaters anywhere. Local seed data or one-city shortcuts must never become the product architecture.

Location features should work globally when the underlying data source supports it.

## Current stack

Use the versions in `package.json` as source of truth. The current release line is built around:

- Node 22.22.1+
- React 19
- React Native 0.86
- Expo SDK 57 / Expo Router
- TypeScript 6
- Zustand
- NativeWind
- Supabase / PostgreSQL / PostGIS / Auth / Storage / Edge Functions / RPCs
- Mapbox
- Sentry
- EAS Build / EAS Update
- Jest / ESLint / Expo Doctor / CodeQL

Do not follow old instructions that refer to Firebase, Leaflet, Netlify, Expo SDK 54, or a previous SkateQuest architecture.

## Data and backend rules

### Supabase is a real backend, not a JSON store

Before changing a data flow:

1. Inspect the current migration history and live RPC/table contract when available.
2. Prefer existing server-owned behavior over duplicating logic in the client.
3. Add source-controlled migrations for database changes.
4. Do not make destructive production writes merely to test a theory.
5. Verify failure behavior as well as the happy path.

### Competitive and XP-sensitive state must be server controlled

Do not trust the phone to decide:

- XP awards or spend
- SKATE letters, turn order, set/match state, completion, or winner
- reward redemption pricing/codes
- capacity-limited RSVP state
- privileged moderation/review results
- paid QR support state
- verified check-in awards

Use authenticated RPCs / server validation already provided by the product architecture.

### `SECURITY DEFINER` functions require deliberate grants

For privileged internal functions, revoke unnecessary `anon` / `authenticated` execution and grant only the role that must execute them.

For intentional authenticated RPC APIs, do not mass-revoke them just to silence an advisor. Review each function by purpose.

### RLS changes must preserve access semantics

Do not weaken RLS to make a query pass. Fix the policy or caller with the intended product permissions intact.

## Secrets and environment rules

Public Expo values may be embedded in client builds when they are designed to be public, such as:

- Supabase project URL
- Supabase anon/publishable key
- Mapbox public access token
- public Sentry DSN

Privileged values must never be committed or shipped in client code, including:

- Supabase service-role keys
- Stripe secret/webhook secrets
- Mapbox downloads token
- Play signing credentials / service-account JSON
- private API keys

Edge Functions must read privileged credentials from environment variables.

## Platform rules

### Web and native are both supported surfaces

When native packages cannot run on web, use explicit platform adapters such as:

- `Screen.native.tsx`
- `Screen.web.tsx`
- `module.native.ts`
- `module.web.ts`

Do not import native Mapbox code into a web-only source.

### Native capabilities require real-device QA

CI cannot prove camera, microphone, GPS, notifications, deep links, native Mapbox rendering, media picking/recording, or store signing.

Never mark those release checks complete because Jest or web export passed.

## UI rules

SkateQuest should feel like an active skate product, not a generic black admin app.

Prefer:

- strong hierarchy and recognizable scene identity
- useful status/state feedback
- real interaction and live data
- intentional cards/posters/tickets/stickers/HUD treatments where appropriate
- clear empty/error/loading states
- touch targets that make sense on phones

Avoid:

- fake activity for visual density
- endless plain black screens with identical cards
- decorative controls that do nothing
- UI that hides whether data is real or unavailable
- rewriting a polished screen just to make it different

## React / React Native rules

- Use functional components and hooks.
- Keep effects scoped and cleaned up.
- Use `useMemo` / `useCallback` when they solve a real render or dependency problem, not by habit.
- Prefer `FlatList` for large/unknown-length lists; `ScrollView` is fine for bounded content.
- Keep touch actions disabled while their mutation is in flight when duplicate submission is unsafe.
- Handle loading, error, empty, offline, and permission-denied states explicitly.
- Preserve accessibility labels for meaningful controls/images.
- Avoid unsupported style values. Use explicit absolute positioning when React Native typing does not support a shorthand used in older versions.

## TypeScript rules

- Keep `npm run type-check` green.
- Prefer domain interfaces/types over broad `any` casts.
- Do not invent table/RPC fields that are not in the real contract.
- Treat casts at Supabase relation boundaries as narrow normalization points rather than spreading `any` through UI code.
- When an RPC changes shape, update its callers and tests together.

## Error handling

- Surface actionable user errors without pretending success.
- Log unexpected technical failures through the project logger / Sentry path where appropriate.
- Never swallow a failed server mutation and update local UI as if it succeeded.
- For destructive/paid/privileged actions, verify the server result before presenting success.

## Testing rules

At minimum, release PRs must clear the existing quality gate:

```bash
npm ci
npm run type-check
npm run lint
npm test -- --runInBand
npx expo-doctor
npm run export:web
```

The GitHub full quality workflow also verifies key static web routes, and CodeQL runs separately.

Tests should cover important failure conditions, especially:

- missing auth
- server/RPC errors
- permission/location failures
- malformed or missing browser origin for web auth
- duplicate/invalid submissions
- server-managed contract shape changes

## Dependency rules

- Use npm and commit `package-lock.json` whenever dependency resolution changes.
- Use Expo-compatible package versions.
- Do not run `npm audit fix --force` as a blanket repair.
- Do not introduce a major framework/package upgrade merely to silence a transitive warning during release cleanup.
- Remove project-owned deprecated setup when it can be done safely; schedule transitive dependency upgrades as controlled changes with a regenerated lockfile and full gate.

## Git / PR rules

Before merging:

1. Compare the branch with current `main`.
2. Drop already-landed or superseded changes.
3. Rebase/carry forward only unique work when `main` moved significantly.
4. Require CI, CodeQL, and the full quality gate for release changes.
5. Prefer the repository-supported squash/rebase merge method.
6. Close disposable verification PRs and stale superseded PRs so they cannot be merged later by mistake.

## Definition of done

A change is done when:

- the real product path works by design
- backend/data behavior is consistent with the live contract
- errors are handled honestly
- tests/types/lint pass
- Expo Doctor passes
- web export passes when applicable
- no newer `main` work is overwritten
- native-only behavior is clearly left for real-device QA when CI cannot validate it
- the repo docs/checklist are updated if release truth changed

**Do not settle for “good enough” by hiding a broken feature. Fix it correctly or leave the remaining blocker explicitly documented.**
