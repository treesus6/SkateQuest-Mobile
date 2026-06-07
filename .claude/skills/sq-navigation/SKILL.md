---
name: sq-navigation
description: Typed React Navigation for SkateQuest-Mobile. Use when setting up navigators, useNavigation, useRoute, or adding new screens.
---

# Navigation Typing Standards — SkateQuest-Mobile

## Central Param List
```ts
// @/navigation/types.ts
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  MapScreen: { initialRegion?: { lat: number; lng: number } };
  ParkDetail: { parkId: string; parkName: string };
  ParkCheckin: { parkId: string };
  UserProfile: { userId: string };
  EditProfile: undefined;
  Leaderboard: undefined;
  DailyTrick: undefined;
  CityWar: { cityId?: string };
  Crew: { crewId: string };
  ShopDetail: { shopId: string };
  VideoUpload: { parkId: string };
  Settings: undefined;
};
```

## useNavigation Hook
```ts
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
navigation.navigate('ParkDetail', { parkId: '123', parkName: 'Lincoln City Skatepark' });
```

## useRoute Hook
```ts
const route = useRoute<RouteProp<RootStackParamList, 'ParkDetail'>>();
const { parkId, parkName } = route.params;
```

## Screen Component Pattern
```tsx
type Props = NativeStackScreenProps<RootStackParamList, 'ParkDetail'>;
const ParkDetailScreen = ({ navigation, route }: Props) => {
  const { parkId } = route.params;
};
```

## Rules
- Adding a new screen? Register it in `RootStackParamList` FIRST.
- Never use `navigation.navigate('SomeScreen' as any)`.
- `undefined` params = screen takes no params. Always explicit.
