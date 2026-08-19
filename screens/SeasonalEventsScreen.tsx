import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Calendar, CalendarDays, Flame, Trophy, Layers3 } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSeasonalEventStore } from '../stores/useSeasonalEventStore';
import SeasonalProgressBar from '../components/SeasonalProgressBar';
import { Logger } from '../lib/logger';

export default function SeasonalEventsScreen() {
  const { user } = useAuthStore();
  const { activeEvent, allEvents, userProgress, loading, initialize, refreshUserProgress } = useSeasonalEventStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const cleanup = initialize(user.id);
    return cleanup;
  }, [user?.id, initialize]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try { await refreshUserProgress(user.id); }
    catch (error) { Logger.error('Failed to refresh progress', error); }
    finally { setRefreshing(false); }
  }, [user?.id, refreshUserProgress]);

  const daysRemaining = activeEvent
    ? Math.max(0, Math.ceil((new Date(activeEvent.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading && !activeEvent) {
    return (
      <SafeAreaView className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D2673D" />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-5 pt-4 pb-5">
          <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">SEASON PROGRESSION</Text>
          <Text className="text-white text-[30px] font-black mt-1">Seasonal Events</Text>
          <Text className="text-[#7B8493] text-sm mt-1">Limited-time challenges, tiers and progression across the skate season.</Text>

          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <CalendarDays size={16} color="#D2673D" />
              <Text className="text-white text-xl font-black mt-1">{allEvents.length}</Text>
              <Text className="text-[#697383] text-[11px]">events</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Layers3 size={16} color="#8B5CF6" />
              <Text className="text-white text-xl font-black mt-1">{activeEvent?.tier_count ?? 0}</Text>
              <Text className="text-[#697383] text-[11px]">active tiers</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Flame size={16} color="#F59E0B" />
              <Text className="text-white text-xl font-black mt-1">{activeEvent ? daysRemaining : 0}</Text>
              <Text className="text-[#697383] text-[11px]">days left</Text>
            </View>
          </View>
        </View>

        {activeEvent ? (
          <View className="px-4 mb-5">
            <View className="bg-[#171020] border border-[#3B2850] rounded-[22px] p-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Flame size={17} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-[#FBBF24] text-[10px] font-black tracking-[1.5px]">ACTIVE EVENT</Text>
              </View>
              <Text className="text-white text-2xl font-black">{activeEvent.name}</Text>
              <Text className="text-[#C4B5FD] text-xs font-bold capitalize mt-1">{activeEvent.season} {activeEvent.year}</Text>
              {activeEvent.description ? <Text className="text-[#A7AFBA] text-sm leading-5 mt-3">{activeEvent.description}</Text> : null}

              <View className="bg-[#0E0B13] border border-[#332640] rounded-2xl p-3 mt-4 flex-row items-center gap-3">
                <Calendar size={17} color="#C084FC" />
                <View className="flex-1">
                  <Text className="text-white text-sm font-black">{daysRemaining} days remaining</Text>
                  <Text className="text-[#7B6F86] text-xs mt-0.5">Ends {new Date(activeEvent.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
              </View>
            </View>

            <View className="mt-4">
              {userProgress ? (
                <SeasonalProgressBar currentTier={userProgress.current_tier} maxTier={activeEvent.tier_count} progressValue={userProgress.progress_value} />
              ) : (
                <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 items-center">
                  <Trophy size={22} color="#596271" />
                  <Text className="text-white text-sm font-black mt-2">Your season starts when you participate</Text>
                  <Text className="text-[#697383] text-xs text-center mt-1">Complete challenges, visit spots, and earn verified progress.</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View className="mx-4 mb-5 bg-[#10151D] border border-[#252D39] rounded-[22px] p-7 items-center">
            <CalendarDays size={34} color="#596271" />
            <Text className="text-white text-lg font-black mt-3">No active season</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">The next limited-time event will appear here when it goes live.</Text>
          </View>
        )}

        {allEvents.length > 0 ? (
          <View className="px-4">
            <Text className="text-white text-lg font-black mb-3">Season Archive</Text>
            {allEvents.map(event => {
              const isActive = activeEvent?.id === event.id;
              return (
                <View key={event.id} className={`rounded-[18px] border p-4 mb-3 ${isActive ? 'bg-[#1B1110] border-[#5B2D22]' : 'bg-[#10151D] border-[#252D39]'}`}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-white text-[16px] font-black">{event.name}</Text>
                      <Text className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isActive ? 'text-[#E18A69]' : 'text-[#7B8493]'}`}>
                        {event.season} {event.year}{isActive ? ' · ACTIVE' : ''}
                      </Text>
                    </View>
                    <View className="bg-[#0B1017] border border-[#252D39] rounded-full px-2.5 py-1">
                      <Text className="text-[#AEB5C0] text-[10px] font-black">{event.tier_count} TIERS</Text>
                    </View>
                  </View>
                  {event.description ? <Text className="text-[#9AA3AF] text-sm leading-5 mt-3">{event.description}</Text> : null}
                  <Text className="text-[#596271] text-xs mt-3">
                    {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
