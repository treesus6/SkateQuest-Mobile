import React from 'react';
import { View, Text } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';

interface Props {
  content: string; isSender: boolean; timestamp: string; isRead?: boolean;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MessageBubble({ content, isSender, timestamp, isRead }: Props) {
  return (
    <View className={`flex-row mb-3 ${isSender ? 'justify-end' : 'justify-start'}`}>
      <View className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${isSender ? 'bg-brand-terracotta rounded-br-sm' : 'bg-gray-100 dark:bg-gray-700 rounded-bl-sm'}`}>
        <Text className={`text-sm leading-5 ${isSender ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
          {content}
        </Text>
        <View className="flex-row items-center justify-end gap-1 mt-1">
          <Text className={`text-xs ${isSender ? 'text-white/70' : 'text-gray-400'}`}>
            {formatTime(timestamp)}
          </Text>
          {isSender && (
            isRead
              ? <CheckCheck size={12} color="rgba(255,255,255,0.7)" />
              : <Check size={12} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      </View>
    </View>
  );
}
