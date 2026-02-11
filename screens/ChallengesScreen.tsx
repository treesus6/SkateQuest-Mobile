import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Challenge } from '../types';
import * as challengeService from '../services/challenges';

export default function ChallengesScreen() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const data = await challengeService.getActiveChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeChallenge = async (challenge: Challenge) => {
    if (!user) return;

    Alert.alert(
      'Complete Challenge',
      `Complete "${challenge.title || challenge.trick}"?\nYou'll earn ${challenge.xp_reward} XP!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await challengeService.completeChallenge(challenge.id, user.id, challenge.xp_reward);
              Alert.alert('Success', `You earned ${challenge.xp_reward} XP!`);
              loadChallenges();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderChallenge = ({ item }: { item: Challenge }) => (
    <View className="bg-white rounded-lg p-[15px] mb-[15px] shadow-sm">
      <Text className="text-lg font-bold text-[#333] mb-[5px]">{item.title || item.trick}</Text>
      {item.description && (
        <Text className="text-sm text-[#666] mb-[10px]">{item.description}</Text>
      )}
      <View className="flex-row justify-between items-center mt-[10px]">
        <Text className="text-base font-bold text-brand-orange">+{item.xp_reward} XP</Text>
        <TouchableOpacity
          className="bg-[#4CAF50] px-[20px] py-2 rounded-[6px]"
          onPress={() => completeChallenge(item)}
        >
          <Text className="text-white text-sm font-bold">Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <Text className="text-2xl font-bold text-[#333] p-[15px] bg-white border-b border-[#ddd]">
        Pending Challenges
      </Text>
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={(item: Challenge) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshing={loading}
        onRefresh={loadChallenges}
        ListEmptyComponent={
          <View className="items-center mt-[50px]">
            <Text className="text-base text-[#999]">No challenges available</Text>
          </View>
        }
      />
    </View>
  );
}
