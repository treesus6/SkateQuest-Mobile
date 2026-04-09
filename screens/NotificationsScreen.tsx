import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Bell, Trash2, Check, Clock } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import Card from './ui/Card';
import Button from './ui/Button';
import { Logger } from '../lib/logger';

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const typeColors: { [key: string]: string } = {
    challenge: '#F59E0B',
    crew: '#6B4CE6',
    achievement: '#d2673d',
   message: '#0EA5E9',
    nearby: '#22C55E',
    seasonal: '#EC4899',
    system: '#6B7280',
  };

  const color = typeColors[notification.type] || '#6B7280';
  const isRead = !!notification.read_at;
  const createdDate = new Date(notification.created_at);
  const now = new Date();
  const diff = now.getTime() - createdDate.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let timeStr = '';
  if (minutes < 1) timeStr = 'Just now';
  else if (minutes < 60) timeStr = `${minutes}m ago`;
  else if (hours < 24) timeStr = `${hours}h ago`;
  else if (days < 7) timeStr = `${days}d ago`;
  else timeStr = createdDate.toLocaleDateString();

  return (
    <Card className={isRead ? 'opacity-60' : ''}>
      <View className="flex-row gap-3">
        {/* Icon */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Bell size={20} color={color} strokeWidth={1.5} />
        </View>

        {/* Content */}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="font-bold flex-1"
              style={{ color: isRead ? '#666' : '#000' }}
            >
              {notification.title}
            </Text>
            <Text className="text-xs text-gray-500">{timeStr}</Text>
          </View>

          {notification.body && (
            <Text className="text-sm text-gray-600" numberOfLines={2}>
              {notification.body}
            </Text>
          )}

          <View className="flex-row gap-2 mt-2">
            {!isRead && (
              <TouchableOpacity
                onPress={() => onMarkAsRead(notification.id)}
                className="flex-row items-center gap-1 px-2 py-1 bg-blue-500/10 rounded-lg"
              >
                <Check size={14} color="#0EA5E9" strokeWidth={2} />
                <Text className="text-xs font-semibold text-blue-600">Mark as read</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => onDelete(notification.id)}
              className="flex-row items-center gap-1 px-2 py-1 bg-red-500/10 rounded-lg"
            >
              <Trash2 size={14} color="#EF4444" strokeWidth={2} />
              <Text className="text-xs font-semibold text-red-600">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, refreshNotifications, markAsRead, deleteNotification, markAllAsRead } =
    useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!user?.id) return;
      // Refresh when screen is focused
      refreshNotifications(user.id).catch((error) => {
        Logger.error('Failed to refresh notifications', error);
      });
    });

    return unsubscribe;
  }, [navigation, user?.id]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await refreshNotifications(user.id);
    } catch (error) {
      Logger.error('Failed to refresh notifications', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshNotifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId);
      } catch (error) {
        Logger.error('Failed to mark notification as read', error);
      }
    },
    [markAsRead]
  );

  const handleDelete = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);
      } catch (error) {
        Logger.error('Failed to delete notification', error);
      }
    },
    [deleteNotification]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      await markAllAsRead(user.id);
    } catch (error) {
      Logger.error('Failed to mark all as read', error);
    }
  }, [user?.id, unreadCount, markAllAsRead]);

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-white">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-white px-3 py-1 rounded-full">
              <Text className="text-sm font-bold text-brand-terracotta">{unreadCount} new</Text>
            </View>
          )}
        </View>
        <Text className="text-white/90 text-sm">Stay updated on your skateboarding </Text>
      </View>

      {/* Quick actions */}
      {unreadCount > 0 && (
        <View className="px-4 py-3">
          <Button
            title="Mark all as read"
            size="sm"
            variant="outline"
            onPress={handleMarkAllAsRead}
          />
        </View>
      )}

      {/* Notifications list */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d2673d" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Bell size={48} color="#999" strokeWidth={1} />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">No notifications</Text>
          <Text className="text-sm text-gray-500 text-center px-6">
            When something happens, you'll see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
