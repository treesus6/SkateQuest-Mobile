import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { User, MessageCircle } from 'lucide-react-native';
import Card from './ui/Card';

interface MentorshipCardProps {
  mentorName: string;
  menteeName: string;
  isMentor: boolean;
  status: 'active' | 'paused' | 'completed' | 'declined';
  startedAt: string;
  progressNotes?: string;
  onMessage?: () => void;
  onViewProfile?: () => void;
}

export default function MentorshipCard({
  mentorName,
  menteeName,
  isMentor,
  status,
  startedAt,
  progressNotes,
  onMessage,
  onViewProfile,
}: MentorshipCardProps) {
  const getStatusColor = (stat: string) => {
    switch (stat) {
      case 'active':
        return '#22C55E';
      case 'paused':
        return '#F59E0B';
      case 'completed':
        return '#0EA5E9';
      case 'declined':
        return '#EF4444';
      default:
        return '#999';
    }
  };

  const getDaysActive = (dateStr: string) => {
    const startDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Card>
      <View className="gap-3">
        {/* Header with relationship type */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-brand-terracotta/20 items-center justify-center">
              <User size={18} color="#d2673d" strokeWidth={2} />
            </View>
            <View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {isMentor ? 'Mentoring' : 'Learning from'}
              </Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {isMentor ? menteeName : mentorName}
              </Text>
            </View>
          </View>
          <View
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: `${getStatusColor(status)}20` }}
          >
            <Text
              className="text-xs font-bold capitalize"
              style={{ color: getStatusColor(status) }}
            >
              {status}
            </Text>
          </View>
        </View>

        {/* Duration and progress */}
        <View className="flex-row gap-2">
          <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-2 rounded-lg">
            <Text className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
              Active for
            </Text>
            <Text className="text-base font-bold text-blue-700 dark:text-blue-300">
              {getDaysActive(startedAt)}d
            </Text>
          </View>

          <View className="flex-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-2 rounded-lg">
            <Text className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">
              Level
            </Text>
            <Text className="text-base font-bold text-purple-700 dark:text-purple-300">
              {isMentor ? 'Mentor' : 'Mentee'}
            </Text>
          </View>
        </View>

        {/* Progress notes preview */}
        {progressNotes && (
          <View className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <Text className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
              Latest Note
            </Text>
            <Text className="text-sm text-gray-900 dark:text-gray-100" numberOfLines={2}>
              {progressNotes}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-2">
          {onMessage && (
            <Pressable
              onPress={onMessage}
              className="flex-1 flex-row items-center justify-center gap-2 bg-brand-terracotta/10 px-3 py-2 rounded-lg"
              hitSlop={8}
            >
              <MessageCircle size={16} color="#d2673d" strokeWidth={2} />
              <Text className="text-sm font-semibold text-brand-terracotta">Message</Text>
            </Pressable>
          )}
          {onViewProfile && (
            <Pressable
              onPress={onViewProfile}
              className="flex-1 flex-row items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-lg"
              hitSlop={8}
            >
              <User size={16} color="#666" strokeWidth={2} />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Profile
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Card>
  );
}
