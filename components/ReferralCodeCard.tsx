import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Copy, Zap } from 'lucide-react-native';
import Card from './ui/Card';

interface Props {
  code: string; description?: string;
  activationBonusXp: number; recruiterBonusXp: number;
  active: boolean; onCopy: (code: string) => void;
}

export default function ReferralCodeCard({ code, description, activationBonusXp, recruiterBonusXp, active, onCopy }: Props) {
  return (
    <Card className={!active ? 'opacity-50' : ''}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="bg-brand-terracotta/10 px-3 py-1.5 rounded-lg">
            <Text className="text-brand-terracotta font-black text-lg tracking-widest">{code}</Text>
          </View>
          {!active && (
            <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              <Text className="text-xs text-gray-500 font-semibold">Inactive</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => onCopy(code)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Copy size={16} color="#d2673d" />
        </TouchableOpacity>
      </View>

      {description ? <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{description}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-2 items-center">
          <View className="flex-row items-center gap-1">
            <Zap size={12} color="#4CAF50" />
            <Text className="text-xs font-bold text-green-600">+{activationBonusXp} XP</Text>
          </View>
          <Text className="text-xs text-gray-400 mt-0.5">New user gets</Text>
        </View>
        <View className="flex-1 bg-brand-terracotta/10 rounded-lg p-2 items-center">
          <View className="flex-row items-center gap-1">
            <Zap size={12} color="#d2673d" />
            <Text className="text-xs font-bold text-brand-terracotta">+{recruiterBonusXp} XP</Text>
          </View>
          <Text className="text-xs text-gray-400 mt-0.5">You get</Text>
        </View>
      </View>
    </Card>
  );
}
