import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle,
  Flame,
  Gift,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';
import { supabase } from '../lib/supabase';
import { Logger } from '../lib/logger';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#8A929F';

type RewardsConfig = {
  xp_multiplier?: number;
};

type SeasonalEvent = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  rewards: RewardsConfig | null;
  created_at: string;
};

type SeasonalClaim = {
  id: string;
  event_id: string;
  claim_date: string;
  day_number: number;
  xp_awarded: number;
};

function isActive(event: SeasonalEvent): boolean {
  const now = Date.now();
  return new Date(event.start_date).getTime() <= now && new Date(event.end_date).getTime() >= now;
}

function daysLeft(event: SeasonalEvent): number {
  return Math.max(0, Math.ceil((new Date(event.end_date).getTime() - Date.now()) / 86_400_000));
}

function dateRange(event: SeasonalEvent): string {
  const start = new Date(event.start_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const end = new Date(event.end_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${start} → ${end}`;
}

export default function SeasonalEventsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [claims, setClaims] = useState<SeasonalClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const { data: eventRows, error: eventError } = await supabase
        .from('seasonal_events')
        .select('id,name,description,start_date,end_date,rewards,created_at')
        .order('start_date', { ascending: false });

      if (eventError) throw eventError;

      const nextEvents = (eventRows as SeasonalEvent[] | null) ?? [];
      setEvents(nextEvents);

      const active = nextEvents.find(isActive) ?? null;
      if (!user?.id || !active) {
        setClaims([]);
        return;
      }

      const { data: claimRows, error: claimError } = await supabase
        .from('seasonal_reward_claims')
        .select('id,event_id,claim_date,day_number,xp_awarded')
        .eq('user_id', user.id)
        .eq('event_id', active.id)
        .order('claim_date', { ascending: false });

      if (claimError) throw claimError;
      setClaims((claimRows as SeasonalClaim[] | null) ?? []);
    } catch (error) {
      Logger.error('Seasonal events load failed', error);
      setLoadError(error instanceof Error ? error.message : 'Seasonal events could not be loaded.');
      setEvents([]);
      setClaims([]);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const activeEvent = useMemo(() => events.find(isActive) ?? null, [events]);
  const archivedEvents = useMemo(
    () => events.filter(event => event.id !== activeEvent?.id),
    [events, activeEvent?.id]
  );
  const claimedXp = claims.reduce((sum, claim) => sum + Number(claim.xp_awarded ?? 0), 0);
  const multiplier = Math.max(0, Number(activeEvent?.rewards?.xp_multiplier ?? 1));

  if (loading) {
    return (
      <SafeAreaView style={s.loading}>
        <View style={s.loadingStamp}>
          <Flame color={INK} size={30} strokeWidth={2.8} />
        </View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>LOADING REAL SEASON DATA</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ORANGE} />}
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.heroSlash} />
          <View style={s.heroTop}>
            <View style={s.heroStamp}>
              <Flame color={INK} size={29} strokeWidth={2.8} />
            </View>
            <View style={s.liveChip}>
              <Sparkles color={INK} size={12} strokeWidth={3} />
              <Text style={s.liveChipText}>SEASONAL EVENTS</Text>
            </View>
          </View>
          <Text style={s.eyebrow}>REAL EVENT WINDOWS • REAL REWARD LEDGER</Text>
          <Text style={s.title}>SEASONAL{'\n'}EVENTS.</Text>
          <Text style={s.subtitle}>
            SkateQuest only shows seasons that actually exist in the live event catalog.
          </Text>
        </View>

        <View style={s.stats}>
          <Stat value={String(events.length)} label="PUBLISHED" icon={<CalendarDays color={INK} size={18} />} />
          <Stat value={activeEvent ? String(daysLeft(activeEvent)) : '0'} label="DAYS LEFT" icon={<Flame color={INK} size={18} />} />
          <Stat value={String(claims.length)} label="YOUR CLAIMS" icon={<CheckCircle color={INK} size={18} />} />
        </View>

        {loadError ? (
          <View style={s.errorCard}>
            <Text style={s.errorTitle}>SEASON DATA ERROR</Text>
            <Text style={s.errorText}>{loadError}</Text>
          </View>
        ) : null}

        {activeEvent ? (
          <>
            <View style={s.sectionHead}>
              <View>
                <Text style={s.sectionKicker}>CURRENT RUN</Text>
                <Text style={s.sectionTitle}>ACTIVE SEASON</Text>
              </View>
              <View style={s.activePill}>
                <View style={s.activeDot} />
                <Text style={s.activeText}>LIVE</Text>
              </View>
            </View>

            <View style={s.activeCard}>
              <Text style={s.activeName}>{activeEvent.name}</Text>
              <Text style={s.range}>{dateRange(activeEvent)}</Text>
              {activeEvent.description ? <Text style={s.description}>{activeEvent.description}</Text> : null}

              <View style={s.rewardRow}>
                <View style={s.rewardBox}>
                  <Zap color={INK} size={19} />
                  <Text style={s.rewardValue}>{multiplier}×</Text>
                  <Text style={s.rewardLabel}>XP MULTIPLIER</Text>
                </View>
                <View style={s.rewardBox}>
                  <Gift color={INK} size={19} />
                  <Text style={s.rewardValue}>{claimedXp}</Text>
                  <Text style={s.rewardLabel}>XP CLAIMED</Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.openButton}
                onPress={() => navigation.navigate('SeasonalPass')}
                accessibilityRole="button"
              >
                <Text style={s.openButtonText}>OPEN SEASON REWARDS</Text>
                <ArrowUpRight color={INK} size={18} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyStamp}>
              <CalendarDays color={INK} size={31} strokeWidth={2.8} />
            </View>
            <Text style={s.emptyKicker}>BETWEEN SEASONS</Text>
            <Text style={s.emptyTitle}>NO LIVE EVENT RIGHT NOW</Text>
            <Text style={s.emptyText}>
              No fake season is filled in. The next card appears only when a real event exists in Supabase.
            </Text>
          </View>
        )}

        <View style={s.archiveHead}>
          <View>
            <Text style={s.sectionKicker}>CATALOG</Text>
            <Text style={s.sectionTitle}>SEASON ARCHIVE</Text>
          </View>
          <Text style={s.archiveCount}>{archivedEvents.length} PAST</Text>
        </View>

        {archivedEvents.length === 0 ? (
          <View style={s.archiveEmpty}>
            <Text style={s.archiveEmptyText}>No archived seasonal events are published.</Text>
          </View>
        ) : (
          archivedEvents.map((event, index) => (
            <View key={event.id} style={[s.archiveCard, index % 2 === 1 && s.tilt]}>
              <View style={[s.archiveStripe, { backgroundColor: index % 2 === 0 ? BLUE : ACID }]} />
              <Text style={s.archiveTitle}>{event.name}</Text>
              <Text style={s.archiveRange}>{dateRange(event)}</Text>
              {event.description ? <Text style={s.archiveDescription}>{event.description}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <View style={s.stat}>
      {icon}
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  content: { paddingBottom: 110 },
  hero: { minHeight: 275, padding: 18, paddingTop: 22, overflow: 'hidden' },
  heroSlash: { position: 'absolute', width: 320, height: 92, right: -110, top: 72, backgroundColor: ORANGE, transform: [{ rotate: '29deg' }] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroStamp: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 2, borderColor: INK },
  liveChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 25 },
  title: { color: PAPER, fontSize: 48, lineHeight: 44, fontWeight: '900', letterSpacing: -2.5, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 310, marginTop: 8 },
  stats: { marginHorizontal: 14, marginTop: -9, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, flexDirection: 'row', paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: INK, fontSize: 18, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },
  errorCard: { margin: 14, marginBottom: 0, borderRadius: 16, borderWidth: 1, borderColor: '#7F2F2F', backgroundColor: '#241010', padding: 13 },
  errorTitle: { color: '#F87171', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  errorText: { color: '#D1A4A4', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionHead: { paddingHorizontal: 18, paddingTop: 26, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', marginTop: 2 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  activeText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  activeCard: { marginHorizontal: 14, backgroundColor: ORANGE, borderRadius: 24, borderWidth: 2, borderColor: INK, padding: 17, transform: [{ rotate: '-0.4deg' }] },
  activeName: { color: INK, fontSize: 28, lineHeight: 31, fontWeight: '900', letterSpacing: -1 },
  range: { color: '#6F3A28', fontSize: 9, fontWeight: '900', marginTop: 5 },
  description: { color: '#4D2B20', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 12 },
  rewardRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  rewardBox: { flex: 1, minHeight: 88, borderRadius: 16, borderWidth: 1.5, borderColor: INK, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' },
  rewardValue: { color: INK, fontSize: 20, fontWeight: '900', marginTop: 4 },
  rewardLabel: { color: '#77736D', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },
  openButton: { minHeight: 50, marginTop: 12, borderRadius: 14, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openButtonText: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  emptyCard: { marginHorizontal: 14, marginTop: 25, minHeight: 220, backgroundColor: '#13161C', borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 14 },
  emptyTitle: { color: PAPER, fontSize: 15, fontWeight: '900', marginTop: 3, textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 285 },
  archiveHead: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  archiveCount: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  archiveEmpty: { marginHorizontal: 14, borderRadius: 18, backgroundColor: '#12151A', borderWidth: 1, borderColor: '#272C34', padding: 20 },
  archiveEmptyText: { color: MUTED, fontSize: 11, textAlign: 'center' },
  archiveCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: PAPER, borderRadius: 18, borderWidth: 2, borderColor: INK, padding: 15, overflow: 'hidden' },
  tilt: { transform: [{ rotate: '0.35deg' }] },
  archiveStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  archiveTitle: { color: INK, fontSize: 17, fontWeight: '900', marginLeft: 3 },
  archiveRange: { color: '#74766F', fontSize: 8, fontWeight: '800', marginTop: 4, marginLeft: 3 },
  archiveDescription: { color: '#666A65', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 9, marginLeft: 3 },
});
