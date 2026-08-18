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

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';

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

  const renderChallenge = ({ item, index }: { item: Challenge; index: number }) => (
    <AnimatedListItem index={index}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[s.card, index === 0 && s.featuredCard]}
        onPress={() => submitProof(item)}
      >
        <View style={s.cardTop}>
          <View style={[s.iconWrap, index === 0 && s.iconWrapHot]}>
            <Target color={ACCENT} size={24} strokeWidth={2.5} />
          </View>
          <View style={s.cardCopy}>
            <View style={s.tagRow}>
              {index === 0 ? (
                <View style={s.hotPill}>
                  <Flame color="#FFD37A" size={12} />
                  <Text style={s.hotText}>HOT CHALLENGE</Text>
                </View>
              ) : (
                <Text style={s.challengeTag}>ACTIVE CHALLENGE</Text>
              )}
            </View>
            <Text style={s.challengeTitle}>{item.title || item.trick}</Text>
            {item.description ? <Text style={s.description}>{item.description}</Text> : null}
          </View>
          <View style={s.xpBadge}>
            <Text style={s.xpValue}>+{item.xp_reward}</Text>
            <Text style={s.xpLabel}>XP</Text>
          </View>
        </View>

        <View style={s.proofRow}>
          <ShieldCheck color="#4ADE80" size={16} />
          <Text style={s.proofText}>Real video proof · Judge's Booth approval</Text>
        </View>

        <View style={s.actionRow}>
          <View style={s.cameraCue}>
            <Camera color={ACCENT} size={17} />
            <Text style={s.cameraText}>Film the make</Text>
          </View>
          <View style={s.goButton}>
            <Text style={s.goText}>SUBMIT PROOF</Text>
            <ChevronRight color="#fff" size={16} strokeWidth={3} />
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  if (loading) {
    return (
      <View style={s.loading}>
        <ShimmerSkeleton height={120} className="mb-3" />
        <ShimmerSkeleton height={160} className="mb-3" />
        <ShimmerSkeleton height={160} className="mb-3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={challengeList}
        renderItem={renderChallenge}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={refetch}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <View style={s.eyebrowRow}>
                <Flame color="#FF8C42" size={16} />
                <Text style={s.eyebrow}>PROVE IT ON CAMERA</Text>
              </View>
              <Text style={s.title}>Challenges</Text>
              <Text style={s.subtitle}>Land it, upload the clip, and let the community verification flow do the rest.</Text>

              <View style={s.statsRow}>
                <View style={s.statTile}>
                  <Target color={ACCENT} size={18} />
                  <Text style={s.statValue}>{challengeList.length}</Text>
                  <Text style={s.statLabel}>Active</Text>
                </View>
                <View style={s.statTile}>
                  <Zap color="#F7B955" size={18} />
                  <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                  <Text style={s.statLabel}>XP live</Text>
                </View>
                <View style={s.statTile}>
                  <Trophy color="#6FC3FF" size={18} />
                  <Text style={s.statValue}>Judge</Text>
                  <Text style={s.statLabel}>Verified</Text>
                </View>
              </View>
            </View>
            <RetryBanner error={error} onRetry={refetch} loading={loading} />
            {challengeList.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Live challenges</Text>
                  <Text style={s.sectionSub}>Choose one and go get the clip</Text>
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
  container: { flex: 1, backgroundColor: BG },
  loading: { flex: 1, backgroundColor: BG, padding: 16 },
  listContent: { paddingBottom: 44 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { color: '#FF8C42', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  subtitle: { color: '#8B95A5', fontSize: 14, lineHeight: 20, marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statTile: { flex: 1, backgroundColor: '#0D131D', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1C2635' },
  statValue: { color: '#F7F4EF', fontSize: 17, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#697587', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900' },
  sectionSub: { color: '#667085', fontSize: 11, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10261C', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#4ADE80', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  featuredCard: { borderColor: 'rgba(210,103,61,0.5)', backgroundColor: '#13151B' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  iconWrap: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(210,103,61,0.12)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.24)' },
  iconWrapHot: { backgroundColor: 'rgba(210,103,61,0.17)' },
  cardCopy: { flex: 1 },
  tagRow: { minHeight: 19, justifyContent: 'center' },
  challengeTag: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hotPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B2912', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  hotText: { color: '#FFD37A', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  challengeTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900', lineHeight: 23, marginTop: 3 },
  description: { color: '#8B95A5', fontSize: 13, lineHeight: 19, marginTop: 5 },
  xpBadge: { backgroundColor: 'rgba(210,103,61,0.14)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.34)', borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  xpValue: { color: ACCENT, fontSize: 14, fontWeight: '900' },
  xpLabel: { color: ACCENT, fontSize: 8, fontWeight: '800' },
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1D2734' },
  proofText: { color: '#8F9AAA', fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  cameraCue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cameraText: { color: '#D4DAE3', fontSize: 12, fontWeight: '700' },
  goButton: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  goText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});
