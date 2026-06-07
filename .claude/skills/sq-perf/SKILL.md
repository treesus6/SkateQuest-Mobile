---
name: sq-perf
description: Performance and UI optimization for SkateQuest-Mobile. Use when building lists, map overlays, animations, or any screen with heavy data.
---

# Performance & UI Guidelines — SkateQuest-Mobile

## Lists
Use `FlashList` for ANY list over 20 items:
```tsx
<FlashList data={skateparks} renderItem={({ item }) => <SkateparkCard park={item} />}
  estimatedItemSize={80} keyExtractor={(item) => item.id} />
```

## Map Performance (27k Parks)
- Never render all 27k markers at once — always bounding box filter
- Defer Mapbox init to MapScreen only — NOT at app start (crashes on 112MB RAM device)
- Use clustering for zoom < 12, individual markers at zoom >= 12

## Images
```tsx
import { Image } from 'expo-image';
<Image source={{ uri: avatarUrl }} priority="high" contentFit="cover" />
<Image source={{ uri: thumbUrl }} priority="low" contentFit="cover" recyclingKey={parkId} />
```

## Animations
- Use `react-native-reanimated` — runs on UI thread
- Legacy `Animated` API: `useNativeDriver: true` is mandatory
- Never animate `width`/`height` with native driver — use `transform: scale`

## Preventing Rerenders
```tsx
const sortedParks = useMemo(() => parks.sort(...), [parks]);
const handleCheckin = useCallback((parkId: string) => { ... }, [userId]);
const SkateparkCard = React.memo(({ park }) => { ... });
```

## Touch Targets
- All touchable elements minimum **44x44px**
- Use `Pressable` over `TouchableOpacity`

## NativeWind
- Use class names for all standard styling — no inline style objects in render
- `StyleSheet.create` only for transforms, shadows
