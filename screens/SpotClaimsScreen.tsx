import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';
import { Trophy, Crown, Flame, TrendingUp } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { spotClaimsService } from '../lib/spotClaimsService';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  claimed_spots: number;
  total_claim_strength: number;
  pro_athlete: boolean;
  pro_tier?: string;
}

interface UserSpot {
  claim_id: string;
  spot_id: string;
  spot_name: string;
  latitude: number;
  longitude: number;
  claimed_at: string;
  claim_strength: number;
}

export default function SpotClaimsScreen({ navigation: _navigation }: any) {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userClaims, setUserClaims] = useState<UserSpot[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [leaderboardData, userClaimsData] = await Promise.all([
        spotClaimsService.getClaimsLeaderboard(100),
        spotClaimsService.getUserClaimedSpots(user.id),
      ]);

      setLeaderboard(leaderboardData);
      setUserClaims(userClaimsData);

      // Find user's rank
      const userRankData = leaderboardData.find(entry => entry.user_id === user.id);
      setUserRank(userRankData || null);
    } catch (error) {
      Logger.error('Failed to load claims data', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();

    // Subscribe to leaderboard changes
    const subscription = spotClaimsService.subscribeToUserClaims(user?.id || '', () => {
      loadData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      Logger.error('Failed to refresh claims', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleChallenge = async (spotId: string) => {
    if (!user?.id) return;

    try {
      const result = await spotClaimsService.claimSpot(spotId, user.id);

      if (result.success) {
        Logger.info(
          `Successfully ${result.action === 'challenged' ? 'challenged' : 'claimed'} spot! XP: +${result.xp_reward}`
        );
        await loadData();
      }
    } catch (error) {
      Logger.error('Failed to challenge spot', error);
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'gold':
        return '#F59E0B';
      case 'platinum':
        return '#0EA5E9';
      case 'silver':
        return '#8B5CF6';
      default:
        return '#d2673d';
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isUser = item.user_id === user?.id;
    const medalColor =
      index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : undefined;

    return (
      <View
        key={item.rank}
        className={`flex-row items-center gap-3 px-4 py-3 ${
          isUser
            ? 'bg-brand-terracotta/10 border-l-4 border-brand-terracotta'
            : 'bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700'
        }`}
      >
        {/* Medal or rank */}
        {medalColor ? (
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: medalColor }}
          >
            <Trophy size={16} color="white" fill="white" strokeWidth={2} />
          </View>
        ) : (
          <Text className="w-8 text-center font-bold text-gray-600 dark:text-gray-400">
            #{item.rank}
          </Text>
        )}

        {/* User info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-base text-gray-900 dark:text-white">
              {item.display_name}
            </Text>
            {item.pro_athlete && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${getTierColor(item.pro_tier)}20` }}
              >
                <Text className="text-xs font-bold" style={{ color: getTierColor(item.pro_tier) }}>
                  PRO
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {item.claimed_spots} spot{item.claimed_spots !== 1 ? 's' : ''} • Strength:{' '}
            {item.total_claim_strength}
          </Text>
        </View>

        {/* Claim count badge */}
        <View className="bg-brand-terracotta/20 px-3 py-2 rounded-lg items-center">
          <Text className="text-sm font-bold text-brand-terracotta">{item.claimed_spots}</Text>
        </View>
      </View>
    );
  };

  if (loading && leaderboard.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Crown size={28} color="white" fill="white" strokeWidth={1.5} />
            <Text className="text-2xl font-bold text-white">King of the Hill</Text>
          </View>
          <Text className="text-white/90 text-sm">
            Challenge holders and claim spots as your territory
          </Text>
        </View>

        <View className="px-4">
          {/* User's rank section */}
          {userRank ? (
            <Card className="mb-4 border-l-4 border-brand-terracotta">
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white">
                    Your Ranking
                  </Text>
                  <View className="bg-brand-terracotta/20 px-3 py-1 rounded-full">
                    <Text className="text-sm font-bold text-brand-terracotta">
                      #{userRank.rank}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-4 pt-2">
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Claimed Spots
                    </Text>
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                      {userRank.claimed_spots}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Strength
                    </Text>
                    <Text className="text-2xl font-bold text-brand-terracotta">
                      {userRank.total_claim_strength}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          ) : (
            <Card className="mb-4">
              <View className="items-center gap-2 py-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  Not yet ranked
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Claim your first spot to join the leaderboard
                </Text>
              </View>
            </Card>
          )}

          {/* User's claims section */}
          {userClaims.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center gap-2 mb-3">
                <Flame size={20} color="#F59E0B" fill="#F59E0B" strokeWidth={1.5} />
                <Text className="text-lg font-bold text-gray-900 dark:text-white">Your Claims</Text>
              </View>

              <FlatList
                data={userClaims}
                keyExtractor={item => item.claim_id}
                renderItem={({ item }) => (
                  <Card className="mb-2">
                    <View className="gap-2">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="font-semibold text-base text-gray-900 dark:text-white">
                            {item.spot_name}
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Strength: {item.claim_strength}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleChallenge(item.spot_id)}
                          className="px-3 py-1 bg-brand-terracotta/20 rounded-full"
                        >
                          <Text className="text-xs font-semibold text-brand-terracotta">+XP</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                )}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Global leaderboard */}
          <View className="mb-4">
            <View className="flex-row items-center gap-2 mb-3">
              <TrendingUp size={20} color="#d2673d" strokeWidth={1.5} />
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Global Leaderboard
              </Text>
            </View>

            <Card className="p-0 overflow-hidden">
              <FlatList
                data={leaderboard.slice(0, 20)}
                keyExtractor={item => item.user_id}
                renderItem={renderLeaderboardItem}
                scrollEnabled={false}
              />
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
