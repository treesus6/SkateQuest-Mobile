import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Bell, Trash2, Check, Inbox, CheckCheck } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { Logger } from '../lib/logger';

interface NotificationItemProps {
  notification: any;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const typeColors: Record<string, string> = {
    challenge: '#F59E0B',
    crew: '#8B5CF6',
    achievement: '#D2673D',
    message: '#38BDF8',
    nearby: '#22C55E',
    seasonal: '#EC4899',
    system: '#7B8493',
  };

  const color = typeColors[notification.type] || '#7B8493';
  const isRead = !!notification.read_at;
  const createdDate = new Date(notification.created_at);
  const diff = Date.now() - createdDate.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const timeStr = minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : hours < 24 ? `${hours}h ago` : days < 7 ? `${days}d ago` : createdDate.toLocaleDateString();

  return (
    <View className={`rounded-[18px] border p-4 mb-3 ${isRead ? 'bg-[#0C1118] border-[#1B222D]' : 'bg-[#10151D] border-[#2A3442]'}`}>
      <View className="flex-row gap-3">
        <View className="w-11 h-11 rounded-2xl items-center justify-center" style={{ backgroundColor: `${color}18`, borderWidth: 1, borderColor: `${color}45` }}>
          <Bell size={19} color={color} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className={`flex-1 text-[15px] font-black ${isRead ? 'text-[#89919D]' : 'text-white'}`}>{notification.title}</Text>
            <Text className="text-[#596271] text-[11px]">{timeStr}</Text>
          </View>
          {notification.body ? <Text className={`text-sm leading-5 mt-1 ${isRead ? 'text-[#646D79]' : 'text-[#AEB5C0]'}`} numberOfLines={3}>{notification.body}</Text> : null}
          <View className="flex-row gap-2 mt-3">
            {!isRead ? (
              <TouchableOpacity onPress={() => onMarkAsRead(notification.id)} className="flex-row items-center gap-1.5 px-3 py-2 bg-[#102334] border border-[#214967] rounded-xl">
                <Check size={13} color="#38BDF8" />
                <Text className="text-[#7DD3FC] text-[11px] font-black">Read</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => onDelete(notification.id)} className="flex-row items-center gap-1.5 px-3 py-2 bg-[#251112] border border-[#532326] rounded-xl">
              <Trash2 size={13} color="#F87171" />
              <Text className="text-[#FCA5A5] text-[11px] font-black">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const { notifications, unreadCount, loading, refreshNotifications, markAsRead, deleteNotification, markAllAsRead } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    refreshNotifications(user.id).catch(error => Logger.error('Failed to refresh notifications', error));
  }, [user?.id, refreshNotifications]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try { await refreshNotifications(user.id); }
    catch (error) { Logger.error('Failed to refresh notifications', error); }
    finally { setRefreshing(false); }
  }, [user?.id, refreshNotifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try { await markAsRead(id); } catch (error) { Logger.error('Failed to mark notification as read', error); }
  }, [markAsRead]);

  const handleDelete = useCallback(async (id: string) => {
    try { await deleteNotification(id); } catch (error) { Logger.error('Failed to delete notification', error); }
  }, [deleteNotification]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?.id || unreadCount === 0) return;
    try { await markAllAsRead(user.id); } catch (error) { Logger.error('Failed to mark all as read', error); }
  }, [user?.id, unreadCount, markAllAsRead]);

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <StatusBar barStyle="light-content" />
      <View className="px-5 pt-4 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">ACTIVITY INBOX</Text>
        <View className="flex-row items-end justify-between gap-3 mt-1">
          <View>
            <Text className="text-white text-[30px] font-black">Notifications</Text>
            <Text className="text-[#7B8493] text-sm mt-1">Challenges, crews, nearby activity and rewards.</Text>
          </View>
          {unreadCount > 0 ? (
            <View className="bg-[#1B1110] border border-[#5B2D22] px-3 py-2 rounded-xl">
              <Text className="text-[#E18A69] text-xs font-black">{unreadCount} new</Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Inbox size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{notifications.length}</Text>
            <Text className="text-[#697383] text-[11px]">total</Text>
          </View>
          <TouchableOpacity
            disabled={unreadCount === 0}
            onPress={handleMarkAllAsRead}
            className={`flex-1 rounded-2xl p-3 border ${unreadCount > 0 ? 'bg-[#102334] border-[#214967]' : 'bg-[#0C1118] border-[#1B222D]'}`}
          >
            <CheckCheck size={16} color={unreadCount > 0 ? '#38BDF8' : '#4B5563'} />
            <Text className={`text-sm font-black mt-2 ${unreadCount > 0 ? 'text-[#7DD3FC]' : 'text-[#596271]'}`}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#D2673D" /></View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
            <Bell size={28} color="#596271" />
          </View>
          <Text className="text-white text-lg font-black mt-4">All quiet</Text>
          <Text className="text-[#697383] text-sm text-center mt-2">When the scene moves around you, it’ll show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => <NotificationItem notification={item} onMarkAsRead={handleMarkAsRead} onDelete={handleDelete} />}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
