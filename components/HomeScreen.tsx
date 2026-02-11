import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useChallenges } from '../contexts/ChallengeContext';
import Card from './ui/Card';
import Button from './ui/Button';

export default function HomeScreen({ navigation }: any) {
  const { xp, level, streakDays, dailyChallenges } = useChallenges();

  const xpForNextLevel = 500;
  const progress = Math.min(xp % xpForNextLevel, xpForNextLevel);
  const progressPercent = progress / xpForNextLevel;

  return (
    <View className="flex-1 p-4 bg-gray-900">
      <Text className="text-[32px] font-black text-white mb-1">SkateQuest</Text>
      <Text className="text-xl font-bold text-gray-400 mb-4">Level {level}</Text>

      {/* XP BAR */}
      <View className="w-full h-3.5 bg-gray-800 rounded-lg overflow-hidden mb-1.5">
        <View className="h-full bg-brand-terracotta" style={{ width: `${progressPercent * 100}%` }} />
      </View>
      <Text className="text-gray-400 mb-4">
        {progress} / {xpForNextLevel} XP
      </Text>

      {/* STREAK */}
      <View className="flex-row items-center gap-2 mb-6">
        <Flame color="#FFB84C" size={20} />
        <Text className="text-amber-400 text-base font-semibold">Streak: {streakDays} day(s)</Text>
      </View>

      {/* DAILY CHALLENGES */}
      <Text className="text-xl font-bold text-white mb-3">Today's Challenges</Text>
      {dailyChallenges.map(ch => (
        <TouchableOpacity
          key={ch.id}
          onPress={() => navigation.navigate('ChallengeDetail', { id: ch.id })}
        >
          <Card className="mb-2.5">
            <Text className="text-lg font-bold text-gray-800 dark:text-white">{ch.title}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {ch.xp} XP · {ch.difficulty}
            </Text>
          </Card>
        </TouchableOpacity>
      ))}

      {/* CTA */}
      <View className="mt-6">
        <Button
          title="View All Challenges"
          onPress={() => navigation.navigate('ChallengesTab')}
          variant="primary"
          size="lg"
        />
      </View>
    </View>
  );
}
