# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
React Native / Expo app mapping 27,000+ skateparks globally, built by a skater for skaters. Features: interactive map, XP/leveling, check-ins, video uploads, daily tricks, city wars, crew battles, skate shop directory. Donates 10% of profits to kids who can't afford boards; supports DIY skate spots.

**Repo**: `treesus6/SkateQuest-Mobile`
**Stack**: React Native 0.86.2 · React 19.2 · Expo SDK 57 · Expo Router v6 (file conventions below are v4-style and still apply) · NativeWind v4 · Supabase (PostgreSQL + PostGIS) · Mapbox v11 (`@rnmapbox/maps`) · Sentry · Zustand 5.x · react-native-reanimated 4.x (worklets now ship from the separate `react-native-worklets` package)

---

## Product Integrity — Non-negotiable

Read and follow [AGENTS.md](./AGENTS.md) before changing any code.

**DO NOT “FIX” MISSING SCHEMA OR TYPE ERRORS BY REMOVING FEATURES, USING LOCAL-ONLY STATE, ADDING NO-OPS, RETURNING FAKE SUCCESS, EMPTYING REAL FEEDS, OR MAKING BUTTONS APPEAR TO WORK WITHOUT REAL PERSISTENCE.**

When the app and Supabase schema disagree:

1. Inspect the live schema and existing migrations.
2. Define the intended real product behavior.
3. Add or correct the migration, RPC, RLS policy, or storage contract.
4. Wire the React Native screen to the real backend.
5. Verify the write with a read-back query.
6. Test failure behavior and Android behavior.
7. Report blockers honestly instead of hiding them.

The product owner explicitly prohibits fake mockups, fabricated content, dead buttons, and pretend-working features.

---

## Commands
```bash
npm run type-check        # tsc --noEmit — run before declaring anything done
npm run lint               # eslint . --ext .ts,.tsx,.js,.jsx
npm run lint:fix
npm run format              # prettier --write
npm test                    # jest (all tests)
npm test -- path/to/File.test.tsx   # single test file
npm test -- -t "test name"           # single test by name
npm run test:watch
npm run test:coverage
npx expo-doctor             # run before any build
git commit --no-verify -m "message"  # Termux workflow — always bypass husky
```

EAS builds (see `eas.json` for `development` / `preview` / `production` profiles):
```bash
npm run android             # eas build --platform android --profile preview
npm run ios                 # eas build --platform ios --profile preview
npm run build:production    # eas build --platform all --profile production
npm run update:production   # eas update --branch production (OTA, JS-only changes)
```

Husky (`pre-commit`, `pre-push`, `post-checkout`, `post-commit`, `post-merge`) + `lint-staged` run eslint/prettier on staged files. On Termux, bypass with `--no-verify` as shown above.

---

## Architecture: routes are thin re-exports of `screens/`

Every route file under `app/(screens)/*.tsx` and `app/(tabs)/*.tsx` (excluding each group's `_layout.tsx`, which defines the actual Stack/Tabs navigator) is a **one-line re-export**, not a real screen implementation:

```tsx
// app/(screens)/achievements.tsx
export { default } from '../../screens/AchievementsScreen';
```

The actual screen implementation, state, and layout logic lives in `screens/<Name>Screen.tsx` (60+ screens, one per feature). **When asked to modify a screen, edit the file in `screens/`, not the route wrapper in `app/`.** The route file only exists to satisfy Expo Router's file-based routing and almost never needs to change.

### Expo Router file conventions
```
app/
  _layout.tsx               # Root layout: Sentry.init, auth guard, providers, splash screen handling
  (auth)/
    _layout.tsx
    login.tsx                # -> screens/LoginScreen.tsx
    signup.tsx, forgot-password.tsx
  (tabs)/
    _layout.tsx               # Tab bar (index/map/crew/profile/quests)
  (screens)/
    _layout.tsx               # Stack for all non-tab screens
    <feature>.tsx              # -> screens/<Feature>Screen.tsx
  +not-found.tsx
```

Navigation in components — always `expo-router`, never `@react-navigation/native`:
```tsx
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
const router = useRouter();
router.push('/spot-detail');
router.replace('/(auth)/login');
const { id } = useLocalSearchParams<{ id: string }>();
```

### Root layout responsibilities (`app/_layout.tsx`)
- Initializes Sentry before any component renders, wraps the app in `Sentry.wrap(RootLayout)`
- `AuthGuard` component reads `useAuthStore` and redirects between `(auth)` and the app based on session state; keeps the splash screen visible via `SplashScreen.preventAutoHideAsync()` until auth resolves
- Calls `validateEnvironment()` (never throws — see Known Fixed Issues), starts `useNetworkStore`, rehydrates the offline mutation queue (`useMutationQueueStore`), starts `backgroundSync`, checks for OTA updates

---

## Data layer: no TanStack Query — custom Supabase hook + service modules

This app does **not** use TanStack Query / React Query. Data access follows this pattern instead:

1. **`lib/<feature>Service.ts`** — one file per domain (e.g. `spotsService.ts`, `crewsService.ts`, `achievementsService.ts`, `challengesService.ts`) wraps `supabase.from(...)` calls and returns `{ data, error }`.
2. **`hooks/useSupabaseQuery.ts`** — generic hook that wraps a service call with in-memory caching (TTL), optional persisted caching (`lib/persistentCache.ts`, stale-while-revalidate), and exponential-backoff retries (skips retry when the Supabase error's `code` starts with `'4'` — a Postgres/PostgREST error code like `42501`, not an HTTP status). Screens call it directly:
   ```tsx
   const { data, loading, error, refetch } = useSupabaseQuery(
     () => spotsService.getNearby(lat, lng),
     [lat, lng],
     { cacheKey: `spots-${lat}-${lng}`, persist: true }
   );
   ```
   Use `invalidateCache(key?)` from the same file to bust the in-memory + persistent cache after mutations.
3. Offline writes go through `stores/useMutationQueueStore.ts`, replayed by `lib/backgroundSync.ts` (the executor is registered in `app/_layout.tsx` — currently only `session_attendees`; extend it there when new offline-writable tables are added).

---

## Critical Env Variables (GitHub Secrets + `app.config.js` `extra{}`)
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` — **missing = white screen on launch** (map init reads this)
- `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` / `MAPBOX_DOWNLOADS_TOKEN` — secret token for the Mapbox SDK download (used by `plugins/withMapboxRepo.js` at prebuild time, not read at runtime)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_TOKEN` — EAS robot token (CI)
- `GOOGLE_SERVICE_ACCOUNT_KEY` — written to `./google-service-account.json` for EAS/Play Store submission
- `EXPO_PUBLIC_POSTHOG_KEY` — analytics (optional); read by `app.config.js` into `extra.posthogKey` and consumed by `lib/analytics.ts` (PostHog host is hardcoded there, not configurable via env). Note: `lib/envValidation.ts` and `.env.example` instead reference `EXPO_PUBLIC_POSTHOG_API_KEY`/`EXPO_PUBLIC_POSTHOG_HOST` — those aren't read anywhere at runtime; this is a pre-existing naming mismatch in the codebase, not a typo in this doc.

> **IMPORTANT**: In EAS production builds, `process.env.EXPO_PUBLIC_*` is NOT available at runtime.
> Always read runtime config from `Constants.expoConfig?.extra?.keyName` (set in `app.config.js` `extra{}`).
> Only fall back to `process.env` for local dev with a `.env` file (see `.env.example`).
> `lib/envValidation.ts` centralizes this and **must never throw** — it only logs, since throwing before React mounts produces a white screen.

---

## TypeScript Rules
- **No `any`** — use `unknown` + type guards, or call it out and fix it (note: `@typescript-eslint/no-explicit-any` is currently turned `off` in `eslint.config.js`, so this is enforced by convention/review, not the linter)
- Every component needs `interface Props {}` above it
- `npm run type-check` must pass before any feature is "done"
- Always use `@/` path aliases (see `metro.config.js` / `tsconfig.json`) — never relative `../../../`
- `tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters` all on

---

## React Native Rules
- No `div`, `span`, `button`, `onClick` — this is NOT web
- No `Platform.OS` checks in shared components — use `Component.ios.tsx` / `Component.android.tsx`
- All screens need auth guards (handled centrally by `AuthGuard` in `app/_layout.tsx` — don't duplicate ad hoc redirect logic per screen)
- All touch targets minimum 44x44px
- `Pressable` over `TouchableOpacity`
- `expo-image` for all images
- NativeWind v4 for styling (`className`, see `global.css` + `tailwind.config.js`) — no inline style objects in render
- All text in `<Text>` — no bare string literals in JSX
- `expo-secure-store` for sensitive data — NEVER AsyncStorage for tokens (Supabase auth session storage is the one sanctioned exception — see Files Never to Touch)

---

## Native Module Permissions — MANDATORY before any native API call
```tsx
// Camera:
import { useCameraPermissions } from 'expo-camera';
const [permission, requestPermission] = useCameraPermissions();
if (!permission?.granted) return <PermissionPrompt onRequest={requestPermission} />;

// Location:
import { requestForegroundPermissionsAsync } from 'expo-location';
const { status } = await requestForegroundPermissionsAsync();
if (status !== 'granted') return;

// Push notifications:
const { status: existingStatus } = await getPermissionsAsync();
let finalStatus = existingStatus;
if (existingStatus !== 'granted') {
  const { status } = await requestPermissionsAsync();
  finalStatus = status;
}
if (finalStatus !== 'granted') return;
const token = await getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId });
```

---

## Reanimated / Worklets
- `react-native-reanimated` is v4; the worklet runtime now ships in the separate `react-native-worklets` package (both installed) — don't assume v3 semantics
- ALL functions running on UI thread MUST have `'worklet'` directive at the top
- Never animate `width`/`height` with native driver — use `transform: scale`
- `useNativeDriver: true` mandatory on legacy `Animated` API

---

## Metro Config (`metro.config.js`)
- Base config from `@expo/metro-config`
- Path aliases: `@/components`, `@/hooks`, `@/lib`, `@/stores`
- SVG transformer: `react-native-svg-transformer`
- **Do NOT remove SVG transformer when editing metro.config.js**
- **Do NOT change sourceExts order**

---

## Database (Supabase — hreeuqdgrwvnxquxohod)
Key tables: `skateparks`/`skate_spots` · `profiles` · `skate_shops` · `shop_members` · `user_crews` · `city_war_stats` · `daily_tricks` · `blocked_users` (see `supabase/migrations/` for the full, ordered schema history — covering gamification, messaging, moderation, seasonal events, and a security-hardening pass).
**All new tables must have RLS enabled + policies.**
`spatial_ref_sys` — run `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;` in the Supabase SQL editor.

---

## Zustand Store Pattern
Stores live in `stores/`, one per domain (`useAuthStore`, `useNetworkStore`, `useAchievementStore`, `useMessagingStore`, `useMutationQueueStore`, `useNotificationStore`, `useSeasonalEventStore`). `stores/index.ts` only re-exports `useAuthStore` and `useNetworkStore` today — import the others directly from their file.

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage OK for non-sensitive user prefs
// expo-secure-store for tokens — never Zustand persist for auth tokens
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

---

## Testing
Jest + `jest-expo` preset + React Native Testing Library. Tests live in `__tests__/`, mirroring the source tree (`components/`, `hooks`, `integration`, `lib`, `screens`, `stores`). `jest.config.js` maps `@/` the same way Metro does.

---

## Known Fixed Issues — Never Reintroduce
- Missing `expo-splash-screen` → white screen
- Mapbox init at app start → crash (112MB RAM device) — init in `MapScreen` only
- `return null` during auth loading → gray screen — use `<ActivityIndicator />`
- `this.lock is not a function` → use `processLock` from `@supabase/auth-js`
- Sentry version pinned to `~8.16.0` for RN 0.81/0.86 compatibility — don't bump casually
- `validateEnvironment()` throwing → white screen — log errors, never throw
- `process.env` at runtime in EAS → undefined — use `Constants.expoConfig.extra`

---

## Files Never to Touch
- `lib/supabase.ts` auth config (AsyncStorage, `detectSessionInUrl: false`, `processLock`)
- `lib/envValidation.ts` — must never throw
- `components/PortalDimensionLogo.tsx` — permanent community partnership
- `assets/supporters/portal-dimension.png` — never delete

---

## Portal Dimension
Kevin's shop (Newport, OR) — map marker at 44.6368/-124.0537. iOS AltStore distribution partner. Community, not a sponsor. Do NOT remove.

---

## Active Skills
- [sq-typescript](./.claude/skills/sq-typescript)
- [sq-navigation](./.claude/skills/sq-navigation)
- [sq-data](./.claude/skills/sq-data)
- [sq-qa](./.claude/skills/sq-qa)
- [sq-perf](./.claude/skills/sq-perf)
- [sq-devops](./.claude/skills/sq-devops)
- [sq-mobile-dev](./.claude/skills/sq-mobile-dev)
- [skatequest-engineer](./.claude/skills/skatequest-engineer)

### expo/skills (via `npx skills add expo/skills --skill '*'`)
- [building-native-ui](./.claude/skills/building-native-ui)
- [eas-app-stores](./.claude/skills/eas-app-stores)
- [eas-hosting](./.claude/skills/eas-hosting)
- [eas-observe](./.claude/skills/eas-observe)
- [eas-simulator](./.claude/skills/eas-simulator)
- [eas-update-insights](./.claude/skills/eas-update-insights)
- [eas-workflows](./.claude/skills/eas-workflows)
- [expo-api-routes](./.claude/skills/expo-api-routes)
- [expo-app-clip](./.claude/skills/expo-app-clip)
- [expo-brownfield](./.claude/skills/expo-brownfield)
- [expo-cicd-workflows](./.claude/skills/expo-cicd-workflows)
- [expo-data-fetching](./.claude/skills/expo-data-fetching)
- [expo-deployment](./.claude/skills/expo-deployment)
- [expo-design-system](./.claude/skills/expo-design-system)
- [expo-dev-client](./.claude/skills/expo-dev-client)
- [expo-dom](./.claude/skills/expo-dom)
- [expo-examples](./.claude/skills/expo-examples)
- [expo-migrate-module](./.claude/skills/expo-migrate-module)
- [expo-module](./.claude/skills/expo-module)
- [expo-native-ui](./.claude/skills/expo-native-ui)
- [expo-project-structure](./.claude/skills/expo-project-structure)
- [expo-router](./.claude/skills/expo-router)
- [expo-skill-eval](./.claude/skills/expo-skill-eval)
- [expo-skill-feedback](./.claude/skills/expo-skill-feedback)
- [expo-tailwind-setup](./.claude/skills/expo-tailwind-setup)
- [expo-ui](./.claude/skills/expo-ui)
- [expo-upgrade](./.claude/skills/expo-upgrade)
- [expo-web-to-native](./.claude/skills/expo-web-to-native)
- [native-data-fetching](./.claude/skills/native-data-fetching)
- [upgrading-expo](./.claude/skills/upgrading-expo)
- [use-dom](./.claude/skills/use-dom)
