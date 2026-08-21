import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronRight,
  Clock3,
  Flame,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
  Verified,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';

type BountyDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
type DifficultyFilter = 'all' | BountyDifficulty;

interface Bounty {
  id: string;
  trick_name: string;
  park_name: string | null;
  description: string | null;
  xp_reward: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  is_official?: boolean;
  difficulty?: BountyDifficulty | null;
  crews: { name: string } | null;
}

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const FILTERS: Array<{ key: DifficultyFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'expert', label: 'Expert' },
];

export default function BountyBoardScreen() {
  const navigation = useNavigation<any>();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    void loadBounties();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadBounties = async () => {
    const { data, error } = await supabase
      .from('bounties')
      .select('*, crews(name)')
      .eq('status', 'open')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('xp_reward', { ascending: false });

    if (error) {
      console.error('Failed to load bounties:', error);
    }
    setBounties((data || []) as Bounty[]);
    setLoading(false);
    setRefreshing(false);
  };

  const filteredBounties = useMemo(
    () =>
      difficultyFilter === 'all'
        ? bounties
        : bounties.filter(bounty => bounty.difficulty === difficultyFilter),
    [bounties, difficultyFilter]
  );

  const totalXp = useMemo(
    () => bounties.reduce((sum, bounty) => sum + (bounty.xp_reward || 0), 0),
    [bounties]
  );

  const daysLeft = (expires: string | null) => {
    if (!expires) return 'Open challenge';
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const isUrgent = (expires: string | null) => {
    if (!expires) return false;
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 2;
  };

  const claimBounty = (bounty: Bounty) => {
    navigation.navigate('UploadMedia', {
      initialTrickName: bounty.trick_name,
      bountyId: bounty.id,
      spotName: bounty.park_name,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
        <FlatList
          data={filteredBounties}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadBounties();
              }}
              tintColor={ORANGE}
            />
          }
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <>
              <View style={s.hero}>
                <View style={s.heroOrangeSlash} />
                <View style={s.heroAcidSlash} />
                <View style={s.heroBlueOrb} />

                <View style={s.heroTopRow}>
                  <View style={s.heroStamp}>
                    <Target color={INK} size={29} strokeWidth={2.9} />
                  </View>
                  <View style={s.proofChip}>
                    <Camera color={INK} size={12} strokeWidth={3} />
                    <Text style={s.proofChipText}>VIDEO PROOF</Text>
                  </View>
                </View>

                <Text style={s.eyebrow}>LIVE TRICK BOUNTIES</Text>
                <Text style={s.title}>BOUNTY{`\n`}BOARD.</Text>
                <Text style={s.sub}>
                  Pick a real challenge, land it on camera, and send the clip to the Judge&apos;s Booth for XP.
                </Text>
              </View>

              <View style={s.statsTicket}>
                <View style={s.statCell}>
                  <Target color={INK} size={18} strokeWidth={2.8} />
                  <Text style={s.statValue}>{bounties.length}</Text>
                  <Text style={s.statLabel}>OPEN</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <Trophy color={INK} size={18} strokeWidth={2.8} />
                  <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                  <Text style={s.statLabel}>XP LIVE</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <Camera color={INK} size={18} strokeWidth={2.8} />
                  <Text style={s.statValue}>REAL</Text>
                  <Text style={s.statLabel}>PROOF</Text>
                </View>
              </View>

              {bounties.length > 0 ? (
                <>
                  <View style={s.filterWrap}>
                    <Text style={s.filterKicker}>FILTER THE WALL</Text>
                    <View style={s.filters}>
                      {FILTERS.map(filter => {
                        const selected = difficultyFilter === filter.key;
                        return (
                          <TouchableOpacity
                            key={filter.key}
                            activeOpacity={0.85}
                            style={[s.filterChip, selected && s.filterChipActive]}
                            onPress={() => setDifficultyFilter(filter.key)}
                          >
                            <Text style={[s.filterText, selected && s.filterTextActive]}>
                              {filter.label.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={s.sectionHeader}>
                    <View>
                      <Text style={s.sectionTitle}>WANTED NOW</Text>
                      <Text style={s.sectionSub}>{filteredBounties.length} SHOWN • HIGHEST XP FIRST</Text>
                    </View>
                    <View style={s.livePill}>
                      <View style={s.liveDot} />
                      <Text style={s.liveText}>LIVE</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </>
          }
          renderItem={({ item, index }) => {
            const urgent = isUrgent(item.expires_at);
            const featured = index === 0;
            const difficultyAccent =
              item.difficulty === 'expert'
                ? ORANGE
                : item.difficulty === 'advanced'
                  ? BLUE
                  : item.difficulty === 'intermediate'
                    ? ACID
                    : '#D8D2C7';

            return (
              <TouchableOpacity
                activeOpacity={0.88}
                style={[s.card, featured && s.featuredCard, index % 2 === 1 && s.cardTilt]}
                onPress={() => claimBounty(item)}
              >
                <View style={[s.cardTape, { backgroundColor: difficultyAccent }]}>
                  <Text style={s.cardTapeText}>{(item.difficulty || 'OPEN').toUpperCase()}</Text>
                </View>

                <View style={s.cardTop}>
                  <View style={s.badgeRow}>
                    {featured ? (
                      <View style={s.hotBadge}>
                        <Sparkles color={INK} size={12} strokeWidth={3} />
                        <Text style={s.hotBadgeText}>TOP BOUNTY</Text>
                      </View>
                    ) : (
                      <View style={s.openBadge}>
                        <Flame color={INK} size={11} strokeWidth={3} />
                        <Text style={s.openBadgeText}>OPEN</Text>
                      </View>
                    )}
                    {item.is_official ? (
                      <View style={s.officialBadge}>
                        <Verified color={INK} size={12} strokeWidth={2.8} />
                        <Text style={s.officialBadgeText}>SKATEQUEST</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={s.xpBadge}>
                    <Text style={s.xpValue}>+{item.xp_reward}</Text>
                    <Text style={s.xpLabel}>XP</Text>
                  </View>
                </View>

                <Text style={s.trick}>{item.trick_name}</Text>

                <View style={s.metaGrid}>
                  {item.park_name ? (
                    <View style={s.metaBlock}>
                      <MapPin color={ORANGE} size={14} strokeWidth={2.7} />
                      <View style={s.metaCopy}>
                        <Text style={s.metaKicker}>SPOT</Text>
                        <Text style={s.metaText} numberOfLines={1}>{item.park_name}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={[s.metaBlock, urgent && s.urgentBlock]}>
                    <Clock3 color={urgent ? ORANGE : INK} size={14} strokeWidth={2.7} />
                    <View style={s.metaCopy}>
                      <Text style={s.metaKicker}>DEADLINE</Text>
                      <Text style={[s.metaText, urgent && s.urgentText]}>{daysLeft(item.expires_at)}</Text>
                    </View>
                  </View>
                </View>

                {item.crews?.name ? (
                  <View style={s.posterByRow}>
                    <Users color={INK} size={13} strokeWidth={2.6} />
                    <Text style={s.posterByText}>POSTED BY {item.crews.name.toUpperCase()}</Text>
                  </View>
                ) : item.is_official ? (
                  <View style={s.posterByRow}>
                    <Verified color={INK} size={13} strokeWidth={2.6} />
                    <Text style={s.posterByText}>OFFICIAL SKATEQUEST CHALLENGE</Text>
                  </View>
                ) : null}

                {item.description ? <Text style={s.desc}>{item.description}</Text> : null}

                <View style={s.actionRow}>
                  <View style={s.cameraCue}>
                    <Camera color={INK} size={17} strokeWidth={2.8} />
                    <View>
                      <Text style={s.cameraCueTitle}>LAND IT + FILM IT</Text>
                      <Text style={s.cameraCueText}>UPLOAD REAL PROOF</Text>
                    </View>
                  </View>
                  <View style={s.goButton}>
                    <Text style={s.goButtonText}>GO</Text>
                    <ChevronRight color={INK} size={17} strokeWidth={3} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={s.empty}>
                <View style={s.emptyIconWrap}>
                  <Target color={INK} size={31} strokeWidth={2.8} />
                </View>
                <Text style={s.emptyTitle}>
                  {bounties.length > 0 ? 'NO BOUNTIES AT THIS LEVEL' : 'THE WALL IS CLEAR'}
                </Text>
                <Text style={s.emptyText}>
                  {bounties.length > 0
                    ? 'Pick another difficulty to see the other live challenges.'
                    : 'Pull down to refresh. New live bounties appear here only when they are actually available.'}
                </Text>
                {bounties.length > 0 ? (
                  <TouchableOpacity style={s.refreshButton} onPress={() => setDifficultyFilter('all')}>
                    <Target color={INK} size={17} strokeWidth={3} />
                    <Text style={s.refreshButtonText}>SHOW ALL BOUNTIES</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.refreshButton} onPress={() => void loadBounties()}>
                    <RefreshCw color={INK} size={17} strokeWidth={3} />
                    <Text style={s.refreshButtonText}>REFRESH BOARD</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 300, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  heroOrangeSlash: { position: 'absolute', width: 310, height: 94, right: -105, top: 53, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  heroAcidSlash: { position: 'absolute', width: 220, height: 28, left: -70, bottom: 35, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  heroBlueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -60, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 61, height: 61, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  proofChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  proofChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.55, marginTop: 27 },
  title: { color: PAPER, fontSize: 51, lineHeight: 47, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  sub: { color: '#A4ABB6', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 8, maxWidth: 300 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.75, marginTop: 1 },

  filterWrap: { paddingHorizontal: 18, paddingTop: 27 },
  filterKicker: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterChip: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 999, backgroundColor: '#171A20', borderWidth: 1.5, borderColor: '#30343D' },
  filterChipActive: { backgroundColor: ACID, borderColor: INK },
  filterText: { color: '#89919D', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.65 },
  filterTextActive: { color: INK },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 23, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.85 },

  card: { marginHorizontal: 14, marginBottom: 14, backgroundColor: PAPER, borderRadius: 22, padding: 15, borderWidth: 2, borderColor: INK, position: 'relative', overflow: 'hidden' },
  featuredCard: { borderColor: ACID, borderWidth: 3 },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  cardTape: { position: 'absolute', right: -25, top: 17, minWidth: 105, height: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: INK, transform: [{ rotate: '12deg' }] },
  cardTapeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingRight: 66 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 },
  hotBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  hotBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  openBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 7, paddingVertical: 4 },
  officialBadgeText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  xpBadge: { width: 63, height: 63, borderRadius: 18, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  xpValue: { color: INK, fontSize: 18, lineHeight: 20, fontWeight: '900' },
  xpLabel: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  trick: { color: INK, fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1.2, marginTop: 15, paddingRight: 30 },

  metaGrid: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaBlock: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EAE5DB', borderRadius: 13, borderWidth: 1, borderColor: '#D2CABF', paddingHorizontal: 10 },
  urgentBlock: { backgroundColor: '#F6D7C9', borderColor: '#E9B49F' },
  metaCopy: { flex: 1 },
  metaKicker: { color: '#8B8C85', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  metaText: { color: INK, fontSize: 9, fontWeight: '900', marginTop: 2 },
  urgentText: { color: '#A44325' },
  posterByRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  posterByText: { color: '#777A74', fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  desc: { color: '#60655F', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#D7D0C5', marginTop: 15, paddingTop: 12 },
  cameraCue: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cameraCueTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  cameraCueText: { color: '#858780', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.65, marginTop: 1 },
  goButton: { minWidth: 72, minHeight: 45, borderRadius: 13, borderWidth: 2, borderColor: INK, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  goButtonText: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.8 },

  empty: { marginHorizontal: 14, marginTop: 20, minHeight: 230, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 47, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK, paddingHorizontal: 16, marginTop: 17 },
  refreshButtonText: { color: INK, fontWeight: '900', fontSize: 8, letterSpacing: 0.75 },
});
