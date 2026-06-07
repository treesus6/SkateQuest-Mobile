/**
 * otaUpdates.ts
 * Handles Expo OTA (Over-The-Air) updates.
 * Checks for updates on app load and applies them silently.
 * Only JS/TS changes can be OTA — native changes require a full build.
 */

import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';

export async function checkForOTAUpdate(options?: {
  silent?: boolean;
  forceReload?: boolean;
}): Promise<void> {
  // Skip in development — expo-updates doesn't work in dev
  if (__DEV__) return;

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
    Alert.alert(
      '🛹 Update Available',
      'A new version of SkateQuest is ready. Reload now?',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Reload',
          onPress: async () => {
            await Updates.reloadAsync();
          },
        },
      ]
    );
  } catch (error) {
    // Don't crash the app over update failures
    Sentry.captureException(error, {
      tags: { component: 'otaUpdates' },
    });
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
