import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { UserProfile } from '../types';
import { getLeaderboard } from '../services/leaderboard';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeSubscription([
    {
      channel: 'leaderboard-changes',
      table: 'profiles',
      onPayload: () => loadLeaderboard(),
    },
  ]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaders(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeader = ({ item, index }: { item: UserProfile; index: number }) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    return (
      <View
        className={`flex-row items-center bg-white rounded-xl p-[15px] mb-[10px] shadow-sm ${rank <= 3 ? 'border-2 border-[#FFD700] bg-[#FFFEF0]' : ''}`}
      >
        <Text className="text-[20px] font-bold text-brand-orange min-w-[50px]">
          {medal || `#${rank}`}
        </Text>
        <View className="flex-1 ml-[10px]">
          <Text className="text-lg font-bold text-[#333]">{item.username}</Text>
          <Text className="text-[13px] text-[#666] mt-[3px]">
            Level {item.level} • {item.spots_added} spots
          </Text>
        </View>
        <Text className="text-lg font-bold text-[#4CAF50]">{item.xp} XP</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="bg-brand-orange p-5 pt-[15px] pb-[25px] rounded-bl-[20px] rounded-br-[20px] shadow-md">
        <Text className="text-[28px] font-bold text-white text-center">🏆 Global Leaderboard</Text>
        <Text className="text-sm text-white opacity-90 text-center mt-[5px]">
          Top Skaters Worldwide
        </Text>
      </View>
      <FlatList
        data={leaders}
        renderItem={renderLeader}
        keyExtractor={(item: UserProfile) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaderboard} />}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No skaters yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Be the first to earn XP!</Text>
          </View>
        }
      />
    </View>
  );
}
