import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, ChevronRight, Flame, ShieldCheck, Target, Trophy, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { challengesService } from '../lib/challengesService';
import { Challenge } from '../types';
import { AnimatedListItem, ShimmerSkeleton } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import RetryBanner from '../components/RetryBanner';
import { Haptics } from '../lib/haptics';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function ChallengesScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const {
    data: challenges,
    loading,
    error,
    refetch,
  } = useSupabaseQuery<Challenge[]>(() => challengesService.getActive(user?.id), [user?.id], {
    cacheKey: `challenges-active:${user?.id ?? 'public'}`,
  });

  const challengeList = challenges ?? [];
  const totalXp = useMemo(
    () => challengeList.reduce((sum, challenge) => sum + (challenge.xp_reward || 0), 0),
    [challengeList]
  );

  const submitProof = (challenge: Challenge) => {
    if (!user?.id) return;
    Haptics.medium();
    navigation.navigate('UploadMedia', {
      challengeId: challenge.id,
      initialTrickName: challenge.trick || challenge.title || '',
    });
  };

  const renderChallenge = ({ item, index }: { item: Challenge; index: number }) => {
    const featured = index === 0;
    const accent = featured ? ACID : index % 3 === 1 ? BLUE : ORANGE;

    return (
      <AnimatedListItem index={index}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[s.card, featured && s.featuredCard, index % 2 === 1 && s.cardTilt]}
          onPress={() => submitProof(item)}
        >
          <View style={[s.cardStripe, { backgroundColor: accent }]} />
          <View style={s.cardTop}>
            <View style={[s.challengeNumber, { backgroundColor: accent }]}>
              <Text style={s.challengeNumberText}>{String(index + 1).padStart(2, '0')}</Text>
            </View>

            <View style={s.cardCopy}>
              <View style={s.tagRow}>
                {featured ? (
                  <View style={s.hotPill}>
                    <Flame color={INK} size={11} strokeWidth={3} />
                    <Text style={s.hotText}>HOT MISSION</Text>
                  </View>
                ) : (
                  <View style={s.activePill}>
                    <Target color={INK} size={11} strokeWidth={3} />
                    <Text style={s.activeText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={s.challengeTitle}>{item.title || item.trick}</Text>
            </View>

            <View style={s.xpBadge}>
              <Text style={s.xpValue}>+{item.xp_reward}</Text>
              <Text style={s.xpLabel}>XP</Text>
            </View>
          </View>

          {item.description ? <Text style={s.description}>{item.description}</Text> : null}

          <View style={s.proofTicket}>
            <ShieldCheck color={INK} size={18} strokeWidth={2.8} />
            <View style={s.proofCopy}>
              <Text style={s.proofTitle}>REAL PROOF REQUIRED</Text>
              <Text style={s.proofText}>Video upload → Judge&apos;s Booth verification</Text>
            </View>
          </View>

          <View style={s.actionRow}>
            <View style={s.cameraCue}>
              <Camera color={INK} size={17} strokeWidth={2.8} />
              <View>
                <Text style={s.cameraTitle}>FILM THE MAKE</Text>
                <Text style={s.cameraText}>NO MOCK SUBMISSIONS</Text>
              </View>
            </View>
            <View style={[s.goButton, { backgroundColor: accent }]}>
              <Text style={s.goText}>SUBMIT</Text>
              <ChevronRight color={INK} size={16} strokeWidth={3} />
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedListItem>
    );
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <View style={s.loadingHero}>
          <View style={s.loadingStamp}><Target color={INK} size={27} strokeWidth={2.8} /></View>
          <Text style={s.loadingKicker}>LOADING LIVE MISSIONS</Text>
        </View>
        <View style={s.loadingCards}>
          <ShimmerSkeleton height={150} className="mb-3" />
          <ShimmerSkeleton height={150} className="mb-3" />
          <ShimmerSkeleton height={150} className="mb-3" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={challengeList}
        renderItem={renderChallenge}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.orangeSlash} />
              <View style={s.acidSlash} />
              <View style={s.blueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Target color={INK} size={29} strokeWidth={2.8} />
                </View>
                <View style={s.cameraChip}>
                  <Camera color={INK} size={12} strokeWidth={3} />
                  <Text style={s.cameraChipText}>PROVE IT</Text>
                </View>
              </View>

              <Text style={s.eyebrow}>LAND IT • FILM IT • VERIFY IT</Text>
              <Text style={s.title}>CHALLENGES.</Text>
              <Text style={s.subtitle}>
                Pick a live mission, land the trick, upload the real clip, and let the verification flow do the rest.
              </Text>
            </View>

            <View style={s.statsTicket}>
              <View style={s.statCell}>
                <Target color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{challengeList.length}</Text>
                <Text style={s.statLabel}>ACTIVE</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Zap color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                <Text style={s.statLabel}>XP LIVE</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Trophy color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>JUDGE</Text>
                <Text style={s.statLabel}>VERIFIED</Text>
              </View>
            </View>

            <View style={s.retryWrap}>
              <RetryBanner error={error} onRetry={refetch} loading={loading} />
            </View>

            {challengeList.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>LIVE MISSIONS</Text>
                  <Text style={s.sectionSub}>CHOOSE ONE • GO GET THE CLIP</Text>
                </View>
                <View style={s.livePill}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>LIVE</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={<EmptyStates.NoChallengesActive />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK },
  loadingHero: { minHeight: 170, justifyContent: 'flex-end', padding: 20 },
  loadingStamp: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  loadingKicker: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginTop: 13 },
  loadingCards: { paddingHorizontal: 16 },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 282, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 300, height: 92, right: -105, top: 50, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 32, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: 10, bottom: -56, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  cameraChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  cameraChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 27 },
  title: { color: PAPER, fontSize: 49, lineHeight: 50, fontWeight: '900', letterSpacing: -2.8, marginTop: 2 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.75, marginTop: 1 },
  retryWrap: { marginTop: 10 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },

  card: { marginHorizontal: 14, marginBottom: 13, backgroundColor: PAPER, borderRadius: 22, padding: 15, borderWidth: 2, borderColor: INK, overflow: 'hidden', position: 'relative' },
  featuredCard: { borderColor: ACID, borderWidth: 3 },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  cardStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 3 },
  challengeNumber: { width: 43, height: 43, borderRadius: 13, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  challengeNumberText: { color: INK, fontSize: 11, fontWeight: '900' },
  cardCopy: { flex: 1 },
  tagRow: { minHeight: 21, justifyContent: 'center' },
  hotPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  hotText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },
  activePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  activeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },
  challengeTitle: { color: INK, fontSize: 20, lineHeight: 23, fontWeight: '900', letterSpacing: -0.7, marginTop: 3 },
  xpBadge: { width: 56, height: 56, borderRadius: 16, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  xpValue: { color: INK, fontSize: 15, lineHeight: 17, fontWeight: '900' },
  xpLabel: { color: INK, fontSize: 7, fontWeight: '900' },
  description: { color: '#61665F', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 13 },
  proofTicket: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 14, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 11, marginTop: 13 },
  proofCopy: { flex: 1 },
  proofTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  proofText: { color: '#626726', fontSize: 8.5, fontWeight: '800', marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#D7D0C5', marginTop: 13, paddingTop: 12 },
  cameraCue: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  cameraTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  cameraText: { color: '#858780', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55, marginTop: 1 },
  goButton: { minWidth: 92, minHeight: 44, borderRadius: 13, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 10 },
  goText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
});
