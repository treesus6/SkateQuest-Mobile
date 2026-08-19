/**
 * Compatibility navigation shim for legacy SkateQuest screens.
 *
 * New code should use expo-router directly. Legacy screens still call
 * navigation.navigate('ScreenName'), so keep those calls working by resolving
 * them to the public Expo Router URL. Route-group names such as (tabs) and
 * (screens) are implementation details and are intentionally omitted here.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';

type ParamListBase = Record<string, object | undefined>;

export type RouteProp<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = keyof ParamList
> = {
  key: string;
  name: RouteName;
  params: ParamList[RouteName];
};

export type NativeStackNavigationProp<
  ParamList extends ParamListBase = ParamListBase,
  _RouteName extends keyof ParamList = keyof ParamList
> = {
  navigate: (screenName: string, params?: Record<string, unknown>) => void;
  push: (screenName: string, params?: Record<string, unknown>) => void;
  replace: (screenName: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  setOptions: (options: Record<string, unknown>) => void;
  addListener: (event: string, callback: () => void) => { remove: () => void };
  emit: (event: Record<string, unknown>) => { defaultPrevented: boolean };
};

// Legacy screen name -> public Expo Router URL.
// Keep route groups out of these URLs so web/PWA and native use the same hrefs.
export const SCREEN_MAP: Record<string, string> = {
  // Auth
  Auth: '/login',
  Login: '/login',
  Signup: '/signup',
  ForgotPassword: '/forgot-password',

  // Tabs
  Home: '/',
  HomeTab: '/',
  Map: '/map',
  SpotsTab: '/map',
  Quests: '/quests',
  ChallengesTab: '/quests',
  Crew: '/crew',
  CrewTab: '/crew',
  Profile: '/profile',
  ProfileTab: '/profile',

  // Feature screens
  Feed: '/feed',
  Leaderboard: '/leaderboard',
  TrickTracker: '/trick-tracker',
  SkateGame: '/skate-game',
  GameDetail: '/game-detail',
  Playlists: '/playlists',
  Shops: '/shops',
  Crews: '/crews',
  CrewDetails: '/crew-details',
  Community: '/scene',
  Events: '/events',
  QRScanner: '/qr-scanner',
  HideQRCode: '/hide-qr-code',
  UploadMedia: '/upload-media',
  AddSpot: '/add-spot',
  SpotDetail: '/spot-detail',
  Challenges: '/challenges',
  CallOuts: '/call-outs',
  JudgesBooth: '/judges-booth',
  SkateTV: '/skate-tv',
  SpotReviews: '/spot-reviews',
  CheckIn: '/check-in',
  CrewBattles: '/crew-battles',
  Mentorship: '/mentorship',
  TrickBingo: '/trick-bingo',
  SpotConquer: '/spot-conquer',
  SpotMissionRoutes: '/spot-mission-routes',
  SeasonalPass: '/seasonal-pass',
  Streaks: '/streaks',
  WeatherSpots: '/weather-spots',
  HiddenGems: '/hidden-gems',
  SpotOfTheDay: '/spot-of-the-day',
  ClipOfWeek: '/clip-of-week',
  TrickTutorials: '/trick-tutorials',
  DonateXP: '/donate-xp',
  SponsorLeaderboard: '/sponsor-leaderboard',
  Sessions: '/sessions',
  XPRewards: '/xp-rewards',
  GoProImport: '/gopro-import',
  ActiveSession: '/active-session',
  Achievements: '/achievements',
  AiCoach: '/ai-coach',
  BountyBoard: '/bounty-board',
  Changelog: '/changelog',
  DailyQuests: '/daily-quests',
  DemoDay: '/demo-day',
  LiveCheckIn: '/live-check-in',
  MentorshipList: '/mentorship-list',
  Messages: '/messages',
  ModerationQueue: '/moderation-queue',
  Notifications: '/notifications',
  Referral: '/referral',
  Scene: '/scene',
  SeasonalEvents: '/seasonal-events',
  SkatePassport: '/skate-passport',
  SkateForecast: '/skate-forecast',
  SpotClaims: '/spot-claims',
  TrickOfWeek: '/trick-of-week',
  Spots: '/spots',
};

export function resolveScreenRoute(screenName: string): string | null {
  const mapped = SCREEN_MAP[screenName];
  if (mapped) return mapped;
  console.error(`[nav] Unknown screen: "${screenName}". Add it to SCREEN_MAP in lib/useNavigation.ts.`);
  return null;
}

function pushResolved(
  router: ReturnType<typeof useRouter>,
  method: 'push' | 'replace',
  screenName: string,
  params?: Record<string, unknown>
) {
  const pathname = resolveScreenRoute(screenName);
  if (!pathname) return;

  if (params && Object.keys(params).length > 0) {
    router[method]({ pathname: pathname as any, params: params as any });
  } else {
    router[method](pathname as any);
  }
}

export function useNavigation<_T = any>() {
  const router = useRouter();

  return {
    navigate: (screenName: string, params?: Record<string, unknown>) => {
      pushResolved(router, 'push', screenName, params);
    },
    push: (screenName: string, params?: Record<string, unknown>) => {
      pushResolved(router, 'push', screenName, params);
    },
    replace: (screenName: string, params?: Record<string, unknown>) => {
      pushResolved(router, 'replace', screenName, params);
    },
    goBack: () => router.back(),
    canGoBack: () => router.canGoBack(),
    setOptions: (_options: Record<string, unknown>) => {
      // Expo Router layouts own screen options.
    },
    addListener: (_event: string, _callback: () => void) => {
      // Legacy compatibility only. New screens should use Expo Router hooks.
      return { remove: () => {} };
    },
    emit: (_event: Record<string, unknown>) => ({ defaultPrevented: false }),
  };
}

export function useRoute<T = any>(): T {
  const params = useLocalSearchParams();
  return { params, key: '', name: '' } as unknown as T;
}
