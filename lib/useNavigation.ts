/**
 * useNavigation.ts
 *
 * Drop-in compatibility shim for screens that still use @react-navigation/native's
 * useNavigation() / useRoute() hooks. Import this file's version instead of the
 * react-navigation one and every screen works without touching navigation calls.
 *
 * Maps old ChallengeApp screen names → Expo Router paths.
 */

import { useRouter, useLocalSearchParams } from 'expo-router';

// Re-export React Navigation types that legacy screens still import from here
export type { RouteProp } from '@react-navigation/native';
export type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ─── Screen name → Expo Router path map ──────────────────────────────────────
const SCREEN_MAP: Record<string, string> = {
  // Auth
  Login:            '/(auth)/login',
  Signup:           '/(auth)/signup',
  ForgotPassword:   '/(auth)/forgot-password',

  // Tabs
  Home:             '/(tabs)/',
  HomeTab:          '/(tabs)/',
  Map:              '/(tabs)/map',
  SpotsTab:         '/(tabs)/map',
  Quests:           '/(tabs)/quests',
  ChallengesTab:    '/(tabs)/quests',
  Crew:             '/(tabs)/crew',
  CrewTab:          '/(tabs)/crew',
  Profile:          '/(tabs)/profile',
  ProfileTab:       '/(tabs)/profile',

  // Feature screens
  Feed:             '/(screens)/feed',
  Leaderboard:      '/(screens)/leaderboard',
  TrickTracker:     '/(screens)/trick-tracker',
  SkateGame:        '/(screens)/skate-game',
  GameDetail:       '/(screens)/game-detail',
  Playlists:        '/(screens)/playlists',
  Shops:            '/(screens)/shops',
  Crews:            '/(screens)/crews',
  Events:           '/(screens)/events',
  QRScanner:        '/(screens)/qr-scanner',
  HideQRCode:       '/(screens)/hide-qr-code',
  UploadMedia:      '/(screens)/upload-media',
  AddSpot:          '/(screens)/add-spot',
  SpotDetail:       '/(screens)/spot-detail',
  Challenges:       '/(screens)/challenges',
  CallOuts:         '/(screens)/call-outs',
  JudgesBooth:      '/(screens)/judges-booth',
  SkateTV:          '/(screens)/skate-tv',
  SpotReviews:      '/(screens)/spot-reviews',
  CheckIn:          '/(screens)/check-in',
  CrewBattles:      '/(screens)/crew-battles',
  Mentorship:       '/(screens)/mentorship',
  TrickBingo:       '/(screens)/trick-bingo',
  SpotConquer:      '/(screens)/spot-conquer',
  SeasonalPass:     '/(screens)/seasonal-pass',
  Streaks:          '/(screens)/streaks',
  WeatherSpots:     '/(screens)/weather-spots',
  HiddenGems:       '/(screens)/hidden-gems',
  SpotOfTheDay:     '/(screens)/spot-of-the-day',
  ClipOfWeek:       '/(screens)/clip-of-week',
  TrickTutorials:   '/(screens)/trick-tutorials',
  DonateXP:         '/(screens)/donate-xp',
  SponsorLeaderboard: '/(screens)/sponsor-leaderboard',
  Sessions:         '/(screens)/sessions',
  XPRewards:        '/(screens)/xp-rewards',
  GoProImport:      '/(screens)/gopro-import',
  ActiveSession:    '/(screens)/active-session',
  Achievements:     '/(screens)/achievements',
  AiCoach:          '/(screens)/ai-coach',
  BountyBoard:      '/(screens)/bounty-board',
  Changelog:        '/(screens)/changelog',
  DailyQuests:      '/(screens)/daily-quests',
  DemoDay:          '/(screens)/demo-day',
  LiveCheckIn:      '/(screens)/live-check-in',
  MentorshipList:   '/(screens)/mentorship-list',
  Messages:         '/(screens)/messages',
  ModerationQueue:  '/(screens)/moderation-queue',
  Notifications:    '/(screens)/notifications',
  Referral:         '/(screens)/referral',
  Scene:            '/(screens)/scene',
  SeasonalEvents:   '/(screens)/seasonal-events',
  SkatePassport:    '/(screens)/skate-passport',
  SkateForecast:    '/(screens)/skate-forecast',
  SpotClaims:       '/(screens)/spot-claims',
  TrickOfWeek:      '/(screens)/trick-of-week',
  Spots:            '/(screens)/spots',
};

function resolveRoute(screenName: string): string {
  const mapped = SCREEN_MAP[screenName];
  if (!mapped) {
    console.warn(`[nav] Unknown screen: "${screenName}" — add it to SCREEN_MAP in lib/useNavigation.ts`);
    return '/(tabs)/';
  }
  return mapped;
}

// ─── useNavigation shim ───────────────────────────────────────────────────────
export function useNavigation<_T = any>() {
  const router = useRouter();

  return {
    navigate: (screenName: string, params?: Record<string, unknown>) => {
      const path = resolveRoute(screenName);
      if (params) {
        router.push({ pathname: path as any, params: params as any });
      } else {
        router.push(path as any);
      }
    },
    push: (screenName: string, params?: Record<string, unknown>) => {
      const path = resolveRoute(screenName);
      if (params) {
        router.push({ pathname: path as any, params: params as any });
      } else {
        router.push(path as any);
      }
    },
    replace: (screenName: string, params?: Record<string, unknown>) => {
      const path = resolveRoute(screenName);
      if (params) {
        router.replace({ pathname: path as any, params: params as any });
      } else {
        router.replace(path as any);
      }
    },
    goBack: () => router.back(),
    canGoBack: () => router.canGoBack(),
    setOptions: (_options: Record<string, unknown>) => {
      // No-op: Expo Router handles screen options via layout files
    },
    addListener: (_event: string, _callback: () => void) => {
      // No-op shim for screens that add focus/blur listeners
      return { remove: () => {} };
    },
    emit: (_event: Record<string, unknown>) => ({ defaultPrevented: false }),
  };
}

// ─── useRoute shim ────────────────────────────────────────────────────────────
export function useRoute<T = any>(): T {
  const params = useLocalSearchParams();
  return { params, key: '', name: '' } as unknown as T;
}
