/**
 * otaUpdates.ts
 * Handles Expo OTA (Over-The-Air) updates.
 * Only JS/TS changes can be OTA — native changes require a full build.
 *
 * The app does NOT check for updates on load itself: app.config.js sets
 * `updates.checkAutomatically` to 'ON_LOAD', so Expo already checks when
 * the app launches. This module only exists for an explicit, user-triggered
 * check, and it runs only when OTA updates are actually enabled
 * (`Updates.isEnabled`). Routine check failures are logged locally and are
 * never sent to Sentry.
 */

import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { Logger } from './logger';

export async function checkForOTAUpdate(options?: {
  silent?: boolean;
  forceReload?: boolean;
}): Promise<void> {
  // Skip in development — expo-updates doesn't work in dev — and skip
  // entirely when OTA updates are not enabled for this build.
  if (__DEV__ || !Updates.isEnabled) return;

  try {
    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) return;

    // Fetch the update
    await Updates.fetchUpdateAsync();

    if (options?.forceReload) {
      await Updates.reloadAsync();
      return;
    }

    if (options?.silent) {
      // Apply on next launch
      return;
    }

    // Ask the user
    Alert.alert('🛹 Update Available', 'A new version of SkateQuest is ready. Reload now?', [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Reload',
        onPress: async () => {
          await Updates.reloadAsync();
        },
      },
    ]);
  } catch (error) {
    // Don't crash the app over update failures, and don't send routine
    // check failures to Sentry — log them locally instead.
    Logger.warn('OTA update check failed', error);
  }
}

// Get current update info for debugging
export function getUpdateInfo() {
  return {
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
