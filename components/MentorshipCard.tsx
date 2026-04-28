import React from 'react';
import { View, Text } from 'react-native';
import { UserCheck, Users, CheckCircle, Clock } from 'lucide-react-native';
import Card from './ui/Card';

interface Props {
  mentorName: string; menteeName: string; isMentor: boolean;
  status: string; startedAt?: string; progressNotes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50', paused: '#FF9800', completed: '#2196F3', declined: '#9CA3AF',
};

export default function MentorshipCard({ mentorName, menteeName, isMentor, status, startedAt, progressNotes }: Props) {
  const color = STATUS_COLORS[status] || '#9CA3AF';
  return (
    <Card>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          {isMentor ? <UserCheck color="#d2673d" size={20} /> : <Users color="#6B4CE6" size={20} />}
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
              {isMentor ? `Teaching ${menteeName}` : `Learning from ${mentorName}`}
            </Text>
            {startedAt && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Clock size={10} color="#9CA3AF" />
                <Text className="text-xs text-gray-400">
                  Since {new Date(startedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: color + '20' }}>
          <Text className="text-xs font-bold capitalize" style={{ color }}>{status}</Text>
        </View>
      </View>
      {progressNotes && (
        <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2.5 mt-1">
          <View className="flex-row items-center gap-1 mb-1">
            <CheckCircle size={12} color="#4CAF50" />
            <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">Progress</Text>
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{progressNotes}</Text>
        </View>
      )}
    </Card>
  );
}
