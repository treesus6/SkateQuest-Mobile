import React, { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Trophy, Crown, Globe2, ChevronRight, Zap } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { profilesService } from '../lib/profilesService';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
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

  const allLeaders = leaders ?? [];

  const renderLeader = ({ item, index }: { item: UserProfile; index: number }) => {
    const rank = index + 1;
    const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Profile', { userId: item.id })}
        className={`rounded-[18px] border p-4 mb-3 ${rank <= 3 ? 'bg-[#16130E] border-[#4A3B18]' : 'bg-[#10151D] border-[#252D39]'}`}
      >
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-[#0B1017] border border-[#252D39] items-center justify-center">
            {medalColor ? <Trophy color={medalColor} size={20} /> : <Text className="text-[#D2673D] text-sm font-black">#{rank}</Text>}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-[16px] font-black">@{item.username}</Text>
              {rank === 1 ? <Crown size={13} color="#FFD700" fill="#FFD700" /> : null}
            </View>
            <Text className="text-[#7B8493] text-xs mt-1">Level {item.level} · {item.spots_added} spots</Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center gap-1">
              <Zap size={13} color="#4ADE80" />
              <Text className="text-[#4ADE80] text-sm font-black">{item.xp}</Text>
            </View>
            <Text className="text-[#596271] text-[9px] font-black mt-0.5">XP</Text>
          </View>
          <ChevronRight size={18} color="#4D5664" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">WORLD RANKINGS</Text>
        <View className="flex-row items-center gap-2 mt-1">
          <Globe2 size={22} color="#38BDF8" />
          <Text className="text-white text-[30px] font-black">Leaderboard</Text>
        </View>
        <Text className="text-[#7B8493] text-sm mt-1">The skaters leading SkateQuest by XP and progression.</Text>

        {allLeaders.length > 0 ? (
          <View className="bg-[#16130E] border border-[#4A3B18] rounded-[20px] p-4 mt-4 flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-2xl bg-[#241F10] items-center justify-center">
              <Crown size={23} color="#FFD700" fill="#FFD700" />
            </View>
            <View className="flex-1">
              <Text className="text-[#D6B84D] text-[10px] font-black tracking-[1.4px]">CURRENT #1</Text>
              <Text className="text-white text-lg font-black mt-0.5">@{allLeaders[0].username}</Text>
            </View>
            <Text className="text-[#4ADE80] text-base font-black">{allLeaders[0].xp} XP</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={allLeaders}
        renderItem={renderLeader}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <Trophy size={34} color="#596271" />
            <Text className="text-white text-lg font-black mt-4">No rankings yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">The leaderboard will fill as skaters earn real XP.</Text>
          </View>
        }
      />
    </View>
  );
}
