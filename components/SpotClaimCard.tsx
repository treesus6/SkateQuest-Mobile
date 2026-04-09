import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Trophy, Clock, Flame, Shield } from 'lucide-react-native';
import Card from './ui/Card';

interface SpotClaimCardProps {
  holderName: string;
  claimStrength: number;
  daysHeld: number;
  proTier?: string;
  onChallenge: () => void;
  isChallenging?: boolean;
}

export default function SpotClaimCard({
  holderName,
  claimStrength,
  daysHeld,
  proTier,
  onChallenge,
  isChallenging = false,
}: SpotClaimCardProps) {
  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'gold':
        return '#F59E0B';
      case 'platinum':
        return '#0EA5E9';
      case 'silver':
        return '#8B5CF6';
      default:
        return '#d2673d';
    }
  };

  return (
    <Card>
      <View className="gap-3">
        {/* Header with trophy */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-10 h-10 rounded-full bg-brand-terracotta/20 items-center justify-center">
              <Trophy size={20} color="#d2673d" strokeWidth={2} fill="#d2673d" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-lg text-gray-900 dark:text-white">
                King of the Hill
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Spot Claim</Text>
            </View>
          </View>
        </View>

        {/* Holder info */}
        <View className="bg-brand-terracotta/10 px-3 py-3 rounded-lg gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-300">Current Holder</Text>
            {proTier && (
              <View
                className="px-2 py-1 rounded-full flex-row items-center gap-1"
                style={{ backgroundColor: `${getTierColor(proTier)}20` }}
              >
                <Shield size={12} color={getTierColor(proTier)} strokeWidth={2} />
                <Text
                  className="text-xs font-bold capitalize"
                  style={{ color: getTierColor(proTier) }}
                >
                  {proTier}
                </Text>
              </View>
            )}
          </View>
          <Text className="font-semibold text-base text-gray-900 dark:text-white">
            {holderName}
          </Text>
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3">
          {/* Claim Strength */}
          <View className="flex-1 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
            <View className="flex-row items-center gap-1 mb-1">
              <Flame size={14} color="#F59E0B" strokeWidth={1.5} fill="#F59E0B" />
              <Text className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                Claim Strength
              </Text>
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {claimStrength}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {claimStrength === 1
                ? 'First claim'
                : `${claimStrength - 1} challenge${claimStrength - 1 !== 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Days Held */}
          <View className="flex-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
            <View className="flex-row items-center gap-1 mb-1">
              <Clock size={14} color="#0EA5E9" strokeWidth={1.5} />
              <Text className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                Held for
              </Text>
            </View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white">{daysHeld}d</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {daysHeld === 0 ? 'Just claimed' : 'days in a row'}
            </Text>
          </View>
        </View>

        {/* Challenge button */}
        <Pressable
          onPress={onChallenge}
          disabled={isChallenging}
          className={`px-4 py-3 rounded-lg items-center ${
            isChallenging
              ? 'bg-gray-300 dark:bg-gray-600'
              : 'bg-brand-terracotta active:bg-brand-terracotta/80'
          }`}
        >
          <Text className="font-semibold text-white text-base">
            {isChallenging ? 'Challenging...' : 'Challenge for Claim'}
          </Text>
        </Pressable>

        {/* Info text */}
        <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Successfully challenge to claim the spot! You'll receive 100 XP for a successful
          challenge.
        </Text>
      </View>
    </Card>
  );
}
