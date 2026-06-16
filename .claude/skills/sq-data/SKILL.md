---
name: sq-data
description: Typing Supabase queries, PostGIS responses, Zustand stores, analytics, and TanStack Query for SkateQuest-Mobile. Use when writing data fetching, Supabase calls, store definitions, or analytics events.
---

# Data & API Typing Standards — SkateQuest-Mobile

## Runtime Env — CRITICAL for EAS builds
In EAS production builds, `process.env.EXPO_PUBLIC_*` is NOT available at runtime.
Always read config via `Constants.expoConfig.extra`:
```ts
import Constants from 'expo-constants';
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const posthogKey = Constants.expoConfig?.extra?.posthogKey ?? process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
```

## Supabase Client
```ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import Constants from 'expo-constants';
export const supabase = createClient<Database>(
  Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL!,
  Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Skatepark DTO
```ts
interface SkateparkDTO {
  id: string; name: string; latitude: number; longitude: number;
  city: string; state: string; country: string;
  surface_type?: string; park_type?: string; features?: string[];
}
```

## Supabase Query Pattern
```ts
const { data, error } = await supabase
  .from('skateparks').select('id, name, latitude, longitude')
  .returns<SkateparkDTO[]>();
if (error) throw error;
```

## PostGIS RPC — Always Use for Geo Queries
```ts
// WRONG — loads 27k rows
// supabase.from('skateparks').select('*')

// CORRECT — spatial filter
const { data } = await supabase.rpc('get_parks_in_bounds', {
  min_lat: bbox.minLat, max_lat: bbox.maxLat,
  min_lng: bbox.minLng, max_lng: bbox.maxLng,
}).returns<SkateparkDTO[]>();
```

## Zustand Store Pattern
```ts
import { create } from 'zustand';
interface AuthState {
  session: Session | null; profile: UserProfile | null; isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
}
export const useAuthStore = create<AuthState>((set) => ({ ... }));
// NOTE: use AsyncStorage for non-sensitive prefs, expo-secure-store for tokens
```

## TanStack Query — React Native Setup
```ts
// lib/queryClient.ts — DO NOT CHANGE — already wired correctly
import { focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

// Online state from NetInfo — NOT navigator.onLine (browser API, unavailable in RN)
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => { setOnline(!!state.isConnected); });
});

// Refetch on foreground — NOT window focus (browser API, unavailable in RN)
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => { handleFocus(state === 'active'); });
  return () => sub.remove();
});
```

## Analytics (PostHog)
```ts
import { analytics, SkateEvents } from '@/lib/analytics';
// Use helpers — never call PostHog fetch directly in components
SkateEvents.parkCheckedIn(parkId, city);
SkateEvents.xpEarned(50, 'checkin');
SkateEvents.levelUp(5);
// Key is read from Constants.expoConfig.extra.posthogKey — not process.env
```

## Rules
- Never `supabase.from()` without `.returns<T>()` or generic type
- Always handle Supabase errors — never silently swallow
- Sentry must capture unexpected errors: `Sentry.captureException(error)`
- Never query skateparks without spatial filter — 27k rows will crush performance
