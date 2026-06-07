---
name: sq-data
description: Typing Supabase queries, PostGIS responses, and Zustand stores for SkateQuest-Mobile. Use when writing data fetching, Supabase calls, or store definitions.
---

# Data & API Typing Standards — SkateQuest-Mobile

## Supabase Client
```ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
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

## Zustand Store Pattern
```ts
interface AuthState {
  session: Session | null; profile: UserProfile | null; isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  signOut: () => Promise<void>;
}
export const useAuthStore = create<AuthState>((set) => ({ ... }));
```

## PostGIS RPC
```ts
const { data } = await supabase.rpc('get_parks_in_bounds', {
  min_lat: bbox.minLat, max_lat: bbox.maxLat,
  min_lng: bbox.minLng, max_lng: bbox.maxLng,
}).returns<SkateparkDTO[]>();
```

## Rules
- Never use raw `supabase.from()` without `.returns<T>()` or `.single<T>()`.
- Always handle Supabase errors — never silently swallow them.
- Sentry must capture unexpected errors: `Sentry.captureException(error)`.
