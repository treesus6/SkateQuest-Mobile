import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Calendar, CheckCircle2, Flame, ShieldCheck, Trophy } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface VerifiedStreak {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  active_dates: string[];
  logged_today: boolean;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StreaksScreen() {
  const user = useAuthStore(state => state.user);
  const [streak, setStreak] = useState<VerifiedStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_verified_activity_streak');
      if (error) throw error;
      const result = (data ?? {}) as Partial<VerifiedStreak>;
      setStreak({
        current_streak: Number(result.current_streak ?? 0),
        longest_streak: Number(result.longest_streak ?? 0),
        last_active_date: result.last_active_date ?? null,
        active_dates: Array.isArray(result.active_dates) ? result.active_dates : [],
        logged_today: Boolean(result.logged_today),
      });
    } catch (error) {
      console.error('Failed to load verified activity streak:', error);
      setStreak(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeSet = useMemo(() => new Set(streak?.active_dates ?? []), [streak?.active_dates]);
  const calendarDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index - 6);
        const key = localDateKey(date);
        return {
          key,
          label: date.toLocaleDateString('en-US', { weekday: 'short' }),
          day: date.getDate(),
          active: activeSet.has(key),
          today: index === 6,
        };
      }),
    [activeSet]
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="text-gray-500 mt-3">Checking verified skate activity…</Text>
      </View>
    );
  }

  if (!streak) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
        <ShieldCheck size={42} color="#FF6B35" />
        <Text className="text-white text-xl font-extrabold mt-4">Streak data unavailable</Text>
        <Text className="text-gray-500 text-sm text-center mt-2">
          SkateQuest could not verify your activity history right now. Pull down later to retry.
        </Text>
      </View>
    );
  }

  const active = streak.current_streak > 0;

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#FF6B35"
          onRefresh={() => {
            setRefreshing(true);
            void fetchData();
          }}
        />
      }
    >
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-extrabold text-white">Verified Streak</Text>
        <Text className="text-[#777] text-sm mt-1">
          No check-in button here. Your streak moves only when SkateQuest records real server-verified activity.
        </Text>
      </View>

      <View className="mx-5 bg-[#171717] rounded-3xl p-8 items-center mb-4 border border-[#252525]">
        <View className="w-16 h-16 rounded-full bg-[#FF6B35]/15 items-center justify-center">
          <Flame
            size={40}
            color={active ? '#FF6B35' : '#555'}
            fill={active ? '#FF6B35' : '#333'}
          />
        </View>
        <Text
          className="font-extrabold mt-2"
          style={{ fontSize: 72, color: active ? '#FF6B35' : '#555', lineHeight: 80 }}
        >
          {streak.current_streak}
        </Text>
        <Text className="text-white text-xl font-extrabold tracking-widest">
          {streak.current_streak === 1 ? 'VERIFIED DAY' : 'VERIFIED DAYS'}
        </Text>
        <View className="flex-row items-center gap-2 mt-3">
          <ShieldCheck size={16} color="#4ADE80" />
          <Text className="text-green-400 text-xs font-bold">SERVER VERIFIED</Text>
        </View>
      </View>

      <View className="mx-5 bg-[#171717] rounded-2xl p-4 mb-4 border border-[#252525]">
        <View className="flex-row items-center mb-4">
          <Calendar size={17} color="#FF6B35" />
          <Text className="text-white font-bold ml-2">Last 7 Days</Text>
        </View>
        <View className="flex-row justify-between">
          {calendarDays.map(day => (
            <View key={day.key} className="items-center">
              <Text className="text-[#777] text-xs mb-2">{day.label}</Text>
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  day.active
                    ? 'bg-[#FF6B35]'
                    : day.today
                      ? 'border-2 border-[#FF6B35] bg-transparent'
                      : 'bg-[#242424]'
                }`}
              >
                {day.active ? (
                  <CheckCircle2 size={18} color="#fff" />
                ) : (
                  <Text className="text-[#777] text-xs font-bold">{day.day}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className="mx-5 bg-[#171717] rounded-2xl p-4 mb-4 border border-[#252525]">
        <Text className="text-white font-extrabold text-base">What counts</Text>
        <Text className="text-[#8A8A8A] text-sm leading-5 mt-2">
          Verified check-in rewards, completed server-timed skate sessions, and proof that passes the Judge’s Booth count toward the streak. Simply opening this screen does not.
        </Text>
      </View>

      <View className="mx-5 bg-[#171717] rounded-2xl p-4 flex-row items-center border border-[#252525]">
        <View className="bg-[#FFD700]/15 rounded-full w-12 h-12 items-center justify-center mr-4">
          <Trophy size={24} color="#FFD700" fill="#FFD700" />
        </View>
        <View className="flex-1">
          <Text className="text-[#777] text-xs">Verified Personal Best</Text>
          <Text className="text-white font-extrabold text-2xl">{streak.longest_streak} days</Text>
          <Text className="text-[#777] text-xs mt-1">
            {streak.logged_today
              ? 'Verified activity recorded today.'
              : streak.last_active_date
                ? `Last verified activity: ${new Date(`${streak.last_active_date}T00:00:00`).toLocaleDateString()}`
                : 'Complete a verified skate activity to start.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
