import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MessageCircle, Users } from 'lucide-react-native';

interface ConversationItemProps {
  id: string;
  type: 'direct' | 'crew';
  displayName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  onPress: () => void;
}

export default function ConversationItem({
  id: _id,
  type,
  displayName,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  onPress,
}: ConversationItemProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string, length: number = 50) => {
    return text.length > length ? `${text.substring(0, length)}...` : text;
  };

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700"
      accessibilityRole="button"
      accessibilityLabel={`Open conversation with ${displayName}`}
    >
      {/* Avatar placeholder */}
      <View className="w-12 h-12 rounded-full bg-brand-terracotta/20 items-center justify-center flex-shrink-0">
        {type === 'crew' ? (
          <Users size={24} color="#d2673d" strokeWidth={1.5} />
        ) : (
          <MessageCircle size={24} color="#d2673d" strokeWidth={1.5} />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            className="text-base font-semibold text-gray-900 dark:text-white flex-1"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formatTime(lastMessageTime)}
          </Text>
        </View>

        {lastMessage ? (
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1" numberOfLines={1}>
            {truncateText(lastMessage)}
          </Text>
        ) : (
          <Text className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">
            No messages yet
          </Text>
        )}
      </View>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View className="w-6 h-6 rounded-full bg-brand-terracotta items-center justify-center flex-shrink-0">
          <Text className="text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
