# SkateQuest Mobile

SkateQuest is a real-world skateboarding companion app for discovering spots, progressing tricks, completing challenges, playing SKATE, joining crews, sharing clips, and connecting with the skate scene.

The project targets Android and web/PWA today, with iOS support available through Expo once the native release path is included in launch QA.

## Product principles

- **Real features, not mock UI.** User-facing actions must connect to their real Supabase, device, media, location, or platform behavior.
- **Global by design.** Spot discovery and community features must not be limited to a single local area.
- **Server-owned competitive state.** XP-sensitive and competitive flows use server/RPC validation rather than trusting client-side counters or winner state.
- **Native behavior stays native.** Mapbox, camera, location, video, notifications, and deep links require real-device validation even when CI is green.
- **Web is a first-class surface.** `skatequest.me` is deployed as an Expo web PWA with route and HTTPS smoke checks.

## Current stack

- React Native 0.86
- Expo SDK 57 / Expo Router
- React 19
- TypeScript 6
- Supabase: PostgreSQL, PostGIS, Auth, Storage, Edge Functions, RPCs
- Mapbox
- NativeWind
- Sentry
- EAS Build / EAS Update
- GitHub Actions / CodeQL

## Major features

### Map and real-world discovery

- Global skate spot map
- Park, street, DIY, quest, and shop filtering
- Nearby spot and shop discovery
- Spot details, conditions, photos, ratings, and directions
- Real-coordinate spot creation on native and web
- Check-ins and Skate Passport progression
- Partner markers such as Portal Dimension in Newport, Oregon

### Progression and challenges

- XP, levels, achievements, streaks, and seasonal progression
- Daily and community challenges
- Video/proof submissions and voting
- Trick tracker and tutorials
- Spot of the Day, hidden gems, route missions, and other discovery loops
- Server-verified shop reward redemption

### Community and competition

- Crews, membership, territory, and crew battles
- Sessions and RSVP/capacity handling
- Server-controlled games of SKATE with set/match phases, letters, winner state, and media proof
- Call-outs and challenge flows
- Leaderboards and progression surfaces

### QR Hunt

- Paid QR hide/support flow
- GPS-backed placement and claiming
- Trick proof and hider review
- Support-fund reporting
- Generated QR presentation for real-world hides

### Media

- SkateTV / community video feed
- Video upload and playback
- Comments and social actions
- Clip and spot discovery surfaces

## Repository layout

- `app/` — Expo Router routes and platform entry points
- `screens/` — application screens, including `.native.tsx` / `.web.tsx` platform splits
- `components/` — reusable UI and feature components
- `lib/` — service clients, navigation adapters, uploads, analytics, error handling
- `stores/` — Zustand state
- `supabase/migrations/` — source-controlled database migrations
- `supabase/functions/` — Supabase Edge Functions
- `__tests__/` — Jest test coverage
- `.github/workflows/` — CI, quality gate, web deployment, EAS, CodeQL

## Local setup

Use Node **22.22.1 or newer**.

```bash
npm ci
npm run type-check
npm run lint
npm test -- --runInBand
npx expo-doctor
```

Start Expo:

```bash
npm start
```

Android preview builds use EAS:

```bash
npm run android
```

Static web export:

```bash
npm run export:web
```

## Environment

Public runtime values are supplied through Expo/GitHub/EAS configuration rather than hardcoded privileged credentials. Typical variables include:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_SENTRY_DSN`

Privileged values such as Supabase service-role keys, Stripe secrets, and Mapbox download tokens belong only in server/runtime secret stores. Do not commit them.

## Quality gate

The full quality gate verifies:

1. frozen dependency install with `npm ci`
2. TypeScript
3. ESLint
4. Jest
5. Expo Doctor
6. Expo static web export
7. key exported web routes

CodeQL runs separately. Production web deployment also performs HTTPS smoke checks against the PWA and core routes.

## Release status

SkateQuest is in the **v1.0 release-candidate** stage. Automated checks and web deployment are active, but CI does not replace native validation.

Before a public Android release, the current preview APK still needs real-device end-to-end QA followed by a production AAB, signing/Play Console verification, store disclosures/assets, and internal-track validation. Supabase leaked-password protection and production monitoring checks also remain part of the release checklist.

See [CHANGELOG.md](./CHANGELOG.md) for the current release-candidate notes and GitHub issue **#37** for the live release checklist.

## Production web

- https://skatequest.me

## Support

- support@skatequest.me

---

Built for skateboarders and the skate community.
