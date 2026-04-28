import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MessageCircle, Users } from 'lucide-react-native';

interface Props {
  id: string; type: 'direct' | 'crew'; displayName: string;
  lastMessageTime?: string; onPress: () => void;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ConversationItem({ type, displayName, lastMessageTime, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      <View className="w-12 h-12 rounded-full bg-brand-terracotta/20 items-center justify-center mr-3">
        {type === 'crew' ? <Users color="#d2673d" size={22} /> : <MessageCircle color="#d2673d" size={22} />}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-800 dark:text-gray-100">{displayName}</Text>
        <Text className="text-xs text-gray-400 capitalize mt-0.5">{type === 'crew' ? 'Crew Chat' : 'Direct Message'}</Text>
      </View>
      {lastMessageTime && (
        <Text className="text-xs text-gray-400">{timeAgo(lastMessageTime)}</Text>
      )}
    </TouchableOpacity>
  );
}
