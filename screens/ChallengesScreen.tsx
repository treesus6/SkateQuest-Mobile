import React from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { Target } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { challengesService } from '../lib/challengesService';
import { profilesService } from '../lib/profilesService';
import { Challenge } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnimatedListItem, ScreenFadeIn, ShimmerSkeleton } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import RetryBanner from '../components/RetryBanner';
import { Haptics } from '../lib/haptics';

export default function ChallengesScreen() {
  const { user } = useAuthStore();
  const { data: challenges, loading, error, refetch } = useSupabaseQuery<Challenge[]>(
    () => challengesService.getActive(),
    [],
    { cacheKey: 'challenges-active' }
  );

  const completeChallenge = async (challenge: Challenge) => {
    if (!user) return;

    Haptics.medium();
    Alert.alert(
      'Complete Challenge',
      `Complete "${challenge.title || challenge.trick}"?\nYou'll earn ${challenge.xp_reward} XP!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const { error: challengeError } = await challengesService.complete(challenge.id, user.id);
              if (challengeError) throw challengeError;

              const { data: userData } = await profilesService.getById(user.id);
              if (userData) {
                const updatedChallenges = [...(userData.challenges_completed || []), challenge.id];
                await profilesService.update(user.id, {
                  xp: (userData.xp || 0) + challenge.xp_reward,
                  challenges_completed: updatedChallenges,
                });
              }

              Haptics.success();
              Alert.alert('Success', `You earned ${challenge.xp_reward} XP!`);
              refetch();
            } catch (error: any) {
              Haptics.error();
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderChallenge = ({ item, index }: { item: Challenge; index: number }) => (
    <AnimatedListItem index={index}>
      <Card>
        <View className="flex-row items-start gap-3">
          <Target color="#d2673d" size={22} />
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {item.title || item.trick}
            </Text>
            {item.description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row justify-between items-center mt-3">
          <Text className="text-base font-bold text-brand-terracotta">+{item.xp_reward} XP</Text>
          <Button title="Complete" onPress={() => completeChallenge(item)} variant="primary" size="sm" className="bg-brand-green" />
        </View>
      </Card>
    </AnimatedListItem>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
        <ShimmerSkeleton height={60} className="mb-3" />
        <ShimmerSkeleton height={80} className="mb-3" />
        <ShimmerSkeleton height={80} className="mb-3" />
        <ShimmerSkeleton height={80} className="mb-3" />
      </View>
    );
  }

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-brand-beige dark:bg-gray-900">
        <View className="bg-brand-terracotta p-5 rounded-b-2xl">
          <Text className="text-2xl font-bold text-white text-center">Challenges</Text>
          <Text className="text-sm text-white/90 text-center mt-1">Complete challenges to earn XP</Text>
        </View>
        <RetryBanner error={error} onRetry={refetch} loading={loading} />
        <FlatList
          data={challenges ?? []}
          renderItem={renderChallenge}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyStates.NoChallengesActive />}
        />
      </View>
    </ScreenFadeIn>
  );
}
