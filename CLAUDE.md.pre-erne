# SkateQuest-Mobile — Claude Code Instructions

> **Read this entire file before touching any code. No exceptions.**

---

## CI/CD Status

- ✅ CI pipeline (lint, typecheck, tests, expo build) — passing as of 2026-04-03
- ✅ All GitHub secrets configured (EXPO_TOKEN, MAPBOX_DOWNLOADS_TOKEN, Supabase, Sentry)
- ✅ Issue #13 resolved (loading state, analytics, Mapbox plugin)
- ✅ Mapbox SDK upgraded to v11.20.1

---

## Developer Environment

- **Primary device:** Android phone running Termux
- **Secondary:** Chromebook Linux terminal
- **Editor:** `micro` (terminal-based, no VS Code)
- **Metro bundler:** CANNOT run locally — Android kernel blocks it
- **Every change = full remote build (~38 min on EAS)**
- **Build credits cost real money — get it right before pushing**
- **Git identity:** treevanderveer@gmail.com / treesus6
- **GitHub:** https://github.com/treesus6/SkateQuest-Mobile (public)

### Termux-Specific Requirements

```bash
# TMPDIR must be set — Claude Code needs it
export TMPDIR=$PREFIX/tmp

# ripgrep is installed at:
/data/data/com.termux/files/usr/bin/rg

# Node path in Termux:
/data/data/com.termux/files/usr/bin/node

# Files are on /sdcard, not /home
# Claude Code installed globally:
npm install -g @anthropic-ai/claude-code
```

---

## Project Overview

React Native / Expo app mapping **27,000+ skateparks** worldwide. Built for the global skateboarding community.

**Core features:**

- Interactive Mapbox map with 27k+ skatepark markers (PostGIS RPC queries)
- XP/gamification system with levels, streaks, daily quests
- Crew system (crew battles, territory control, king of the hill)
- Video challenges, trick tracker, AI trick analysis
- Social feed, callouts, ghost clip viewer
- Spot check-ins, reviews, conditions reporting
- QR geocache scanning, hidden gems
- Seasonal passes, skate TV, mentorship
- Leaderboards (global + sponsor), judge's booth
- Offline support with mutation queue + background sync
- Sentry error tracking + Vexo analytics

---

## Tech Stack

| Layer          | Package              | Version                    |
| -------------- | -------------------- | -------------------------- |
| Framework      | Expo                 | ~54.0.33                   |
| Language       | TypeScript           | ^5.1.3                     |
| Runtime        | React Native         | 0.81.5                     |
| JS Engine      | Hermes               | (set in app.config.js)     |
| Navigation     | React Navigation v6  | bottom tabs + native stack |
| Backend        | Supabase             | ^2.89.0                    |
| Database       | PostgreSQL + PostGIS | (via Supabase)             |
| Maps           | @rnmapbox/maps       | ^10.2.10                   |
| Styling        | NativeWind v4        | ^4.2.3                     |
| CSS            | Tailwind             | ^4.2.2                     |
| State          | Zustand              | ^5.0.11                    |
| Error tracking | @sentry/react-native | ~7.2.0                     |
| Analytics      | vexo-analytics       | 1.5.4                      |
| Build          | EAS (paid)           | —                          |
| CI/CD          | GitHub Actions       | —                          |
| Gradle         | 8.10.2               | —                          |
| AGP            | 8.5.2                | —                          |

**Key libraries:** expo-location, expo-camera, expo-image-picker, expo-notifications, expo-av, react-native-reanimated ~4.1.1, react-native-safe-area-context, FlashList, yup, sanitize-html, lucide-react-native

---

## Project File Structure

```
SkateQuest-Mobile/
├── App.tsx                    # Root — auth routing, Sentry.wrap, Vexo init
├── app.config.js              # Expo config, plugins, env vars
├── global.css                 # NativeWind global styles
├── CLAUDE.md                  # ← you are here
│
├── screens/                   # 40+ screens
│   ├── LoginScreen.tsx
│   ├── SignupScreen.tsx
│   ├── MapScreen.tsx          # Main map with 27k spots
│   ├── HomeScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── ChallengesScreen.tsx
│   ├── CrewScreen.tsx / CrewsScreen.tsx / CrewBattlesScreen.tsx
│   ├── FeedScreen.tsx
│   ├── LeaderboardScreen.tsx
│   ├── TrickTrackerScreen.tsx
│   └── ... (30+ more)
│
├── components/
│   ├── ChallengeApp.tsx       # Main app shell (tabs)
│   ├── HomeScreen.tsx         # Home component (different from screen)
│   ├── ErrorBoundary.tsx
│   ├── OfflineIndicator.tsx
│   ├── Onboarding.tsx
│   ├── PortalDimensionLogo.tsx  # NEVER REMOVE — community partnership
│   ├── Toast.tsx
│   └── ui/                    # Reusable UI primitives
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Dialog.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── ...
│
├── lib/                       # Services and utilities
│   ├── supabase.ts            # Supabase client (AsyncStorage + processLock)
│   ├── spotsService.ts        # Skatepark CRUD + geo queries
│   ├── profilesService.ts     # User profiles
│   ├── crewsService.ts        # Crew system
│   ├── challengesService.ts   # Challenge system
│   ├── eventsService.ts
│   ├── feedService.ts
│   ├── sentryUtils.ts         # logUserAction, logNavigation, trackOperation
│   ├── logger.ts              # Logger utility
│   ├── envValidation.ts       # Env var checks (NEVER throw before React mounts)
│   ├── backgroundSync.ts      # Offline mutation sync
│   ├── offlineCache.ts
│   ├── globalErrorHandler.ts
│   ├── security.ts
│   ├── validation.ts          # yup schemas
│   ├── trickAnalyzer.ts       # AI trick analysis
│   └── ...
│
├── stores/                    # Zustand stores
│   ├── useAuthStore.ts        # Auth state (user, session, loading)
│   ├── useNetworkStore.ts     # Online/offline state
│   └── useMutationQueueStore.ts  # Offline queue
│
├── hooks/
│   └── useSupabaseQuery.ts
│
├── plugins/
│   └── withMapboxRepo.js      # Custom Expo plugin — CodeQL flagged URL sanitization
│
├── assets/
│   └── supporters/
│       └── portal-dimension.png  # NEVER DELETE
│
├── __tests__/                 # Jest + RNTL test suite
│
├── .eas/workflows/            # EAS CI/CD workflows
├── .github/workflows/         # GitHub Actions (APK build etc.)
└── .claude/skills/            # Expo-specific skill references
```

---

## Critical Rules — Read Every Time

### NEVER DO THESE:

- ❌ Edit `ios/` or `android/` folders manually
- ❌ Use `react-native link`
- ❌ Use HTML elements: `div`, `span`, `p`, `button`, `input`
- ❌ Use absolute positioning — always Flexbox
- ❌ Use `sed` to fix TypeScript errors — rewrite files completely
- ❌ Patch files incrementally — read fully, then rewrite
- ❌ Push broken code — EAS build credits are not free
- ❌ Remove `PortalDimensionLogo` component or `portal-dimension.png`
- ❌ Add analytics/tracking without Tree's approval
- ❌ Throw errors in `validateEnvironment()` — causes white screen
- ❌ Return `null` during auth loading — causes white screen

### ALWAYS DO THESE:

- ✅ Read the full file before writing any fix
- ✅ Use `View`, `Text`, `ScrollView`, `Pressable` (React Native primitives)
- ✅ Use `className` with NativeWind for all styling
- ✅ Pass AsyncStorage explicitly to Supabase client
- ✅ Use RPC functions for all skatepark geo queries (27k parks — never `.from('skate_spots').select('*')` without filters)
- ✅ Wrap Supabase calls in try/catch with `ServiceError`
- ✅ Use `Logger` from `lib/logger.ts` (not bare `console.log`)
- ✅ Use `sentryUtils.ts` helpers for error/breadcrumb tracking
- ✅ Keep `portal-dimension.png` and `PortalDimensionLogo` — community partnership

---

## Supabase Client (Correct Pattern)

```typescript
// lib/supabase.ts — already correct, don't change
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { processLock } from '@supabase/auth-js';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage, // ← REQUIRED for React Native
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // ← REQUIRED for React Native
    lock: processLock, // ← prevents race conditions
  },
});
```

---

## Auth Architecture

```
App.tsx
  └── RootNavigator
        ├── loading → ActivityIndicator (NEVER return null)
        ├── !isOnboardingComplete → <Onboarding />
        ├── user → <ChallengeApp /> (main tabs)
        └── !user → LoginScreen / SignupScreen / ForgotPasswordScreen

useAuthStore (Zustand):
  - user: User | null
  - session: Session | null
  - loading: boolean (starts true, resolves after getSession())
  - 10s timeout prevents infinite loading
  - onAuthStateChange subscription for real-time auth events
```

**White screen root causes (already fixed — don't reintroduce):**

1. `validateEnvironment()` throwing before React mounted
2. `return null` during auth loading
3. Missing `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` in EAS secrets
4. Terser minifier bug in metro.config.js (aggressive minification)

---

## Sentry Setup

```typescript
// App.tsx — Sentry is initialized at top, app wrapped with Sentry.wrap()
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // config...
});

export default Sentry.wrap(App);
```

**Use sentryUtils.ts helpers — don't call Sentry directly in components:**

```typescript
import { logUserAction, logNavigation, trackOperation } from '../lib/sentryUtils';

logUserAction('spot_checkin', { spotId, userId });
logNavigation('MapScreen');
const result = await trackOperation('getNearbySpots', () => spotsService.getNearby(lat, lng));
```

---

## Build Commands

```bash
# Local dev (Termux) — Metro can't run, use for linting only
npx tsc --noEmit          # type check
npx eslint . --ext .ts,.tsx  # lint

# Remote builds (EAS — costs credits, use carefully)
eas build --platform android --profile preview    # preview APK
eas build --platform android --profile production # production AAB
eas update --branch production --message "fix: description"  # OTA update

# Logs
npx expo start 2>&1 | tee logs/expo.log
```

---

## Environment Variables

```
# .env.local (local dev — never commit)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_SENTRY_DSN=

# EAS secrets (for builds)
MAPBOX_DOWNLOADS_TOKEN=     # private Mapbox token for native SDK download
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SENTRY_DSN=
```

---

## Service Pattern

All services follow this pattern (see `lib/spotsService.ts`):

```typescript
import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const myService = {
  async doThing(param: string) {
    try {
      const { data, error } = await supabase.from('table').select('*').eq('id', param);
      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('myService.doThing failed', error);
      throw new ServiceError('Human-readable message', 'ERROR_CODE', error);
    }
  },
};
```

---

## Geo Queries (27k Parks)

**NEVER query all spots without spatial filtering:**

```typescript
// ❌ WRONG — loads 27k records
supabase.from('skate_spots').select('*');

// ✅ CORRECT — RPC with radius
supabase.rpc('get_nearby_spots', { lat, lng, radius_meters: 50000 });
```

---

## Testing

```bash
npx jest                          # all tests
npx jest __tests__/lib/           # service tests
npx jest --coverage               # with coverage
```

**Test files live in `__tests__/` mirroring source structure.**
**Mock `profilesService` directly — don't mock Supabase client.**

---

## Known Issues / Open Items

- **CodeQL:** `plugins/withMapboxRepo.js` has URL substring sanitization vulnerability (flagged, not yet fixed)
- **Sentry version:** `~7.2.0` — pinned, don't upgrade without testing
- **expo-router vs React Navigation:** Both are installed (expo-router for future migration). Current app uses React Navigation.
- **Vexo API key** is hardcoded in App.tsx — acceptable for analytics
- **Android kernel** blocks Metro in Termux — always build remotely

---

## Project Mission

> **Build for skaters, by skaters.**
> Donate 10% of profits to help kids who can't afford skateboards.
> Support DIY skate spots. Community-first, anti-corporate, authentic.
> Lurkwear (2010) + SkateQuest — same mission, different medium.

Portal Dimension (Kevin) — iOS distribution partner via AltStore. Their logo stays in the app permanently. It's a community partnership, not a sponsor.

---

## How Claude Should Work on This Codebase

1. **Read first, write second.** Always fetch the actual file from GitHub before proposing changes.
2. **Rewrite files completely.** Never patch with sed or partial edits.
3. **One complete solution.** Not incremental broken pushes.
4. **Check env vars.** Most bugs are missing secrets or wrong variable names.
5. **Respect the build cost.** 38 minutes and real money per build. Get it right.
6. **Never remove features.** This app has 40+ screens. Preserve everything.
7. **Ask about RLS.** Any new Supabase table needs RLS policies before it works.
