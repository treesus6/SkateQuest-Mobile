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

const ACCENT = '#D2673D';
const BG = '#05070B';

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

  const completionPercent = achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0;
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
    1: { bg: '#2A1812', icon: '#D2673D' },
    2: { bg: '#201A35', icon: '#8B7CF6' },
    3: { bg: '#352A13', icon: '#F7B955' },
    4: { bg: '#102B38', icon: '#5CC8FF' },
    5: { bg: '#2B1836', icon: '#C084FC' },
  };

  if (loading && achievements.length === 0) {
    return (
      <SafeAreaView style={s.loading}>
        <ActivityIndicator size="large" color={ACCENT} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />}
        contentContainerStyle={s.content}
      >
        <View style={s.header}>
          <View style={s.eyebrowRow}>
            <Sparkles color="#FF8C42" size={16} />
            <Text style={s.eyebrow}>YOUR PROGRESSION</Text>
          </View>
          <Text style={s.title}>Achievements</Text>
          <Text style={s.subtitle}>Unlock proof that you have been out skating, exploring, landing tricks, and showing up.</Text>

          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <View>
                <Text style={s.progressLabel}>UNLOCKED</Text>
                <Text style={s.progressValue}>{unlockedCount} / {achievements.length}</Text>
              </View>
              <View style={s.percentPill}>
                <Text style={s.percentText}>{completionPercent}%</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${completionPercent}%` }]} />
            </View>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Trophy color="#F7B955" size={16} />
                <Text style={s.summaryText}>{tierCount} tiers</Text>
              </View>
              <View style={s.summaryItem}>
                <Zap color={ACCENT} size={16} />
                <Text style={s.summaryText}>{remaining} left to chase</Text>
              </View>
            </View>
          </View>
        </View>

        {Object.keys(achievementsByTier)
          .map(Number)
          .sort((a, b) => a - b)
          .map(tier => {
            const tierColor = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS[1];
            const tierAchievements = achievementsByTier[tier] || [];
            const tierUnlocked = tierAchievements.filter(a => unlockedIds.has(a.id)).length;

            return (
              <View key={tier} style={s.tierSection}>
                <View style={s.tierHeader}>
                  <View style={[s.tierIcon, { backgroundColor: tierColor.bg }]}>
                    <Trophy size={17} color={tierColor.icon} fill={tierColor.icon} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tierTitle}>{TIER_NAMES[tier as keyof typeof TIER_NAMES]}</Text>
                    <Text style={s.tierMeta}>{tierUnlocked}/{tierAchievements.length} unlocked</Text>
                  </View>
                  <View style={s.tierCountPill}>
                    <Text style={s.tierCountText}>{tierUnlocked}</Text>
                  </View>
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
              <Lock size={34} color={ACCENT} />
            </View>
            <Text style={s.emptyTitle}>No achievements yet</Text>
            <Text style={s.emptyText}>Once achievement definitions are live, your unlocks will show up here automatically.</Text>
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
  container: { flex: 1, backgroundColor: BG },
  loading: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 44 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { color: '#FF8C42', fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  subtitle: { color: '#8B95A5', fontSize: 14, lineHeight: 20, marginTop: 6 },
  progressCard: { marginTop: 18, backgroundColor: '#0D131D', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  progressValue: { color: '#F7F4EF', fontSize: 22, fontWeight: '900', marginTop: 3 },
  percentPill: { backgroundColor: 'rgba(210,103,61,0.14)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.34)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  percentText: { color: ACCENT, fontWeight: '900', fontSize: 13 },
  progressTrack: { height: 10, backgroundColor: '#202938', borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 999 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { color: '#8E99A9', fontSize: 11, fontWeight: '700' },
  tierSection: { marginTop: 16, paddingHorizontal: 16 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tierIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tierTitle: { color: '#F7F4EF', fontSize: 18, fontWeight: '900' },
  tierMeta: { color: '#687587', fontSize: 11, marginTop: 2 },
  tierCountPill: { backgroundColor: '#141C28', borderWidth: 1, borderColor: '#263246', borderRadius: 999, minWidth: 34, height: 28, alignItems: 'center', justifyContent: 'center' },
  tierCountText: { color: '#C8D0DB', fontSize: 11, fontWeight: '900' },
  tierCards: { gap: 8 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 60 },
  emptyIcon: { width: 66, height: 66, borderRadius: 21, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.25)' },
  emptyTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900', marginTop: 16 },
  emptyText: { color: '#8B95A5', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
});
