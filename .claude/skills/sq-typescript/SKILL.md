---
name: sq-typescript
description: Strict TypeScript for SkateQuest-Mobile. Use for all component props, Supabase row types, navigation types, and API responses. No any. Ever.
---

# TypeScript Standards — SkateQuest-Mobile

## Core Rules
- **No `any`**: Use `unknown` if type is truly dynamic, then narrow with type guards. If I write `any`, call it out.
- **Run before done**: Always run `npx tsc --noEmit` before declaring a feature complete.

## Component Pattern
```tsx
interface Props {
  parkId: string;
  onPress: (id: string) => void;
  isVisited?: boolean;
}
const SkateparkCard = ({ parkId, onPress, isVisited = false }: Props) => {};
```

## Interface vs Type
- `interface` → Objects, data models, Supabase rows
- `type` → Unions, `Omit<>`, `Pick<>`, simple aliases

## Supabase Row Types
```ts
import { Database } from '@/types/supabase';
type Skatepark = Database['public']['Tables']['skateparks']['Row'];
type UserProfile = Database['public']['Tables']['profiles']['Row'];
type SkateShop = Database['public']['Tables']['skate_shops']['Row'];
```

## Null Safety
```ts
const name = user?.profile?.username ?? 'Skater';
const xp = session?.user?.user_metadata?.xp ?? 0;
```

## Path Aliases
Always use `@/` aliases: `@/components/`, `@/hooks/`, `@/lib/`

## Enums
```ts
const enum UserRole { Skater = 'skater', ShopOwner = 'shop_owner', Admin = 'admin' }
const enum AppStatus { Loading = 'loading', Authenticated = 'authenticated', Unauthenticated = 'unauthenticated' }
```
