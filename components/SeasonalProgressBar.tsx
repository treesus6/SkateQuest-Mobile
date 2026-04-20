import React from 'react';
import { View, Text } from 'react-native';
import { Lock, Unlock } from 'lucide-react-native';
import Card from './ui/Card';

interface SeasonalProgressBarProps {
  currentTier: number;
  maxTier?: number;
  progressValue?: number;
  tierName?: string;
  compact?: boolean;
}

const TIER_COLORS = {
  0: { bg: '#F3F4F6', text: '#6B7280', icon: '#9CA3AF' }, // Gray - Not started
  1: { bg: '#FFF3ED', text: '#D2673D', icon: '#d2673d' }, // Bronze - Terracotta
  2: { bg: '#F3F0FF', text: '#6B4CE6', icon: '#6B4CE6' }, // Silver - Purple
  3: { bg: '#FFFBEB', text: '#F59E0B', icon: '#F59E0B' }, // Gold - Amber
  4: { bg: '#F0F9FF', text: '#0EA5E9', icon: '#0EA5E9' }, // Platinum - Cyan
  5: { bg: '#F9F5FF', text: '#A855F7', icon: '#A855F7' }, // Ultimate - Violet
};

const TIER_NAMES = ['Not Started', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Ultimate'];

export default function SeasonalProgressBar({
  currentTier = 0,
  maxTier = 5,
  progressValue: _progressValue = 0,
  tierName,
  compact = false,
}: SeasonalProgressBarProps) {
  const color = TIER_COLORS[currentTier as keyof typeof TIER_COLORS] || TIER_COLORS[0];
  const displayTierName = tierName || TIER_NAMES[currentTier] || 'Unknown';
  const progressPercent = (currentTier / maxTier) * 100;

  if (compact) {
    // Compact horizontal bar (for HomeScreen preview)
    return (
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-sm text-gray-900 dark:text-white">
            Seasonal Progress
          </Text>
          <Text
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {currentTier}/{maxTier}
          </Text>
        </View>
        <View className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <View
            className="h-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: color.icon,
            }}
          />
        </View>
      </View>
    );
  }

  // Full card view
  return (
    <Card>
      <View className="gap-4">
        {/* Header with tier info */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: color.bg }}
            >
              {currentTier === 0 ? (
                <Lock size={20} color={color.icon} strokeWidth={2} />
              ) : (
                <Unlock size={20} color={color.icon} fill={color.icon} strokeWidth={1.5} />
              )}
            </View>
            <View>
              <Text className="font-bold text-base text-gray-900 dark:text-white">
                {displayTierName}
              </Text>
              <Text className="text-xs text-gray-500">
                Tier {currentTier} of {maxTier}
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-black" style={{ color: color.text }}>
            {progressPercent.toFixed(0)}%
          </Text>
        </View>

        {/* Progress bar */}
        <View className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <View
            className="h-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: color.icon,
            }}
          />
        </View>

        {/* Tier progression indicator */}
        <View className="flex-row justify-between">
          {Array.from({ length: maxTier }).map((_, idx) => {
            const tierNum = idx + 1;
            const tierColor = TIER_COLORS[tierNum as keyof typeof TIER_COLORS];
            const isUnlocked = currentTier >= tierNum;

            return (
              <View
                key={tierNum}
                className={`w-1/5 h-8 rounded-lg items-center justify-center ${isUnlocked ? 'opacity-100' : 'opacity-40'}`}
                style={{ backgroundColor: tierColor.bg }}
              >
                <Text className="text-xs font-bold" style={{ color: tierColor.text }}>
                  {tierNum}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}
