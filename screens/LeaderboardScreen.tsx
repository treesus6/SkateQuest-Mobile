import React, { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { profilesService } from '../lib/profilesService';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import Card from '../components/ui/Card';

export default function LeaderboardScreen() {
  const { data: leaders, loading, refetch } = useSupabaseQuery<UserProfile[]>(
    () => profilesService.getLeaderboard(100),
    [],
    { cacheKey: 'leaderboard' }
  );

  useEffect(() => {
    const subscription = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refetch())
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [refetch]);

  const getMedal = (rank: number) => {
    if (rank === 1) return { color: '#FFD700', label: '1st' };
    if (rank === 2) return { color: '#C0C0C0', label: '2nd' };
    if (rank === 3) return { color: '#CD7F32', label: '3rd' };
    return null;
  };

  const renderLeader = ({ item, index }: { item: UserProfile; index: number }) => {
    const rank = index + 1;
    const medal = getMedal(rank);

    return (
      <Card className={`flex-row items-center ${rank <= 3 ? 'border-2 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
        <View className="min-w-[50px]">
          {medal ? (
            <View className="flex-row items-center">
              <Trophy color={medal.color} size={20} />
            </View>
          ) : (
            <Text className="text-xl font-bold text-brand-terracotta">#{rank}</Text>
          )}
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">{item.username}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Level {item.level} · {item.spots_added} spots
          </Text>
        </View>
        <Text className="text-lg font-bold text-brand-green">{item.xp} XP</Text>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-5 rounded-b-2xl">
        <Text className="text-2xl font-bold text-white text-center">Global Leaderboard</Text>
        <Text className="text-sm text-white/90 text-center mt-1">Top Skaters Worldwide</Text>
      </View>
      <FlatList
        data={leaders ?? []}
        renderItem={renderLeader}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">No skaters yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Be the first to earn XP!</Text>
          </View>
        }
      />
    </View>
  );
}
