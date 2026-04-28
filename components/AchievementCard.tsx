import React from 'react';
import { View, Text } from 'react-native';
import { Lock, Trophy } from 'lucide-react-native';
import Card from './ui/Card';

interface Achievement { id: string; name: string; description: string; tier: number; xp_reward: number; }
interface Props { achievement: Achievement; isUnlocked: boolean; }

const TIER_COLORS: Record<number, string> = { 1: '#D2673D', 2: '#6B4CE6', 3: '#F59E0B', 4: '#0EA5E9', 5: '#A855F7' };

export default function AchievementCard({ achievement, isUnlocked }: Props) {
  const color = TIER_COLORS[achievement.tier] || '#999';
  return (
    <Card className={`flex-row items-center ${!isUnlocked ? 'opacity-50' : ''}`}>
      <View className="w-12 h-12 rounded-full items-center justify-center mr-3" style={{ backgroundColor: color + '20' }}>
        {isUnlocked ? <Trophy size={24} color={color} /> : <Lock size={20} color="#999" />}
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-800 dark:text-gray-100">{achievement.name}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{achievement.description}</Text>
      </View>
      {isUnlocked && (
        <View className="bg-brand-green px-2 py-1 rounded-full">
          <Text className="text-white text-xs font-bold">+{achievement.xp_reward} XP</Text>
        </View>
      )}
    </Card>
  );
}
