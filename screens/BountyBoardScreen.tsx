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
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';

interface Bounty {
  id: string;
  trick_name: string;
  park_name: string;
  description: string;
  xp_reward: number;
  status: string;
  expires_at: string;
  created_at: string;
  crews: { name: string } | null;
}

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';
const MUTED = '#8B95A5';

export default function BountyBoardScreen() {
  const navigation = useNavigation<any>();
  const [bounties, setBounties] = useState<Bounty[]>([]);
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
    const { data } = await supabase
      .from('bounties')
      .select('*, crews(name)')
      .eq('status', 'open')
      .order('xp_reward', { ascending: false });
    setBounties((data || []) as Bounty[]);
    setLoading(false);
    setRefreshing(false);
  };

  const totalXp = useMemo(
    () => bounties.reduce((sum, bounty) => sum + (bounty.xp_reward || 0), 0),
    [bounties]
  );

  const daysLeft = (expires: string) => {
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  const isUrgent = (expires: string) => {
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
    <SafeAreaView style={s.container}>
      <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: slide }] }}>
        <FlatList
          data={bounties}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadBounties();
              }}
              tintColor={ACCENT}
            />
          }
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <>
              <View style={s.hero}>
                <View style={s.eyebrowRow}>
                  <Flame color="#FF8C42" size={16} strokeWidth={2.5} />
                  <Text style={s.eyebrow}>LIVE TRICK BOUNTIES</Text>
                </View>
                <Text style={s.title}>Bounty Board</Text>
                <Text style={s.sub}>
                  Pick a real challenge, land it on camera, and send the clip in for the XP.
                </Text>
                <View style={s.statsRow}>
                  <View style={s.statCard}>
                    <Target color={ACCENT} size={19} />
                    <Text style={s.statValue}>{bounties.length}</Text>
                    <Text style={s.statLabel}>Open</Text>
                  </View>
                  <View style={s.statCard}>
                    <Trophy color="#F7B955" size={19} />
                    <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                    <Text style={s.statLabel}>XP live</Text>
                  </View>
                  <View style={s.statCard}>
                    <Camera color="#6FC3FF" size={19} />
                    <Text style={s.statValue}>Clip</Text>
                    <Text style={s.statLabel}>Proof</Text>
                  </View>
                </View>
              </View>
              {bounties.length > 0 ? (
                <View style={s.sectionHeader}>
                  <View>
                    <Text style={s.sectionTitle}>Available now</Text>
                    <Text style={s.sectionSub}>Highest XP first</Text>
                  </View>
                  <View style={s.livePill}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>LIVE</Text>
                  </View>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item, index }) => {
            const urgent = isUrgent(item.expires_at);
            return (
              <TouchableOpacity
                activeOpacity={0.88}
                style={[s.card, index === 0 && s.featuredCard]}
                onPress={() => claimBounty(item)}
              >
                <View style={s.cardTop}>
                  {index === 0 ? (
                    <View style={s.hotBadge}>
                      <Sparkles color="#FFD37A" size={13} />
                      <Text style={s.hotBadgeText}>TOP BOUNTY</Text>
                    </View>
                  ) : (
                    <View style={s.openBadge}>
                      <Text style={s.openBadgeText}>OPEN</Text>
                    </View>
                  )}
                  <View style={s.xpBadge}>
                    <Text style={s.xpValue}>+{item.xp_reward}</Text>
                    <Text style={s.xpLabel}>XP</Text>
                  </View>
                </View>
                <Text style={s.trick}>{item.trick_name}</Text>
                <View style={s.metaStack}>
                  {item.park_name ? (
                    <View style={s.metaRow}>
                      <MapPin color="#A7B0BE" size={15} />
                      <Text style={s.metaText}>{item.park_name}</Text>
                    </View>
                  ) : null}
                  <View style={s.metaRow}>
                    <Clock3 color={urgent ? '#FF8C42' : '#A7B0BE'} size={15} />
                    <Text style={[s.metaText, urgent && s.urgentText]}>{daysLeft(item.expires_at)}</Text>
                  </View>
                  {item.crews?.name ? (
                    <View style={s.metaRow}>
                      <Users color="#A7B0BE" size={15} />
                      <Text style={s.metaText}>Posted by {item.crews.name}</Text>
                    </View>
                  ) : null}
                </View>
                {item.description ? <Text style={s.desc}>{item.description}</Text> : null}
                <View style={s.actionRow}>
                  <View style={s.cameraCue}>
                    <Camera color={ACCENT} size={17} />
                    <Text style={s.cameraCueText}>Land it + upload proof</Text>
                  </View>
                  <View style={s.goButton}>
                    <Text style={s.goButtonText}>GO</Text>
                    <ChevronRight color="#fff" size={17} strokeWidth={3} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={s.empty}>
                <View style={s.emptyIconWrap}>
                  <Target color={ACCENT} size={32} />
                </View>
                <Text style={s.emptyTitle}>No open bounties right now</Text>
                <Text style={s.emptyText}>
                  Pull down to refresh. New live bounties will appear here when they are actually available.
                </Text>
                <TouchableOpacity style={s.refreshButton} onPress={() => void loadBounties()}>
                  <RefreshCw color="#fff" size={17} />
                  <Text style={s.refreshButtonText}>Refresh board</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 42 },
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { color: '#FF8C42', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  sub: { color: MUTED, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 360 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statCard: { flex: 1, backgroundColor: '#0D131D', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1C2635' },
  statValue: { color: '#F7F4EF', fontSize: 17, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#697587', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900' },
  sectionSub: { color: '#667085', fontSize: 11, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10261C', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#4ADE80', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  featuredCard: { borderColor: 'rgba(210,103,61,0.55)', backgroundColor: '#13151B' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B2912', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  hotBadgeText: { color: '#FFD37A', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  openBadge: { backgroundColor: '#182332', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  openBadgeText: { color: '#9FB0C5', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  xpBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 3, backgroundColor: 'rgba(210,103,61,0.14)', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(210,103,61,0.35)' },
  xpValue: { color: ACCENT, fontSize: 18, fontWeight: '900' },
  xpLabel: { color: ACCENT, fontSize: 9, fontWeight: '800' },
  trick: { color: '#F7F4EF', fontSize: 24, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5, marginTop: 15 },
  metaStack: { gap: 7, marginTop: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: '#A7B0BE', fontSize: 12, fontWeight: '600' },
  urgentText: { color: '#FF8C42' },
  desc: { color: '#7F8A9A', fontSize: 13, lineHeight: 19, marginTop: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1D2734' },
  cameraCue: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  cameraCueText: { color: '#D7DCE3', fontSize: 12, fontWeight: '700' },
  goButton: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: ACCENT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  goButtonText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 65 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.24)' },
  emptyTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900', marginTop: 16 },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  refreshButton: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginTop: 18 },
  refreshButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
