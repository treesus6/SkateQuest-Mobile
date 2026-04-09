import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotificationStore } from '../stores/useNotificationStore';

interface NotificationBellProps {
  onPress?: () => void;
}

export default function NotificationBell({ onPress }: NotificationBellProps) {
  const { unreadCount } = useNotificationStore();

  return (
    <TouchableOpacity onPress={onPress} className="relative p-2">
      <Bell size={24} color="#d2673d" strokeWidth={1.5} />
      {unreadCount > 0 && (
        <View className="absolute top-0 right-0 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
          <Text className="text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
