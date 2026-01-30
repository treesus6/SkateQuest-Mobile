import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Types
interface ThroneNotification {
  spotId: string;
  spotName: string;
  newKingUsername: string;
  crewName?: string;
}

class NotificationService {
  private userId: string | null = null;
  private subscription: ReturnType<typeof supabase.channel> | null = null;

  // Initialize the notification service
  async initialize(userId: string) {
    this.userId = userId;

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('throne-alerts', {
        name: 'Throne Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Start listening for throne takeovers
    this.startThroneListener();

    return true;
  }

  // Start listening for throne takeovers on spots the user owns
  private startThroneListener() {
    if (!this.userId) return;

    // Subscribe to quest changes
    this.subscription = supabase
      .channel('throne-takeover-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quests',
        },
        async payload => {
          const oldRecord = payload.old as { current_king_id: string | null; spot_id: string };
          const newRecord = payload.new as { current_king_id: string | null; spot_id: string };

          // Check if user WAS the king and now isn't
          if (
            oldRecord.current_king_id === this.userId &&
            newRecord.current_king_id !== this.userId &&
            newRecord.current_king_id !== null
          ) {
            // Fetch spot details and new king info
            try {
              const [spotResult, kingResult] = await Promise.all([
                supabase
                  .from('spots')
                  .select('name, crews(name)')
                  .eq('id', newRecord.spot_id)
                  .single(),
                supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', newRecord.current_king_id)
                  .single(),
              ]);

              const spotName = spotResult.data?.name || 'Unknown Spot';
              const crewName = (spotResult.data?.crews as any)?.name;
              const newKingUsername = kingResult.data?.username || 'Someone';

              await this.sendThroneNotification({
                spotId: newRecord.spot_id,
                spotName,
                newKingUsername,
                crewName,
              });
            } catch (error) {
              console.error('Error fetching notification details:', error);
            }
          }
        }
      )
      .subscribe();
  }

  // Send local notification for throne takeover
  async sendThroneNotification(data: ThroneNotification) {
    const title = '🚨 YOUR THRONE WAS TAKEN!';
    const body = `${data.newKingUsername} took your crown at ${data.spotName}${
      data.crewName ? ` for ${data.crewName}` : ''
    }. Head there to reclaim it!`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'throne_takeover',
          spotId: data.spotId,
          spotName: data.spotName,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  }

  // Send general notification
  async sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
  }

  // Handle notification response (when user taps notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Clean up
  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Hook for use in components
export function useNotificationSetup(userId: string | undefined) {
  const setupNotifications = async () => {
    if (userId) {
      await notificationService.initialize(userId);
    }
  };

  return { setupNotifications };
}
