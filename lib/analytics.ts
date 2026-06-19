/**
 * analytics.ts
 * PostHog analytics for SkateQuest.
 * Tracks screen views, feature usage, and skate events.
 * All tracking is anonymous by default — no PII without explicit user consent.
 */

import Constants from 'expo-constants';

const POSTHOG_HOST = 'https://us.i.posthog.com';
// Read from Expo Constants (set via app.config.js extra.posthogKey)
// Falls back to process.env for local dev with .env file
const POSTHOG_KEY: string =
  (Constants.expoConfig?.extra?.posthogKey as string) ??
  process.env.EXPO_PUBLIC_POSTHOG_KEY ??
  '';

type EventPropertyValue = string | number | boolean | null | undefined | Record<string, unknown>;
interface EventProperties {
  [key: string]: EventPropertyValue;
}

// Lightweight PostHog client — no native SDK needed
class Analytics {
  private distinctId: string = 'anonymous';
  private enabled: boolean = !!POSTHOG_KEY;

  identify(userId: string, properties?: EventProperties) {
    this.distinctId = userId;
    if (!this.enabled) return;
    this.send('$identify', {
      $set: properties ?? {},
    });
  }

  track(event: string, properties?: EventProperties) {
    if (!this.enabled) return;
    this.send(event, properties ?? {});
  }

  screen(screenName: string, properties?: EventProperties) {
    if (!this.enabled) return;
    this.send('$screen', {
      $screen_name: screenName,
      ...properties,
    });
  }

  reset() {
    this.distinctId = 'anonymous';
  }

  private async send(event: string, properties: EventProperties) {
    try {
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event,
          distinct_id: this.distinctId,
          properties: {
            $lib: 'skatequest-mobile',
            ...properties,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Never crash the app over analytics
    }
  }
}

export const analytics = new Analytics();

// SkateQuest-specific event helpers
export const SkateEvents = {
  // Map
  mapOpened: () => analytics.track('map_opened'),
  parkViewed: (parkId: string, parkName: string) =>
    analytics.track('park_viewed', { park_id: parkId, park_name: parkName }),
  parkCheckedIn: (parkId: string, city: string) =>
    analytics.track('park_checked_in', { park_id: parkId, city }),

  // XP & Gamification
  xpEarned: (amount: number, source: string) =>
    analytics.track('xp_earned', { amount, source }),
  levelUp: (newLevel: number) =>
    analytics.track('level_up', { new_level: newLevel }),
  questCompleted: (questId: string, xpReward: number) =>
    analytics.track('quest_completed', { quest_id: questId, xp_reward: xpReward }),

  // Social
  crewJoined: (crewId: string) =>
    analytics.track('crew_joined', { crew_id: crewId }),
  videoUploaded: (trickName?: string) =>
    analytics.track('video_uploaded', { trick_name: trickName ?? 'unknown' }),
  trickAnalyzed: (trickName: string, difficulty: string) =>
    analytics.track('trick_analyzed', { trick_name: trickName, difficulty }),

  // Scene
  sceneEntryViewed: (entryId: string, category: string) =>
    analytics.track('scene_entry_viewed', { entry_id: entryId, category }),

  // QR Geocaching
  qrCodeHidden: () => analytics.track('qr_code_hidden'),
  qrCodeFound: () => analytics.track('qr_code_found'),

  // Crew Battles
  crewBattleCreated: (trickName: string) =>
    analytics.track('crew_battle_created', { trick_name: trickName }),
  crewBattleVoted: (battleId: string, crew: 'a' | 'b') =>
    analytics.track('crew_battle_voted', { battle_id: battleId, crew }),

  // Auth
  signedUp: () => analytics.track('signed_up'),
  signedIn: () => analytics.track('signed_in'),
  signedOut: () => analytics.track('signed_out'),

  // Errors
  errorOccurred: (screen: string, error: string) =>
    analytics.track('error_occurred', { screen, error }),
};
