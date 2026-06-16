---
name: sq-mobile-dev
description: Core React Native and Expo SDK 54 development standards for SkateQuest-Mobile. Use when building any UI component, screen, or feature. Prevents web-habit mistakes and cross-platform errors.
---

# Mobile Dev Standards — SkateQuest-Mobile

## Stack
React Native 0.81.5 · Expo SDK 54 · Expo Router v4 · NativeWind v4 · Mapbox v11 · Supabase · Sentry · react-native-reanimated v3

## Hard Rules — Kill Web Habits
| ❌ Never | ✅ Use |
|---|---|
| `<div>` | `<View>` |
| `<span>` / `<p>` | `<Text>` |
| `<img>` | `<Image>` from `expo-image` |
| `<button>` / `onClick` | `<Pressable>` / `onPress` |
| CSS files | NativeWind v4 className |
| `window.alert` | `Alert.alert` |
| `Platform.OS` checks in shared components | Platform-specific files |
| `useNavigation()` from react-navigation | `useRouter()` from expo-router |
| Bare strings in JSX | `<Text>` wrapping all strings |
| AsyncStorage for tokens | `expo-secure-store` |
| `process.env` at runtime in EAS | `Constants.expoConfig.extra.keyName` |

## Platform-Specific Files
Instead of `Platform.OS === 'ios'` checks inside components:
```
MyButton.tsx          # shared logic
MyButton.ios.tsx      # iOS-specific
MyButton.android.tsx  # Android-specific
```
Metro picks the right file at build time. Cleaner, safer, no runtime branching.

## Screen Layout
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
const MyScreen = () => (
  <SafeAreaView className="flex-1 bg-black">
    {/* content */}
  </SafeAreaView>
);
```

## NativeWind v4
- className for all standard styling
- `StyleSheet.create` ONLY for transforms and shadows
- Never mix inline style objects with NativeWind in the same render

## Secure Storage
```tsx
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('auth_token', token);
const token = await SecureStore.getItemAsync('auth_token');
await SecureStore.deleteItemAsync('auth_token');
// Never: AsyncStorage.setItem('auth_token', ...) — not encrypted
```

## Native Module Permissions — Always Check First
```tsx
// Camera
import { useCameraPermissions } from 'expo-camera';
const [permission, requestPermission] = useCameraPermissions();
if (!permission?.granted) return <PermissionPrompt onRequest={requestPermission} />;

// Location
import { requestForegroundPermissionsAsync } from 'expo-location';
const { status } = await requestForegroundPermissionsAsync();
if (status !== 'granted') return;

// Notifications
const { status: existing } = await getPermissionsAsync();
if (existing !== 'granted') {
  const { status } = await requestPermissionsAsync();
  if (status !== 'granted') return;
}
```

## Reanimated v3
```tsx
// All UI-thread functions MUST have 'worklet' directive
const animatedStyle = useAnimatedStyle(() => {
  'worklet';
  return { transform: [{ scale: pressed.value ? 0.95 : 1 }] };
});
// Never animate width/height with native driver — use transform: scale
```

## Auth Guards
```tsx
import { Redirect } from 'expo-router';
const { session, isLoading } = useAuthStore();
if (isLoading) return <ActivityIndicator />;  // NEVER return null
if (!session) return <Redirect href="/(auth)/sign-in" />;
```

## Expo SDK Preference
- `expo-image` over any other image component
- `expo-camera`, `expo-media-library`, `expo-status-bar` — Expo version first
- `expo-secure-store` for ALL sensitive data

## Error Boundaries
Always report to Sentry in componentDidCatch:
```tsx
import * as Sentry from '@sentry/react-native';
Sentry.captureException(error);
```

## Portal Dimension
Newport, OR — permanent community partner. Map marker + logo stays forever.
