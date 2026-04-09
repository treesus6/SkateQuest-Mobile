import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Lock, Unlock } from 'lucide-react-native';
import Card from './ui/Card';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  tier: number;
  xp_reward: number;
  condition_value?: number;
  condition_type?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  onPress?: () => void;
}

const TIER_COLORS = {
  1: { bg: '#FFF3ED', text: '#D2410B', border: '#D2673D' }, // Bronze/Terracotta
  2: { bg: '#F3F0FF', text: '#5B21B6', border: '#6B4CE6' }, // Purple
  3: { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B' }, // Gold/Amber
  4: { bg: '#F0F9FF', text: '#0C4A6E', border: '#0EA5E9' }, // Cyan/Blue
  5: { bg: '#F9F5FF', text: '#6B21A8', border: '#A855F7' }, // Violet/Magenta
};

export default function AchievementCard({ achievement, isUnlocked, onPress }: AchievementCardProps) {
  const tierColor = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS] || TIER_COLORS[1];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        className={`border-2 ${isUnlocked ? 'opacity-100' : 'opacity-60'}`}
        style={{ borderColor: tierColor.border }}
      >
        <View className="flex-row items-center gap-3">
          {/* Icon with tier background */}
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: tierColor.bg }}
          >
            {isUnlocked ? (
              <Unlock size={24} color={tierColor.text} strokeWidth={1.5} />
            ) : (
              <Lock size={24} color={tierColor.text} strokeWidth={1.5} />
            )}
          </View>

          {/* Achievement info */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text
                className="font-bold text-base flex-1"
                style={{ color: isUnlocked ? '#000000' : '#999999' }}
              >
                {achievement.name}
              </Text>
              <Text className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-terracotta/10 text-brand-terracotta">
                Tier {achievement.tier}
              </Text>
            </View>

            <Text
              className="text-xs leading-4 mb-1"
              style={{ color: isUnlocked ? '#666666' : '#999999' }}
            >
              {achievement.description}
            </Text>

            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-semibold text-brand-terracotta">
                +{achievement.xp_reward} XP
              </Text>
              {isUnlocked && (
                <Text className="text-xs text-green-600 font-semibold">Unlocked!</Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
