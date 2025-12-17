import PostHog from 'posthog-react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';

/**
 * Analytics setup using PostHog
 * Free, privacy-focused, self-hostable analytics
 */

let posthog: PostHog | null = null;

export async function initializeAnalytics(): Promise<void> {
  try {
    // Only initialize if PostHog API key is provided
    const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.log('PostHog API key not configured - analytics disabled');
      return;
    }

    posthog = await PostHog.initAsync(apiKey, {
      host,
      captureApplicationLifecycleEvents: true,
      captureDeepLinks: true,
    });

    // Set initial device properties
    const deviceInfo = {
      device_model: Device.modelName,
      device_brand: Device.brand,
      device_os: Device.osName,
      device_os_version: Device.osVersion,
      app_version: Application.nativeApplicationVersion,
      app_build: Application.nativeBuildVersion,
    };

    posthog.register(deviceInfo);

    console.log('Analytics initialized successfully');
  } catch (error) {
    console.error('Analytics initialization error:', error);
  }
}

/**
 * Track user event
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  if (!posthog) return;

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Identify user for analytics
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, any>
): void {
  if (!posthog) return;

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('Analytics identify error:', error);
  }
}

/**
 * Track screen view
 */
export function trackScreenView(
  screenName: string,
  properties?: Record<string, any>
): void {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Track user properties
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!posthog) return;

  try {
    posthog.register(properties);
  } catch (error) {
    console.error('Analytics set properties error:', error);
  }
}

/**
 * Reset analytics (on logout)
 */
export function resetAnalytics(): void {
  if (!posthog) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('Analytics reset error:', error);
  }
}

// Common event tracking helpers

export const Analytics = {
  // App lifecycle
  appOpened: () => trackEvent('app_opened'),
  appClosed: () => trackEvent('app_closed'),

  // Authentication
  signupStarted: () => trackEvent('signup_started'),
  signupCompleted: (method: string) => trackEvent('signup_completed', { method }),
  loginStarted: () => trackEvent('login_started'),
  loginCompleted: (method: string) => trackEvent('login_completed', { method }),
  logoutCompleted: () => trackEvent('logout_completed'),

  // Skatepark interactions
  skateparkSearched: (query: string) => trackEvent('skatepark_searched', { query }),
  skateparkViewed: (skateparkId: string, name: string) =>
    trackEvent('skatepark_viewed', { skatepark_id: skateparkId, name }),
  skateparkAdded: (skateparkId: string) =>
    trackEvent('skatepark_added', { skatepark_id: skateparkId }),
  skateparkRated: (skateparkId: string, rating: number) =>
    trackEvent('skatepark_rated', { skatepark_id: skateparkId, rating }),

  // Media interactions
  trickVideoUploaded: (mediaId: string, trickName?: string) =>
    trackEvent('trick_video_uploaded', { media_id: mediaId, trick_name: trickName }),
  trickPhotoUploaded: (mediaId: string) =>
    trackEvent('trick_photo_uploaded', { media_id: mediaId }),
  mediaLiked: (mediaId: string, mediaType: string) =>
    trackEvent('media_liked', { media_id: mediaId, media_type: mediaType }),
  mediaShared: (mediaId: string, platform: string) =>
    trackEvent('media_shared', { media_id: mediaId, platform }),

  // Challenge interactions
  challengeViewed: (challengeId: string) =>
    trackEvent('challenge_viewed', { challenge_id: challengeId }),
  challengeAccepted: (challengeId: string) =>
    trackEvent('challenge_accepted', { challenge_id: challengeId }),
  challengeCompleted: (challengeId: string, score: number) =>
    trackEvent('challenge_completed', { challenge_id: challengeId, score }),

  // Map interactions
  mapViewed: () => trackEvent('map_viewed'),
  mapMarkerTapped: (skateparkId: string) =>
    trackEvent('map_marker_tapped', { skatepark_id: skateparkId }),
  locationEnabled: () => trackEvent('location_enabled'),
  locationDenied: () => trackEvent('location_denied'),

  // Profile interactions
  profileViewed: (userId: string) => trackEvent('profile_viewed', { user_id: userId }),
  profileEdited: () => trackEvent('profile_edited'),
  avatarChanged: () => trackEvent('avatar_changed'),

  // Social interactions
  userFollowed: (userId: string) => trackEvent('user_followed', { user_id: userId }),
  userUnfollowed: (userId: string) => trackEvent('user_unfollowed', { user_id: userId }),
  commentAdded: (mediaId: string) => trackEvent('comment_added', { media_id: mediaId }),

  // Leaderboard
  leaderboardViewed: () => trackEvent('leaderboard_viewed'),

  // Errors
  errorOccurred: (errorType: string, errorMessage: string) =>
    trackEvent('error_occurred', { error_type: errorType, error_message: errorMessage }),
};

export default Analytics;
