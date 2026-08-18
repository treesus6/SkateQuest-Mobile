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
  CheckCircle2,
  Flame,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
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

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';

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

function labelFor(type?: string | null) {
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
      (completionRows ?? []).forEach((row: Completion) => next.set(row.quest_id, row.status));
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

  const availableXp = useMemo(
    () => quests.reduce((sum, quest) => sum + (quest.xp_reward || 0), 0),
    [quests]
  );

  const earnedXp = useMemo(
    () => quests.reduce((sum, quest) => sum + (completions.get(quest.id) === 'approved' ? quest.xp_reward || 0 : 0), 0),
    [quests, completions]
  );

  const completionPercent = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0;

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
      <View style={s.loading}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={s.loadingText}>Loading today’s real missions…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
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
            tintColor={ACCENT}
          />
        }
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <View style={s.headerWrap}>
            <View style={s.eyebrowRow}>
              <Flame color="#FF8C42" size={16} />
              <Text style={s.eyebrow}>TODAY'S MISSIONS</Text>
            </View>
            <Text style={s.title}>Daily Quests</Text>
            <Text style={s.subtitle}>
              SkateQuest checks real activity before XP is awarded. Complete the session, then verify it here.
            </Text>

            <View style={s.progressCard}>
              <View style={s.progressTop}>
                <View>
                  <Text style={s.progressLabel}>TODAY'S RUN</Text>
                  <Text style={s.progressValue}>{completedCount}/{quests.length} complete</Text>
                </View>
                <View style={s.percentPill}>
                  <Text style={s.percentText}>{completionPercent}%</Text>
                </View>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${completionPercent}%` }]} />
              </View>
              <View style={s.progressStats}>
                <View style={s.progressStat}>
                  <Zap color={ACCENT} size={15} />
                  <Text style={s.progressStatText}>{earnedXp} XP earned</Text>
                </View>
                <View style={s.progressStat}>
                  <Trophy color="#F7B955" size={15} />
                  <Text style={s.progressStatText}>{availableXp} XP available</Text>
                </View>
              </View>
            </View>

            {quests.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Mission stack</Text>
                  <Text style={s.sectionCaption}>Highest XP first</Text>
                </View>
                <View style={s.verifiedPill}>
                  <ShieldCheck color="#4ADE80" size={14} />
                  <Text style={s.verifiedText}>VERIFIED</Text>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Target color={ACCENT} size={32} />
            </View>
            <Text style={s.emptyTitle}>{error ? 'Missions could not load' : 'No verified missions are live right now'}</Text>
            <Text style={s.emptyText}>{error ?? 'Only missions with real server-side verification are shown here.'}</Text>
            <Pressable onPress={() => void load()} style={s.retryButton}>
              <RefreshCw color="#fff" size={17} />
              <Text style={s.retryText}>Try again</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => {
          const Icon = iconFor(item.quest_type);
          const status = completions.get(item.id);
          const done = status === 'approved';
          const isClaiming = claiming === item.id;

          return (
            <View style={[s.questCard, done && s.questCardDone, index === 0 && !done && s.questCardTop]}>
              <View style={s.questTopRow}>
                <View style={[s.questIcon, done && s.questIconDone]}>
                  {done ? <CheckCircle2 color="#4ADE80" size={24} /> : <Icon color={ACCENT} size={24} />}
                </View>
                <View style={s.questCopy}>
                  <View style={s.questTagRow}>
                    <Text style={[s.questTag, done && s.questTagDone]}>{done ? 'DONE' : labelFor(item.quest_type)}</Text>
                  </View>
                  <Text style={s.questTitle}>{item.title}</Text>
                  {item.description ? <Text style={s.questDescription}>{item.description}</Text> : null}
                </View>
                <View style={[s.xpBadge, done && s.xpBadgeDone]}>
                  <Text style={[s.xpValue, done && s.xpValueDone]}>+{item.xp_reward}</Text>
                  <Text style={[s.xpLabel, done && s.xpValueDone]}>XP</Text>
                </View>
              </View>

              {item.requirement_value ? (
                <View style={s.requirementRow}>
                  <Target color="#7D899A" size={14} />
                  <Text style={s.requirementText}>Goal: {item.requirement_value} {item.requirement_type || 'actions'}</Text>
                </View>
              ) : null}

              <Pressable
                disabled={done || isClaiming}
                onPress={() => void claim(item)}
                style={[s.verifyButton, done && s.verifyButtonDone, isClaiming && s.verifyButtonBusy]}
              >
                {isClaiming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    {done ? <CheckCircle2 color="#4ADE80" size={18} /> : <ShieldCheck color="#fff" size={18} />}
                    <Text style={[s.verifyText, done && s.verifyTextDone]}>
                      {done ? 'Verified complete' : 'Verify my progress'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  loading: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 12 },
  listContent: { paddingBottom: 44 },
  headerWrap: { paddingTop: 8 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20 },
  eyebrow: { color: '#FF8C42', fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1, paddingHorizontal: 20, marginTop: 6 },
  subtitle: { color: '#8B95A5', fontSize: 14, lineHeight: 20, paddingHorizontal: 20, marginTop: 6 },
  progressCard: { margin: 16, marginTop: 18, backgroundColor: '#0D131D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  progressValue: { color: '#F7F4EF', fontSize: 20, fontWeight: '900', marginTop: 4 },
  percentPill: { backgroundColor: 'rgba(210,103,61,0.14)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  percentText: { color: ACCENT, fontSize: 13, fontWeight: '900' },
  progressTrack: { height: 10, backgroundColor: '#202938', borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 999 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  progressStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressStatText: { color: '#8E99A9', fontSize: 11, fontWeight: '700' },
  sectionHeader: { paddingHorizontal: 20, marginTop: 4, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900' },
  sectionCaption: { color: '#667085', fontSize: 11, marginTop: 2 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10261C', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  verifiedText: { color: '#4ADE80', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  questCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  questCardTop: { borderColor: 'rgba(210,103,61,0.48)', backgroundColor: '#13151B' },
  questCardDone: { borderColor: '#245C42', backgroundColor: '#0D1814' },
  questTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  questIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(210,103,61,0.12)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.25)' },
  questIconDone: { backgroundColor: '#123C2A', borderColor: '#245C42' },
  questCopy: { flex: 1 },
  questTagRow: { flexDirection: 'row', marginBottom: 4 },
  questTag: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  questTagDone: { color: '#4ADE80' },
  questTitle: { color: '#F7F4EF', fontSize: 17, fontWeight: '900', lineHeight: 21 },
  questDescription: { color: '#8B95A5', marginTop: 5, lineHeight: 19, fontSize: 13 },
  xpBadge: { backgroundColor: 'rgba(210,103,61,0.14)', borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.32)' },
  xpBadgeDone: { backgroundColor: '#153624', borderColor: '#245C42' },
  xpValue: { color: ACCENT, fontWeight: '900', fontSize: 14 },
  xpValueDone: { color: '#4ADE80' },
  xpLabel: { color: ACCENT, fontWeight: '800', fontSize: 8 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1C2635' },
  requirementText: { color: '#7D899A', fontSize: 11, fontWeight: '600' },
  verifyButton: { minHeight: 46, marginTop: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: ACCENT },
  verifyButtonDone: { backgroundColor: '#153624', borderWidth: 1, borderColor: '#245C42' },
  verifyButtonBusy: { opacity: 0.65 },
  verifyText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  verifyTextDone: { color: '#4ADE80' },
  empty: { marginTop: 58, alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.24)' },
  emptyTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 18, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryButton: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 18, backgroundColor: ACCENT, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
});
