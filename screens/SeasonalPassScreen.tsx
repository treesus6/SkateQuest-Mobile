import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarDays, CheckCircle, Gift, Star, Zap } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface SeasonalRewards {
  xp_multiplier?: number;
}

interface SeasonalEvent {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  rewards: SeasonalRewards | null;
}

interface SeasonalClaim {
  id: string;
  claim_date: string;
  day_number: number;
  xp_awarded: number;
  created_at: string;
}

function dayNumber(startDate: string): number {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(startDate).getTime()) / 86_400_000) + 1
  );
}

function totalDays(startDate: string, endDate: string): number {
  return Math.max(
    1,
    Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
    )
  );
}

function daysRemaining(endDate: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000)
  );
}

function utcDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SeasonalPassScreen() {
  const [event, setEvent] = useState<SeasonalEvent | null>(null);
  const [claims, setClaims] = useState<SeasonalClaim[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const nextUserId = authData.session?.user?.id ?? null;
      setUserId(nextUserId);

      const now = new Date().toISOString();
      const { data: eventData, error: eventError } = await supabase
        .from('seasonal_events')
        .select('id,name,description,start_date,end_date,rewards')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventError) throw eventError;

      const activeEvent = (eventData as SeasonalEvent | null) ?? null;
      setEvent(activeEvent);

      if (!nextUserId || !activeEvent) {
        setClaims([]);
        return;
      }

      const { data: claimRows, error: claimError } = await supabase
        .from('seasonal_reward_claims')
        .select('id,claim_date,day_number,xp_awarded,created_at')
        .eq('user_id', nextUserId)
        .eq('event_id', activeEvent.id)
        .order('claim_date', { ascending: false });

      if (claimError) throw claimError;
      setClaims((claimRows as SeasonalClaim[] | null) ?? []);
    } catch (error) {
      console.error('Seasonal pass load failed:', error);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'The seasonal pass could not be loaded.'
      );
      setEvent(null);
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const claimedToday = useMemo(
    () => claims.some((claim) => claim.claim_date === utcDateKey()),
    [claims]
  );

  const currentDay = event ? dayNumber(event.start_date) : 1;
  const seasonDays = event ? totalDays(event.start_date, event.end_date) : 1;
  const calendarProgress = Math.min(100, (currentDay / seasonDays) * 100);
  const multiplier = Math.max(0, Number(event?.rewards?.xp_multiplier ?? 1));
  const expectedXp = event ? Math.round(currentDay * 25 * multiplier) : 0;

  const claimReward = async () => {
    if (!event || !userId || claiming) return;

    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_seasonal_reward', {
        p_event_id: event.id,
      });
      if (error) throw error;

      const result = data as
        | { claimed?: boolean; day_number?: number; xp_awarded?: number; error?: string }
        | null;

      if (result?.error) throw new Error(result.error);

      if (!result?.claimed) {
        Alert.alert(
          'Already claimed',
          'Your season reward for today has already been recorded.'
        );
        await load();
        return;
      }

      Alert.alert(
        'Season reward claimed',
        `Day ${result.day_number ?? currentDay} · +${result.xp_awarded ?? expectedXp} XP`
      );
      await load();
    } catch (error) {
      Alert.alert(
        'Reward not claimed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="text-neutral-400 mt-3">Loading season…</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <ScrollView
        className="flex-1 bg-[#0a0a0a]"
        contentContainerClassName="flex-grow items-center justify-center px-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        <CalendarDays size={44} color="#555" />
        <Text className="text-white text-xl font-black text-center mt-4">
          No active season
        </Text>
        <Text className="text-neutral-500 text-sm text-center mt-2 leading-5">
          A season appears here only when a real SkateQuest seasonal event is published and active.
        </Text>
        {loadError ? (
          <Text className="text-red-400 text-xs text-center mt-4">{loadError}</Text>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerClassName="pb-12"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6B35"
        />
      }
    >
      <View className="px-5 pt-10 pb-6 bg-[#1a1a1a]">
        <View className="flex-row items-center mb-1">
          <Star size={20} color="#FFD700" fill="#FFD700" />
          <Text className="text-[#FFD700] font-extrabold text-sm ml-2 tracking-widest uppercase">
            Live Season
          </Text>
        </View>

        <Text className="text-white text-3xl font-extrabold">{event.name}</Text>

        {event.description ? (
          <Text className="text-neutral-400 text-sm leading-5 mt-2">
            {event.description}
          </Text>
        ) : null}

        <View className="flex-row items-center gap-3 mt-4">
          <View className="bg-[#FF6B35]/20 rounded-lg px-3 py-1.5">
            <Text className="text-[#FF6B35] font-bold text-sm">
              {daysRemaining(event.end_date)}d remaining
            </Text>
          </View>
          <Text className="text-neutral-500 text-sm">
            Day <Text className="text-white font-bold">{currentDay}</Text> / {seasonDays}
          </Text>
        </View>

        <View className="mt-4 h-3 bg-[#0a0a0a] rounded-full overflow-hidden">
          <View
            className="h-3 bg-[#FF6B35] rounded-full"
            style={{ width: `${calendarProgress}%` }}
          />
        </View>
        <Text className="text-neutral-600 text-[11px] mt-2">
          Calendar progress only. It does not pretend unverified tricks or challenges were completed.
        </Text>
      </View>

      <View className="mx-5 mt-5 bg-[#1a1a1a] rounded-2xl p-5 border border-[#FF6B35]/25">
        <View className="flex-row items-center gap-2">
          <Gift size={18} color="#FF6B35" />
          <Text className="text-[#FF6B35] font-black text-sm tracking-wider">
            DAILY SEASON REWARD
          </Text>
        </View>

        <Text className="text-white text-xl font-black mt-3">
          {claimedToday ? 'Today is recorded' : `+${expectedXp} XP available`}
        </Text>

        <Text className="text-neutral-400 text-sm leading-5 mt-2">
          The server allows one reward claim per account per calendar day while this event is active.
          XP is calculated by the event reward rules.
        </Text>

        {multiplier !== 1 ? (
          <View className="flex-row items-center gap-2 mt-3">
            <Zap size={15} color="#FFD700" />
            <Text className="text-[#FFD700] text-xs font-bold">
              {multiplier}× season XP multiplier
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => void claimReward()}
          disabled={claimedToday || claiming || !userId}
          className={`rounded-xl py-3.5 items-center mt-4 ${
            claimedToday || !userId ? 'bg-[#333]' : 'bg-[#FF6B35]'
          }`}
        >
          {claiming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-black">
              {!userId
                ? 'SIGN IN TO CLAIM'
                : claimedToday
                  ? 'CLAIMED TODAY'
                  : 'CLAIM TODAY’S REWARD'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="mx-5 mt-6">
        <Text className="text-white text-lg font-black">Your season claims</Text>
        <Text className="text-neutral-500 text-xs mt-1">
          Real records returned by the seasonal reward ledger.
        </Text>

        {claims.length === 0 ? (
          <View className="bg-[#151515] rounded-2xl p-6 items-center mt-3 border border-[#252525]">
            <Gift size={28} color="#555" />
            <Text className="text-neutral-400 text-sm font-bold mt-3">
              No rewards claimed yet
            </Text>
          </View>
        ) : (
          claims.slice(0, 30).map((claim) => (
            <View
              key={claim.id}
              className="bg-[#151515] rounded-xl px-4 py-3 mt-2 border border-[#252525] flex-row items-center"
            >
              <View className="w-10 h-10 rounded-full bg-green-500/15 items-center justify-center mr-3">
                <CheckCircle size={20} color="#4CAF50" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold">Day {claim.day_number}</Text>
                <Text className="text-neutral-500 text-xs mt-0.5">{claim.claim_date}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Zap size={14} color="#FFD700" />
                <Text className="text-[#FFD700] font-black">+{claim.xp_awarded} XP</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
