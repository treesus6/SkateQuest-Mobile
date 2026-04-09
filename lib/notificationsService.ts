import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export const notificationsService = {
  async getNotifications(userId: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('notificationsService.getNotifications failed', error);
      throw new ServiceError('Failed to fetch notifications', 'NOTIFICATIONS_GET_FAILED', error);
    }
  },

  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      Logger.error('notificationsService.getUnreadCount failed', error);
      throw new ServiceError('Failed to get unread count', 'NOTIFICATIONS_UNREAD_COUNT_FAILED', error);
    }
  },

  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      Logger.error('notificationsService.markAsRead failed', error);
      throw new ServiceError('Failed to mark notification as read', 'NOTIFICATIONS_MARK_READ_FAILED', error);
    }
  },

  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
    } catch (error) {
      Logger.error('notificationsService.markAllAsRead failed', error);
      throw new ServiceError('Failed to mark all as read', 'NOTIFICATIONS_MARK_ALL_READ_FAILED', error);
    }
  },

  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      Logger.error('notificationsService.deleteNotification failed', error);
      throw new ServiceError('Failed to delete notification', 'NOTIFICATIONS_DELETE_FAILED', error);
    }
  },

  async subscribeToNotifications(userId: string, callback: (data: any) => void) {
    try {
      const subscription = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            Logger.info('New notification received', { userId });
            callback(payload.new);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      Logger.error('notificationsService.subscribeToNotifications failed', error);
      throw new ServiceError('Failed to subscribe to notifications', 'NOTIFICATIONS_SUBSCRIBE_FAILED', error);
    }
  },

  async sendTestNotification(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            type: 'system',
            title: 'Test Notification',
            body: 'This is a test notification from SkateQuest',
            data: { test: true },
          },
        ]);

      if (error) throw error;
    } catch (error) {
      Logger.error('notificationsService.sendTestNotification failed', error);
      throw new ServiceError('Failed to send test notification', 'NOTIFICATIONS_TEST_FAILED', error);
    }
  },
};
