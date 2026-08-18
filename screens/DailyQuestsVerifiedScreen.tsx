import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, MapPin, RefreshCw, Star, Target, Trophy, Zap } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

type DailyQuest = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  quest_type: string | null;
  requirement_type: string | null;
  requirement_value: number | null;
};

type Completion = {
  quest_id: string;
  status: string;
};

type ClaimResult = {
  success?: boolean;
  error?: string;
  xp_awarded?: number;
  progress?: number;
  required?: number;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function iconFor(type?: string | null) {
  if (type === 'location' || type === 'exploration') return MapPin;
  if (type === 'challenge') return Trophy;
  if (type === 'social') return Star;
  if (type === 'tricks') return Zap;
  return Target;
}

export default function DailyQuestsVerifiedScreen() {
  const { user } = useAuthStore();
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [completions, setCompletions] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setQuests([]);
      setCompletions(new Map());
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [{ data: questRows, error: questError }, { data: completionRows, error: completionError }] =
        await Promise.all([
          supabase
            .from('daily_quests')
            .select('id,title,description,xp_reward,quest_type,requirement_type,requirement_value')
            .eq('active', true)
            .eq('frozen', false)
            .order('xp_reward', { ascending: false }),
          supabase
            .from('daily_quest_completions')
            .select('quest_id,status')
            .eq('user_id', user.id)
            .eq('date', todayIsoDate()),
        ]);

      if (questError) throw questError;
      if (completionError) throw completionError;

      setQuests((questRows ?? []) as DailyQuest[]);
      const next = new Map<string, string>();
      (completionRows ?? []).forEach(row => next.set(row.quest_id, row.status));
      setCompletions(next);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not load daily quests.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const completedCount = useMemo(
    () => quests.filter(quest => completions.get(quest.id) === 'approved').length,
    [quests, completions]
  );

  const claim = async (quest: DailyQuest) => {
    if (!user?.id || claiming) return;
    setClaiming(quest.id);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_daily_quest', {
        p_quest_id: quest.id,
      });
      if (rpcError) throw rpcError;

      const result = (data ?? {}) as ClaimResult;
      if (!result.success) {
        const progressText =
          typeof result.progress === 'number' && typeof result.required === 'number'
            ? `\n\nProgress: ${result.progress}/${result.required}`
            : '';
        Alert.alert('Not completed yet', `${result.error ?? 'Quest requirement not met yet.'}${progressText}`);
        return;
      }

      Alert.alert('Quest complete', `+${result.xp_awarded ?? quest.xp_reward} XP earned.`);
      await load();
    } catch (claimError) {
      Alert.alert(
        'Could not verify quest',
        claimError instanceof Error ? claimError.message : 'Please try again.'
      );
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#05070B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#D2673D" />
        <Text style={{ color: '#9CA3AF', marginTop: 12 }}>Loading real daily missions…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#05070B' }}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <Text style={{ color: '#D2673D', fontWeight: '900', letterSpacing: 2, fontSize: 11 }}>
          TODAY'S MISSIONS
        </Text>
        <Text style={{ color: '#F3F4F6', fontWeight: '900', fontSize: 30, marginTop: 5 }}>
          Daily Quests
        </Text>
        <Text style={{ color: '#9CA3AF', marginTop: 6, lineHeight: 19 }}>
          SkateQuest checks your real activity. No fake proof buttons and no self-awarded XP.
        </Text>
        <Text style={{ color: '#D2673D', fontWeight: '800', marginTop: 10 }}>
          {completedCount}/{quests.length} complete today
        </Text>
      </View>

      <FlatList
        data={quests}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#D2673D"
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 44, gap: 12 }}
        ListEmptyComponent={
          <View style={{ marginTop: 60, alignItems: 'center', paddingHorizontal: 30 }}>
            <Target color="#D2673D" size={34} />
            <Text style={{ color: '#F3F4F6', fontWeight: '900', fontSize: 18, marginTop: 12 }}>
              {error ? 'Missions could not load' : 'No verified missions are live right now'}
            </Text>
            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {error ?? 'Only missions with real server-side verification are shown here.'}
            </Text>
            <Pressable
              onPress={() => void load()}
              style={{ flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 18, padding: 12 }}
            >
              <RefreshCw color="#D2673D" size={17} />
              <Text style={{ color: '#D2673D', fontWeight: '800' }}>Try again</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = iconFor(item.quest_type);
          const status = completions.get(item.id);
          const done = status === 'approved';
          const isClaiming = claiming === item.id;

          return (
            <View
              style={{
                backgroundColor: '#111827',
                borderWidth: 1,
                borderColor: done ? '#245C42' : '#242C38',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? '#123C2A' : '#2A1812',
                  }}
                >
                  {done ? <CheckCircle2 color="#4ADE80" size={23} /> : <Icon color="#D2673D" size={23} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#F3F4F6', fontSize: 17, fontWeight: '900' }}>{item.title}</Text>
                  {item.description ? (
                    <Text style={{ color: '#9CA3AF', marginTop: 4, lineHeight: 19 }}>{item.description}</Text>
                  ) : null}
                </View>
                <View style={{ backgroundColor: '#173325', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }}>
                  <Text style={{ color: '#4ADE80', fontWeight: '900' }}>+{item.xp_reward} XP</Text>
                </View>
              </View>

              <Pressable
                disabled={done || isClaiming}
                onPress={() => void claim(item)}
                style={{
                  minHeight: 46,
                  marginTop: 15,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done ? '#183727' : '#D2673D',
                  opacity: isClaiming ? 0.65 : 1,
                }}
              >
                {isClaiming ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: '900' }}>
                    {done ? 'Verified complete' : 'Verify my progress'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
