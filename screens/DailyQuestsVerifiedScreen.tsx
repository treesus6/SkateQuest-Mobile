import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Flame,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F5F0E7';
const ORANGE = '#E36D3F';
const ACID = '#D8F04B';
const BLUE = '#63A7FF';
const PURPLE = '#A878FF';
const MUTED = '#929AA7';

type DailyQuest = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  quest_type: string | null;
  requirement_type: string | null;
  requirement_value: number | null;
};

type Completion = { quest_id: string; status: string };
type ClaimResult = { success?: boolean; error?: string; xp_awarded?: number; progress?: number; required?: number };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function questColor(type?: string | null) {
  if (type === 'location' || type === 'exploration') return BLUE;
  if (type === 'challenge') return ORANGE;
  if (type === 'social') return PURPLE;
  if (type === 'tricks') return ACID;
  return ORANGE;
}

function questIcon(type?: string | null) {
  if (type === 'location' || type === 'exploration') return MapPin;
  if (type === 'challenge') return Trophy;
  if (type === 'social') return Star;
  if (type === 'tricks') return Zap;
  return Target;
}

function questLabel(type?: string | null) {
  if (type === 'location' || type === 'exploration') return 'EXPLORE';
  if (type === 'challenge') return 'CHALLENGE';
  if (type === 'social') return 'SOCIAL';
  if (type === 'tricks') return 'TRICKS';
  return 'DAILY';
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
      const [{ data: questRows, error: questError }, { data: completionRows, error: completionError }] = await Promise.all([
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
      (completionRows ?? []).forEach((row: Completion) => next.set(row.quest_id, row.status));
      setCompletions(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load daily quests.');
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
  const availableXp = useMemo(() => quests.reduce((sum, quest) => sum + Number(quest.xp_reward || 0), 0), [quests]);
  const earnedXp = useMemo(
    () => quests.reduce((sum, quest) => sum + (completions.get(quest.id) === 'approved' ? Number(quest.xp_reward || 0) : 0), 0),
    [quests, completions]
  );
  const completionPercent = quests.length ? Math.round((completedCount / quests.length) * 100) : 0;

  const claim = async (quest: DailyQuest) => {
    if (!user?.id || claiming) return;
    setClaiming(quest.id);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_daily_quest', { p_quest_id: quest.id });
      if (rpcError) throw rpcError;
      const result = (data ?? {}) as ClaimResult;
      if (!result.success) {
        const progressText =
          typeof result.progress === 'number' && typeof result.required === 'number'
            ? `\n\nProgress: ${result.progress}/${result.required}`
            : '';
        Alert.alert('Not there yet', `${result.error ?? 'Quest requirement not met yet.'}${progressText}`);
        return;
      }
      Alert.alert('Mission cleared', `+${result.xp_awarded ?? quest.xp_reward} XP earned.`);
      await load();
    } catch (claimError) {
      Alert.alert('Could not verify mission', claimError instanceof Error ? claimError.message : 'Try again.');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <View style={s.loadingMark}><Target color={INK} size={31} strokeWidth={2.7} /></View>
        <ActivityIndicator color={ORANGE} style={{ marginTop: 14 }} />
        <Text style={s.loadingText}>Building today’s mission stack…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
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
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View>
            <View style={s.titleBlock}>
              <View style={s.titleMeta}>
                <Flame color={ORANGE} size={16} />
                <Text style={s.kicker}>TODAY // VERIFIED</Text>
              </View>
              <Text style={s.title}>MISSION{`\n`}BOARD.</Text>
              <Text style={s.subtitle}>Do the real thing first. SkateQuest checks the activity before XP moves.</Text>
            </View>

            <View style={s.scoreboard}>
              <View style={s.scoreLeft}>
                <Text style={s.scoreSmall}>CLEARED</Text>
                <Text style={s.scoreBig}>{completedCount}<Text style={s.scoreSlash}>/{quests.length}</Text></Text>
              </View>
              <View style={s.scoreCenter}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${completionPercent}%` }]} />
                </View>
                <Text style={s.progressCaption}>{completionPercent}% OF TODAY’S BOARD</Text>
              </View>
              <View style={s.scoreRight}>
                <Text style={s.scoreSmall}>XP LEFT</Text>
                <Text style={s.scoreXp}>{Math.max(0, availableXp - earnedXp)}</Text>
              </View>
            </View>

            <View style={s.verifiedRail}>
              <View style={s.verifiedIcon}><ShieldCheck color={INK} size={21} strokeWidth={2.7} /></View>
              <View style={s.verifiedCopy}>
                <Text style={s.verifiedTitle}>NO FAKE COMPLETIONS</Text>
                <Text style={s.verifiedSub}>Progress is checked against real SkateQuest activity before the server pays XP.</Text>
              </View>
              <Sparkles color={ACID} size={18} />
            </View>

            {quests.length > 0 ? (
              <View style={s.stackHeader}>
                <View>
                  <Text style={s.stackEyebrow}>STACK // HIGH XP FIRST</Text>
                  <Text style={s.stackTitle}>What are you landing?</Text>
                </View>
                <View style={s.stackCount}><Text style={s.stackCountText}>{quests.length}</Text></View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyMark}><Target color={INK} size={30} /></View>
            <Text style={s.emptyTitle}>{error ? 'MISSION BOARD OFFLINE' : 'NO MISSIONS LIVE'}</Text>
            <Text style={s.emptyText}>{error ?? 'Only real server-verified missions show up here.'}</Text>
            <Pressable style={s.retryBtn} onPress={() => void load()}>
              <RefreshCw color={INK} size={17} />
              <Text style={s.retryText}>REFRESH BOARD</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const done = completions.get(item.id) === 'approved';
          const color = done ? '#65D897' : questColor(item.quest_type);
          const Icon = done ? CheckCircle2 : questIcon(item.quest_type);
          const busy = claiming === item.id;

          return (
            <Pressable
              disabled={done || busy}
              onPress={() => void claim(item)}
              style={[s.ticket, done && s.ticketDone]}
            >
              <View style={[s.ticketRail, { backgroundColor: color }]}>
                <Text style={s.ticketIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={s.ticketRailIcon}><Icon color={INK} size={22} strokeWidth={2.7} /></View>
              </View>

              <View style={s.ticketBody}>
                <View style={s.ticketMetaRow}>
                  <Text style={[s.ticketTag, { color }]}>{done ? 'CLEARED' : questLabel(item.quest_type)}</Text>
                  {item.requirement_value ? (
                    <Text style={s.ticketGoal}>GOAL {item.requirement_value} {String(item.requirement_type || 'ACTIONS').toUpperCase()}</Text>
                  ) : null}
                </View>
                <Text style={s.ticketTitle}>{item.title}</Text>
                {item.description ? <Text style={s.ticketDesc} numberOfLines={2}>{item.description}</Text> : null}

                <View style={s.ticketBottom}>
                  <View style={s.rewardBlock}>
                    <Text style={s.rewardNumber}>+{item.xp_reward}</Text>
                    <Text style={s.rewardLabel}>XP</Text>
                  </View>
                  <View style={[s.verifyAction, done && s.verifyActionDone]}>
                    {busy ? (
                      <ActivityIndicator color={done ? '#65D897' : PAPER} />
                    ) : done ? (
                      <>
                        <Check color="#65D897" size={16} strokeWidth={3} />
                        <Text style={s.verifyDoneText}>VERIFIED</Text>
                      </>
                    ) : (
                      <>
                        <ShieldCheck color={PAPER} size={16} />
                        <Text style={s.verifyText}>CHECK MY PROGRESS</Text>
                        <ArrowUpRight color={color} size={16} />
                      </>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 38 },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  loadingMark: { width: 66, height: 66, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  loadingText: { color: MUTED, fontWeight: '700', marginTop: 10 },
  titleBlock: { paddingHorizontal: 18, paddingTop: 10 },
  titleMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { color: ORANGE, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: PAPER, fontSize: 47, lineHeight: 43, fontWeight: '900', letterSpacing: -2.5, marginTop: 7 },
  subtitle: { color: MUTED, fontSize: 13, lineHeight: 19, maxWidth: 340, marginTop: 10 },
  scoreboard: { marginHorizontal: 14, marginTop: 20, minHeight: 102, borderRadius: 21, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#13171D', borderWidth: 1, borderColor: '#2A3039' },
  scoreLeft: { width: 84, backgroundColor: ORANGE, padding: 12, justifyContent: 'center' },
  scoreSmall: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  scoreBig: { color: INK, fontSize: 30, fontWeight: '900', marginTop: 1 },
  scoreSlash: { fontSize: 15, color: 'rgba(7,8,11,0.6)' },
  scoreCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  progressTrack: { height: 9, borderRadius: 999, backgroundColor: '#2A3039', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACID, borderRadius: 999 },
  progressCaption: { color: '#8E96A3', fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 8 },
  scoreRight: { width: 76, backgroundColor: ACID, padding: 10, justifyContent: 'center', alignItems: 'center' },
  scoreXp: { color: INK, fontSize: 19, fontWeight: '900', marginTop: 3 },
  verifiedRail: { marginHorizontal: 14, marginTop: 10, minHeight: 80, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#11151B', borderWidth: 1, borderColor: '#29303A' },
  verifiedIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  verifiedCopy: { flex: 1 },
  verifiedTitle: { color: PAPER, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  verifiedSub: { color: MUTED, fontSize: 9, lineHeight: 14, marginTop: 3 },
  stackHeader: { paddingHorizontal: 18, marginTop: 28, marginBottom: 11, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  stackEyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  stackTitle: { color: PAPER, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  stackCount: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#222832', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  stackCountText: { color: PAPER, fontSize: 13, fontWeight: '900' },
  ticket: { marginHorizontal: 14, marginBottom: 10, minHeight: 174, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#13171D', borderWidth: 1, borderColor: '#2B313B' },
  ticketDone: { opacity: 0.78, borderColor: '#2F6B4B' },
  ticketRail: { width: 54, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  ticketIndex: { color: INK, fontSize: 15, fontWeight: '900', transform: [{ rotate: '-90deg' }] },
  ticketRailIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center' },
  ticketBody: { flex: 1, padding: 15 },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketTag: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  ticketGoal: { color: '#737C89', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  ticketTitle: { color: PAPER, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  ticketDesc: { color: MUTED, fontSize: 11, lineHeight: 16, marginTop: 5 },
  ticketBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 13 },
  rewardBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  rewardNumber: { color: PAPER, fontSize: 17, fontWeight: '900' },
  rewardLabel: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  verifyAction: { minHeight: 38, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#202631', borderWidth: 1, borderColor: '#343B46' },
  verifyActionDone: { backgroundColor: '#122218', borderColor: '#285C40' },
  verifyText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  verifyDoneText: { color: '#65D897', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  empty: { marginHorizontal: 14, marginTop: 24, borderRadius: 24, padding: 22, backgroundColor: '#13171D', borderWidth: 1, borderColor: '#2B313B', alignItems: 'flex-start' },
  emptyMark: { width: 56, height: 56, borderRadius: 16, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 22, fontWeight: '900', marginTop: 15 },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 18, marginTop: 5 },
  retryBtn: { marginTop: 16, minHeight: 44, borderRadius: 13, backgroundColor: ORANGE, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
