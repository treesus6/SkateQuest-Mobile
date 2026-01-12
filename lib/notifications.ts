import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and register for push notifications
 * Returns the Expo push token if successful
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on physical device (simulator/emulator check)
    if (!Constants.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission for push notifications not granted');
      return null;
    }

    // Get push token
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      })
    ).data;

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#d2673d',
      });

      // Create game-specific channel
      await Notifications.setNotificationChannelAsync('skate-game', {
        name: 'SKATE Game',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#d2673d',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Save push token to user's profile in Supabase
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Send a local notification (for testing or immediate feedback)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Schedule a notification for later
 */
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: any
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Listen for notification responses (when user taps notification)
 */
export function addNotificationResponseListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Listen for notifications received while app is in foreground
 */
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

// ============================================================================
// SKATE Game Specific Notifications
// ============================================================================

/**
 * Send notification when it's the user's turn in a SKATE game
 */
export async function notifyGameTurn(opponentUsername: string, gameId: string): Promise<void> {
  await sendLocalNotification(
    '🎯 Your Turn!',
    `${opponentUsername} posted a trick. Time to respond!`,
    {
      type: 'game_turn',
      gameId,
    }
  );
}

/**
 * Send notification when user wins a SKATE game
 */
export async function notifyGameWin(opponentUsername: string, gameId: string): Promise<void> {
  await sendLocalNotification('🏆 You Won!', `You defeated ${opponentUsername} in SKATE!`, {
    type: 'game_won',
    gameId,
  });
}

/**
 * Send notification when user loses a SKATE game
 */
export async function notifyGameLoss(opponentUsername: string, gameId: string): Promise<void> {
  await sendLocalNotification(
    '😢 Game Over',
    `${opponentUsername} won the game. Better luck next time!`,
    {
      type: 'game_lost',
      gameId,
    }
  );
}

/**
 * Send notification when challenged to a new SKATE game
 */
export async function notifyGameChallenge(
  challengerUsername: string,
  gameId: string
): Promise<void> {
  await sendLocalNotification(
    '🎮 New Challenge!',
    `${challengerUsername} challenged you to a game of SKATE!`,
    {
      type: 'game_challenge',
      gameId,
    }
  );
}

// ============================================================================
// Database Migration (Add push_token column to profiles table)
// ============================================================================

/**
 * SQL to add push_token column to profiles table:
 *
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
 * CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
 */
