import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useChallenges } from '../contexts/ChallengeContext';
import Button from '../components/ui/Button';

export default function DailyQuestsScreen({ navigation }: any) {
  const { dailyChallenges, resetDailyChallenges } = useChallenges();

  return (
    <View className="flex-1 p-4 bg-[#05070B]">
      <Text className="text-3xl font-extrabold text-gray-100 mb-1">Daily Quests</Text>
      <Text className="text-base text-gray-400 mb-4">Fresh missions to keep you rolling every session.</Text>

      {dailyChallenges.map(ch => (
        <TouchableOpacity
          key={ch.id}
          className="bg-[#121826] rounded-lg p-3 mb-2.5"
          onPress={() => navigation.navigate('ChallengeDetail', { id: ch.id })}
        >
          <Text className="text-lg font-bold text-gray-100">{ch.title}</Text>
          <Text className="text-sm text-gray-400">
            {ch.xp} XP · {ch.difficulty} {ch.completed ? '· Completed' : ''}
          </Text>
        </TouchableOpacity>
      ))}

      <View className="mt-5">
        <Button title="Reroll daily quests" onPress={resetDailyChallenges} variant="primary" size="lg" className="bg-[#FF5A3C]" />
      </View>
    </View>
  );
}
