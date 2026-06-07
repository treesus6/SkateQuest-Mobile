---
name: sq-mobile-dev
description: Core React Native and Expo development standards for SkateQuest-Mobile. Use when building any UI component, screen, or feature. Prevents web-habit mistakes.
---

# Mobile Dev Standards — SkateQuest-Mobile

## Stack
React Native 0.81.5 · Expo SDK 54 · NativeWind · Mapbox v11 · Supabase · Sentry · React Navigation

## Hard Rules — Kill Web Habits
| ❌ Never | ✅ Use |
|---|---|
| `<div>` | `<View>` |
| `<span>` / `<p>` | `<Text>` |
| `<img>` | `<Image>` from `expo-image` |
| `<button>` / `onClick` | `<Pressable>` / `onPress` |
| CSS files | NativeWind or `StyleSheet.create` |
| `window.alert` | `Alert.alert` |

## Screen Layout
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
const MyScreen = () => (
  <SafeAreaView className="flex-1 bg-black">{/* content */}</SafeAreaView>
);
```

## Auth Guards
```tsx
const { session, isLoading } = useAuthStore();
if (isLoading) return <LoadingScreen />;
if (!session) return <Redirect to="Login" />;
```

## Expo SDK Preference
- `expo-image` over any other image component
- `expo-camera`, `expo-media-library`, `expo-status-bar` — always Expo version first

## Error Boundaries
Always report to Sentry in componentDidCatch:
```tsx
Sentry.captureException(error);
```

## Portal Dimension
Newport area has a clickable map marker for Portal Dimension (community supporter, handles iOS AltStore distribution). Do NOT remove or break this.
