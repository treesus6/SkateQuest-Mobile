import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { Target } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { challengesService } from '../lib/challengesService';
import { Challenge } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnimatedListItem, ScreenFadeIn, ShimmerSkeleton } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import RetryBanner from '../components/RetryBanner';
import { Haptics } from '../lib/haptics';
import { useNavigation } from '../lib/useNavigation';

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
      <Card>
        <View className="flex-row items-start gap-3">
          <Target color="#d2673d" size={22} />
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {item.title || item.trick}
            </Text>
            {item.description ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row justify-between items-center mt-3 gap-3">
          <View className="flex-1">
            <Text className="text-base font-bold text-brand-terracotta">+{item.xp_reward} XP</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload real video proof. XP pays after Judge's Booth approval.
            </Text>
          </View>
          <Button
            title="Submit Proof"
            onPress={() => submitProof(item)}
            variant="primary"
            size="sm"
            className="bg-brand-green"
          />
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
          <Text className="text-sm text-white/90 text-center mt-1">
            Land it, upload the clip, and let skaters judge the proof
          </Text>
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
