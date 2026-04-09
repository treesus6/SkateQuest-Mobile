import React from 'react';
import { View, Text } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';

interface MessageBubbleProps {
  content: string;
  isSender: boolean;
  timestamp: string;
  isRead?: boolean;
  senderName?: string;
}

export default function MessageBubble({
  content,
  isSender,
  timestamp,
  isRead = false,
  senderName,
}: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View
      className={`flex-row mb-2 ${isSender ? 'justify-end' : 'justify-start'}`}
      accessibilityLabel={`Message from ${senderName || 'user'}`}
    >
      <View
        className={`max-w-xs px-3 py-2 rounded-2xl ${
          isSender
            ? 'bg-brand-terracotta rounded-br-none'
            : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'
        }`}
      >
        {!isSender && senderName && (
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
            {senderName}
          </Text>
        )}

        <Text className={`text-base ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {content}
        </Text>

        <View className="flex-row items-center justify-between gap-1 mt-1">
          <Text
            className={`text-xs ${
              isSender ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {formatTime(timestamp)}
          </Text>

          {isSender && (
            <View className="ml-1">
              {isRead ? (
                <CheckCheck size={12} color="white" strokeWidth={2.5} />
              ) : (
                <Check size={12} color="white" strokeWidth={2.5} />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
