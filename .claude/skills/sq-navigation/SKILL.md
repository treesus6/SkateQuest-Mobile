---
name: sq-navigation
description: Expo Router v4 navigation for SkateQuest-Mobile. Use when setting up navigators, navigating between screens, reading route params, or adding new screens. NEVER import from @react-navigation/native — always use expo-router.
---

# Navigation Standards — SkateQuest-Mobile (Expo Router v4)

## Hard Rule
NEVER import `useNavigation`, `useRoute`, or anything from `@react-navigation/native` in components.
ALWAYS use `useRouter`, `useLocalSearchParams`, `Link` from `expo-router`.

## Navigation Hooks
```tsx
import { useRouter, useLocalSearchParams, Link } from 'expo-router';

// Programmatic navigation
const router = useRouter();
router.push('/profile');
router.replace('/(auth)/sign-in');
router.back();

// Dynamic routes
router.push({ pathname: '/park/[id]', params: { id: parkId } });

// Read params
const { id, name } = useLocalSearchParams<{ id: string; name: string }>();

// Declarative link
<Link href="/map">Map</Link>
<Link href={{ pathname: '/park/[id]', params: { id: item.id } }}>View Park</Link>
```

## Route File Structure
```
app/
  _layout.tsx              # Root layout + providers
  index.tsx                # / home
  (tabs)/
    _layout.tsx            # Tab bar
    index.tsx              # default tab
    map.tsx                # /map
    profile.tsx            # /profile
  (auth)/
    _layout.tsx            # Auth stack
    sign-in.tsx
    sign-up.tsx
  park/
    [id].tsx               # /park/123
  +not-found.tsx
```

## Layout Files
```tsx
// Stack:
import { Stack } from 'expo-router';
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// Tabs:
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

## Auth Guard Pattern
```tsx
import { Redirect } from 'expo-router';
const { session, isLoading } = useAuthStore();
if (isLoading) return <ActivityIndicator />;
if (!session) return <Redirect href="/(auth)/sign-in" />;
```

## Adding a New Screen
1. Create file under `app/` following route conventions
2. Export a default React component
3. Use `useLocalSearchParams` for params — no manual param list needed
4. Register any tab in `(tabs)/_layout.tsx`

## Rules
- Never `navigation.navigate('Screen' as any)`
- Never bare `useNavigation()` — only `useRouter()`
- Grouped routes use parentheses: `(tabs)`, `(auth)` — these do NOT appear in URL
- Dynamic segments use brackets: `[id]`, `[parkId]`
