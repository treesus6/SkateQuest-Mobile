import { create } from 'zustand';
import { Logger } from '../lib/logger';
import { notificationsService } from '../lib/notificationsService';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
  read_at?: string;
  created_at: string;
}

interface NotificationStoreState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  initialize: (userId: string) => () => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  initialize: (userId: string) => {
    set({ loading: true });

    // Load initial notifications
    notificationsService
      .getNotifications(userId, 50)
      .then(data => {
        set({ notifications: data || [], loading: false });
        Logger.info('Notifications loaded', { userId, count: data?.length || 0 });
      })
      .catch(error => {
        Logger.error('Failed to load notifications', error);
        set({ loading: false });
      });

    // Get unread count
    notificationsService
      .getUnreadCount(userId)
      .then(count => {
        set({ unreadCount: count });
      })
      .catch(error => {
        Logger.error('Failed to get unread count', error);
      });

    // Subscribe to real-time updates
    let channel: { unsubscribe: () => void } | null = null;
    notificationsService
      .subscribeToNotifications(userId, (newNotification: Notification) => {
        const current = get().notifications;
        set({
          notifications: [newNotification, ...current],
          unreadCount: get().unreadCount + 1,
        });
        Logger.info('Real-time notification received', { type: newNotification.type });
      })
      .then(sub => {
        channel = sub;
      })
      .catch(error => {
        Logger.error('Failed to subscribe to notifications', error);
      });

    // Return cleanup function
    return () => {
      channel?.unsubscribe();
    };
  },

  addNotification: (notification: Notification) => {
    const current = get().notifications;
    set({
      notifications: [notification, ...current],
      unreadCount: get().unreadCount + 1,
    });
  },

  markAsRead: async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      const updated = get().notifications.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      );
      set({
        notifications: updated,
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
      Logger.info('Notification marked as read', { notificationId });
    } catch (error) {
      Logger.error('Failed to mark notification as read', error);
      throw error;
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      await notificationsService.markAllAsRead(userId);
      const updated = get().notifications.map(n => ({
        ...n,
        read_at: new Date().toISOString(),
      }));
      set({
        notifications: updated,
        unreadCount: 0,
      });
      Logger.info('All notifications marked as read', { userId });
    } catch (error) {
      Logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      const updated = get().notifications.filter(n => n.id !== notificationId);
      set({
        notifications: updated,
      });
      Logger.info('Notification deleted', { notificationId });
    } catch (error) {
      Logger.error('Failed to delete notification', error);
      throw error;
    }
  },

  refreshNotifications: async (userId: string) => {
    try {
      set({ loading: true });
      const data = await notificationsService.getNotifications(userId, 50);
      const count = await notificationsService.getUnreadCount(userId);
      set({
        notifications: data || [],
        unreadCount: count,
        loading: false,
      });
      Logger.info('Notifications refreshed', { userId });
    } catch (error) {
      Logger.error('Failed to refresh notifications', error);
      set({ loading: false });
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },
}));
