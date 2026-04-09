import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import Card from './ui/Card';

interface ReferralCodeCardProps {
  code: string;
  description?: string;
  activationBonusXp: number;
  recruiterBonusXp: number;
  active: boolean;
  onCopy: (code: string) => void;
}

export default function ReferralCodeCard({
  code,
  description,
  activationBonusXp,
  recruiterBonusXp,
  active,
  onCopy,
}: ReferralCodeCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={!active ? 'opacity-60' : ''}>
      <View className="gap-3">
        {/* Code display */}
        <View className="bg-brand-terracotta/10 px-4 py-3 rounded-lg">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referral Code</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-brand-terracotta tracking-widest">
              {code}
            </Text>
            <Pressable
              onPress={handleCopy}
              className="p-2 bg-brand-terracotta/20 rounded-full"
              hitSlop={8}
            >
              {copied ? (
                <Check size={20} color="#22C55E" strokeWidth={2} fill="#22C55E" />
              ) : (
                <Copy size={20} color="#d2673d" strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Description */}
        {description && (
          <Text className="text-sm text-gray-600 dark:text-gray-300">{description}</Text>
        )}

        {/* Bonus rewards */}
        <View className="flex-row gap-3">
          {/* New user bonus */}
          <View className="flex-1 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
            <Text className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">
              New User Bonus
            </Text>
            <Text className="text-lg font-bold text-green-700 dark:text-green-300">
              +{activationBonusXp} XP
            </Text>
          </View>

          {/* Recruiter bonus */}
          <View className="flex-1 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
            <Text className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">
              Your Reward
            </Text>
            <Text className="text-lg font-bold text-orange-700 dark:text-orange-300">
              +{recruiterBonusXp} XP
            </Text>
          </View>
        </View>

        {/* Status */}
        <View
          className={`px-3 py-2 rounded-lg items-center ${
            active
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              active
                ? 'text-green-700 dark:text-green-300'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {active ? '✅ Active' : '❌ Inactive'}
          </Text>
        </View>
      </View>
    </Card>
  );
}
