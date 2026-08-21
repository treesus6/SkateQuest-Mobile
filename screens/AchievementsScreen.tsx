import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Lock, Sparkles, Trophy, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/useAuthStore';
import { useAchievementStore } from '../stores/useAchievementStore';
import AchievementCard from '../components/AchievementCard';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import { Logger } from '../lib/logger';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function AchievementsScreen() {
  const { user } = useAuthStore();
  const {
    achievements,
    userAchievements,
    unlockedCount,
    loading,
    showUnlockModal,
    recentUnlock,
    loadAchievements,
    loadUserAchievements,
    hideUnlockModal,
  } = useAchievementStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadUserAchievements(user.id).catch(error => {
      Logger.error('Failed to load user achievements', error);
    });
  }, [user?.id, loadUserAchievements]);

  useEffect(() => {
    if (achievements.length === 0) {
      loadAchievements().catch(error => {
        Logger.error('Failed to load achievements', error);
      });
    }
  }, [achievements.length, loadAchievements]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([loadAchievements(), loadUserAchievements(user.id)]);
    } catch (error) {
      Logger.error('Failed to refresh achievements', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, loadAchievements, loadUserAchievements]);

  const achievementsByTier = achievements.reduce(
    (acc, achievement) => {
      const tier = achievement.tier || 1;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(achievement);
      return acc;
    },
    {} as { [key: number]: typeof achievements }
  );

  const unlockedIds = new Set(
    userAchievements.filter(ua => ua.unlocked_at).map(ua => ua.achievement_id)
  );

  const completionPercent = achievements.length > 0
    ? Math.round((unlockedCount / achievements.length) * 100)
    : 0;
  const remaining = Math.max(achievements.length - unlockedCount, 0);
  const tierCount = useMemo(() => Object.keys(achievementsByTier).length, [achievementsByTier]);

  const TIER_NAMES = {
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Platinum',
    5: 'Ultimate',
  };

  const TIER_COLORS = {
    1: ORANGE,
    2: '#8B7CF6',
    3: '#F7B955',
    4: '#5CC8FF',
    5: '#C084FC',
  };

  if (loading && achievements.length === 0) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <View style={s.loadingStamp}><Trophy color={INK} size={30} strokeWidth={2.7} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>OPENING YOUR TROPHY WALL</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ORANGE} />
        }
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />

          <View style={s.heroTopRow}>
            <View style={s.heroStamp}>
              <Trophy color={INK} size={29} fill={INK} strokeWidth={1.5} />
            </View>
            <View style={s.progressChip}>
              <Sparkles color={INK} size={12} strokeWidth={3} />
              <Text style={s.progressChipText}>PROGRESSION</Text>
            </View>
          </View>

          <Text style={s.eyebrow}>WHAT YOU ACTUALLY EARNED</Text>
          <Text style={s.title}>ACHIEVE{`\n`}MENTS.</Text>
          <Text style={s.subtitle}>
            Proof that you have been skating, exploring, landing tricks, and showing up.
          </Text>
        </View>

        <View style={s.progressTicket}>
          <View style={s.progressTop}>
            <View>
              <Text style={s.progressLabel}>TROPHY WALL COMPLETE</Text>
              <Text style={s.progressValue}>{completionPercent}%</Text>
            </View>
            <View style={s.countStamp}>
              <Text style={s.countBig}>{unlockedCount}</Text>
              <Text style={s.countSmall}>OF {achievements.length}</Text>
            </View>
          </View>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${completionPercent}%` }]} />
          </View>

          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Trophy color={INK} size={16} strokeWidth={2.8} />
              <Text style={s.summaryText}>{tierCount} TIERS</Text>
            </View>
            <View style={s.summaryItem}>
              <Zap color={INK} size={16} strokeWidth={2.8} />
              <Text style={s.summaryText}>{remaining} LEFT TO CHASE</Text>
            </View>
          </View>
        </View>

        {Object.keys(achievementsByTier)
          .map(Number)
          .sort((a, b) => a - b)
          .map(tier => {
            const tierColor = TIER_COLORS[tier as keyof typeof TIER_COLORS] || ORANGE;
            const tierAchievements = achievementsByTier[tier] || [];
            const tierUnlocked = tierAchievements.filter(a => unlockedIds.has(a.id)).length;
            const tierPercent = tierAchievements.length
              ? Math.round((tierUnlocked / tierAchievements.length) * 100)
              : 0;

            return (
              <View key={tier} style={s.tierSection}>
                <View style={s.tierHeader}>
                  <View style={[s.tierBand, { backgroundColor: tierColor }]}>
                    <Trophy size={17} color={INK} fill={INK} strokeWidth={1.5} />
                    <Text style={s.tierBandText}>
                      {TIER_NAMES[tier as keyof typeof TIER_NAMES]?.toUpperCase() || `TIER ${tier}`}
                    </Text>
                  </View>
                  <View style={s.tierMetaWrap}>
                    <Text style={s.tierMeta}>{tierUnlocked}/{tierAchievements.length} UNLOCKED</Text>
                    <Text style={s.tierPercent}>{tierPercent}%</Text>
                  </View>
                </View>

                <View style={s.tierProgressTrack}>
                  <View style={[s.tierProgressFill, { width: `${tierPercent}%`, backgroundColor: tierColor }]} />
                </View>

                <View style={s.tierCards}>
                  {tierAchievements.map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={unlockedIds.has(achievement.id)}
                    />
                  ))}
                </View>
              </View>
            );
          })}

        {achievements.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Lock size={30} color={INK} strokeWidth={2.7} />
            </View>
            <Text style={s.emptyTitle}>NO TROPHIES DEFINED YET</Text>
            <Text style={s.emptyText}>
              Once real achievement definitions are live, your unlocks will show up here automatically.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <AchievementUnlockModal
        visible={showUnlockModal}
        achievement={recentUnlock}
        onClose={hideUnlockModal}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.35 },
  content: { paddingBottom: 118 },

  hero: { minHeight: 295, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 305, height: 94, right: -105, top: 55, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  progressChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  progressChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 27 },
  title: { color: PAPER, fontSize: 50, lineHeight: 46, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 300, marginTop: 8 },

  progressTicket: { marginHorizontal: 14, marginTop: -10, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, padding: 16, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  progressValue: { color: INK, fontSize: 34, lineHeight: 37, fontWeight: '900', letterSpacing: -1.4, marginTop: 3 },
  countStamp: { width: 64, height: 64, borderRadius: 18, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  countBig: { color: INK, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  countSmall: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  progressTrack: { height: 11, backgroundColor: '#D8D2C6', borderRadius: 999, overflow: 'hidden', marginTop: 14, borderWidth: 1, borderColor: '#C7BFB1' },
  progressFill: { height: '100%', backgroundColor: ACID, borderRightWidth: 2, borderColor: INK },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryText: { color: '#666A66', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },

  tierSection: { marginTop: 26, paddingHorizontal: 14 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  tierBand: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2, borderColor: INK, transform: [{ rotate: '-1deg' }] },
  tierBandText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  tierMetaWrap: { alignItems: 'flex-end' },
  tierMeta: { color: '#858D99', fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },
  tierPercent: { color: PAPER, fontSize: 15, fontWeight: '900', marginTop: 1 },
  tierProgressTrack: { height: 5, backgroundColor: '#252A32', borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  tierProgressFill: { height: '100%' },
  tierCards: { gap: 9 },

  empty: { marginHorizontal: 14, marginTop: 30, minHeight: 210, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 280 },
});
