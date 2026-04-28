import React from 'react';
import { View, Text } from 'react-native';
import { Trophy } from 'lucide-react-native';

interface Props { currentTier: number; maxTier: number; progressValue: number; }

const TIER_NAMES = ['Not Started', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Ultimate'];
const TIER_COLORS = ['#9CA3AF', '#CD7F32', '#C0C0C0', '#FFD700', '#0EA5E9', '#A855F7'];

export default function SeasonalProgressBar({ currentTier, maxTier, progressValue }: Props) {
  const pct = Math.min((currentTier / maxTier) * 100, 100);
  const color = TIER_COLORS[Math.min(currentTier, 5)];
  const name = TIER_NAMES[Math.min(currentTier, 5)];

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Trophy size={18} color={color} />
          <Text className="font-bold text-base text-gray-800 dark:text-gray-100">{name} Tier</Text>
        </View>
        <Text className="text-sm font-semibold" style={{ color }}>
          {currentTier} / {maxTier}
        </Text>
      </View>
      <View className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </View>
      <Text className="text-xs text-gray-400 text-center">
        {progressValue.toLocaleString()} progress points this season
      </Text>
    </View>
  );
}
