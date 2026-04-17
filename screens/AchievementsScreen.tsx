import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Trophy, Lock } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useAchievementStore } from '../stores/useAchievementStore';
import AchievementCard from '../components/AchievementCard';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import { Logger } from '../lib/logger';

export default function AchievementsScreen({ navigation }: any) {
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
    const unsubscribe = navigation.addListener('focus', () => {
      if (!user?.id) return;
      loadUserAchievements(user.id).catch(error => {
        Logger.error('Failed to load user achievements', error);
      });
    });

    return unsubscribe;
  }, [navigation, user?.id]);

  useEffect(() => {
    if (achievements.length === 0) {
      loadAchievements().catch(error => {
        Logger.error('Failed to load achievements', error);
      });
    }
  }, [loadAchievements]);

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

  // Group achievements by tier
  const achievementsByTier = achievements.reduce(
    (acc, achievement) => {
      const tier = achievement.tier || 1;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(achievement);
      return acc;
    },
    {} as { [key: number]: typeof achievements }
  );

  // Get unlocked achievement IDs for quick lookup
  const unlockedIds = new Set(
    userAchievements.filter(ua => ua.unlocked_at).map(ua => ua.achievement_id)
  );

  const TIER_NAMES = {
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Platinum',
    5: 'Ultimate',
  };

  const TIER_COLORS = {
    1: { bg: '#FFF3ED', icon: '#D2673D' },
    2: { bg: '#F3F0FF', icon: '#6B4CE6' },
    3: { bg: '#FFFBEB', icon: '#F59E0B' },
    4: { bg: '#F0F9FF', icon: '#0EA5E9' },
    5: { bg: '#F9F5FF', icon: '#A855F7' },
  };

  if (loading && achievements.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4">
        <View className="flex-row items-center gap-3 mb-2">
          <Trophy size={28} color="white" fill="white" strokeWidth={1.5} />
          <Text className="text-2xl font-bold text-white">Achievements</Text>
        </View>
        <Text className="text-white/90 text-sm">
          {unlockedCount} of {achievements.length} unlocked
        </Text>
      </View>

      {/* Progress bar */}
      <View className="px-4 mb-4">
        <View className="h-3 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
          <View
            className="h-full bg-gradient-to-r from-brand-terracotta to-brand-purple"
            style={{
              width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%`,
            }}
          />
        </View>
      </View>

      {/* Achievements list by tier */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {Object.keys(achievementsByTier)
          .map(Number)
          .sort((a, b) => a - b)
          .map(tier => {
            const tierColor = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS[1];
            const tierAchievements = achievementsByTier[tier] || [];

            return (
              <View key={tier} className="mb-6">
                {/* Tier header */}
                <View className="flex-row items-center gap-2 mb-3">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: tierColor.bg }}
                  >
                    <Trophy
                      size={16}
                      color={tierColor.icon}
                      fill={tierColor.icon}
                      strokeWidth={1.5}
                    />
                  </View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    {TIER_NAMES[tier as keyof typeof TIER_NAMES]}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    ({tierAchievements.filter(a => unlockedIds.has(a.id)).length}/
                    {tierAchievements.length})
                  </Text>
                </View>

                {/* Tier achievements */}
                <View className="gap-2">
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

        {achievements.length === 0 && (
          <View className="items-center py-12">
            <Lock size={48} color="#999" strokeWidth={1} />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
              No achievements yet
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Achievement unlock modal */}
      <AchievementUnlockModal
        visible={showUnlockModal}
        achievement={recentUnlock}
        onClose={hideUnlockModal}
      />
    </SafeAreaView>
  );
}
