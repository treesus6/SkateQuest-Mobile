# SkateQuest-Mobile — Claude Context

## Project
React Native / Expo app mapping 27,000+ skateparks globally. Community-first, built for skaters by skaters. Features: interactive map, XP/leveling, check-ins, video uploads, daily tricks, city wars, crew battles, skate shop directory. Donate 10% of profits to kids who can't afford boards. Support DIY skate spots.

**Repo**: `treesus6/SkateQuest-Mobile`
**Stack**: React Native 0.86.0 · Expo SDK 56 · Expo Router v4 · NativeWind v4 · Supabase · Mapbox v11 · Sentry · Zustand 5.x · react-native-reanimated v3

---

## Commands
```bash
npx tsc --noEmit          # type check — run before declaring anything done
npm run lint              # lint
npm test                  # tests
npx expo-doctor           # run before any build
git commit --no-verify -m "message"  # Termux — always bypass husky
git push origin main
```

---

## Critical Env Variables (GitHub Secrets + app.config.js extra)
- `EXPO_PUBLIC_MAPBOX_TOKEN` — **missing = white screen on launch**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_TOKEN` — EAS robot bot
- `GOOGLE_SERVICE_ACCOUNT_KEY` — Play Store submission
- `EXPO_PUBLIC_POSTHOG_KEY` — analytics (read via Constants.expoConfig.extra.posthogKey at runtime)

> **IMPORTANT**: In EAS production builds, `process.env.EXPO_PUBLIC_*` is NOT available at runtime.
> Always read runtime config from `Constants.expoConfig?.extra?.keyName` (set in app.config.js extra{}).
> Only use `process.env` as a fallback for local dev with a .env file.

---

## Expo Router v4 — File Conventions
```
app/
  _layout.tsx              # Root layout — Stack or Tabs navigator + providers
  index.tsx                # Home route (/)
  (tabs)/
    _layout.tsx            # Tab bar layout
    index.tsx              # First tab
    map.tsx                # /map tab
    profile.tsx            # /profile tab
  (auth)/
    _layout.tsx            # Auth stack layout
    sign-in.tsx            # /sign-in
    sign-up.tsx            # /sign-up
  [id]/
    index.tsx              # Dynamic route (/123)
    details.tsx            # /123/details
  +not-found.tsx           # 404 handler
```

### Navigation in components — ALWAYS use expo-router, NEVER @react-navigation/native
```tsx
import { useRouter, useLocalSearchParams, Link } from 'expo-router';

const router = useRouter();
router.push('/profile');
router.replace('/(auth)/sign-in');
router.back();

// Dynamic routes:
router.push({ pathname: '/[id]', params: { id: '123' } });

// Typed params:
const { id } = useLocalSearchParams<{ id: string }>();

// Declarative:
<Link href="/profile">Profile</Link>
<Link href={{ pathname: '/[id]', params: { id: item.id } }}>View</Link>
```

### Layout components
```tsx
// Stack layout in _layout.tsx:
import { Stack } from 'expo-router';
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// Tabs layout:
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
    </Tabs>
  );
}
```

---

## TypeScript Rules
- **No `any`** — use `unknown` + type guards, or call it out and fix it
- Every component needs `interface Props {}` above it
- `npx tsc --noEmit` must pass before any feature is "done"
- Always use `@/` path aliases — never relative `../../../`

---

## React Native Rules
- No `div`, `span`, `button`, `onClick` — this is NOT web
- No `Platform.OS` checks in shared components — use `Component.ios.tsx` / `Component.android.tsx`
- All screens need auth guards
- All touch targets minimum 44x44px
- `Pressable` over `TouchableOpacity`
- `expo-image` for all images
- NativeWind v4 for styling — no inline style objects in render
- All text in `<Text>` — no bare string literals in JSX
- `expo-secure-store` for sensitive data — NEVER AsyncStorage for tokens

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

## Reanimated v3
- ALL functions running on UI thread MUST have `'worklet'` directive at the top
- Never animate `width`/`height` with native driver — use `transform: scale`
- `useNativeDriver: true` mandatory on legacy `Animated` API

---

## Metro Config (metro.config.js)
- Base config from `@expo/metro-config`
- Path aliases: `@/components`, `@/hooks`, `@/lib`, `@/stores`
- SVG transformer: `react-native-svg-transformer`
- **Do NOT remove SVG transformer when editing metro.config.js**
- **Do NOT change sourceExts order**

---

## TanStack Query (React Native setup)
```ts
// lib/queryClient.ts — already wired, do not change
import { focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

// Online from NetInfo — NOT navigator.onLine (browser only)
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => { setOnline(!!state.isConnected); });
});

// Refetch on foreground — NOT window focus (browser only)
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => { handleFocus(state === 'active'); });
  return () => sub.remove();
});
```

---

## Database (Supabase — hreeuqdgrwvnxquxohod)
Tables: `skateparks` · `profiles` · `skate_shops` · `shop_members` · `user_crews` · `city_war_stats` · `daily_tricks` · `blocked_users`
**All new tables must have RLS enabled + policies.**
`spatial_ref_sys` — run `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;` in Supabase SQL editor.

---

## Zustand Store Pattern
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

## Known Fixed Issues — Never Reintroduce
- Missing `expo-splash-screen` → white screen
- Mapbox init at app start → crash (112MB RAM device) — init in MapScreen only
- `return null` during auth loading → gray screen — use `<ActivityIndicator />`
- `this.lock is not a function` → use `processLock` from `@supabase/auth-js`
- Sentry v8 + RN 0.81 conflict → resolved, don't change Sentry version
- `validateEnvironment()` throwing → white screen — log errors, never throw
- `process.env` at runtime in EAS → undefined — use `Constants.expoConfig.extra`

---

## Files Never to Touch
- `lib/supabase.ts` auth config (AsyncStorage, detectSessionInUrl, processLock)
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
