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
import { Calendar, Calendar2, Flame } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSeasonalEventStore } from '../stores/useSeasonalEventStore';
import SeasonalProgressBar from '../components/SeasonalProgressBar';
import Card from './ui/Card';
import { Logger } from '../lib/logger';

export default function SeasonalEventsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    activeEvent,
    allEvents,
    userProgress,
    loading,
    loadActiveEvent,
    loadUserProgress,
    refreshUserProgress,
  } = useSeasonalEventStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!user?.id || !activeEvent) return;
      loadUserProgress(user.id, activeEvent.id).catch((error) => {
        Logger.error('Failed to load user progress', error);
      });
    });

    return unsubscribe;
  }, [navigation, user?.id, activeEvent?.id]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await refreshUserProgress(user.id);
    } catch (error) {
      Logger.error('Failed to refresh progress', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshUserProgress]);

  // Calculate days remaining in active event
  const getDaysRemaining = () => {
    if (!activeEvent) return 0;
    const endDate = new Date(activeEvent.end_date);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  if (loading && !activeEvent) {
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
        <View className="flex-row items-center gap-2 mb-2">
          <Calendar2 size={28} color="white" fill="white" strokeWidth={1.5} />
          <Text className="text-2xl font-bold text-white">Seasonal Events</Text>
        </View>
        <Text className="text-white/90 text-sm">
          Complete challenges and progress through themed seasons
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        {/* Active event section */}
        {activeEvent ? (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex-row items-center gap-2">
              <Flame size={20} color="#F59E0B" fill="#F59E0B" />
              Active Event
            </Text>

            <Card>
              <View className="gap-3">
                {/* Event title */}
                <View>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeEvent.name}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                    {activeEvent.season} {activeEvent.year}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-2">{activeEvent.description}</Text>
                </View>

                {/* Countdown */}
                <View className="bg-brand-terracotta/10 p-3 rounded-lg">
                  <View className="flex-row items-center gap-2">
                    <Calendar size={16} color="#d2673d" strokeWidth={2} />
                    <View className="flex-1">
                      <Text className="text-xs text-brand-terracotta font-semibold">
                        {daysRemaining} days remaining
                      </Text>
                      <Text className="text-xs text-brand-terracotta/70">
                        Ends{' '}
                        {new Date(activeEvent.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>

            {/* User progress for active event */}
            {userProgress ? (
              <View className="mt-4">
                <SeasonalProgressBar
                  currentTier={userProgress.current_tier}
                  maxTier={activeEvent.tier_count}
                  progressValue={userProgress.progress_value}
                />
              </View>
            ) : (
              <Card className="mt-4">
                <View className="gap-2 items-center">
                  <Text className="text-sm text-gray-600 dark:text-gray-300">
                    Start participating to begin progress tracking
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Complete challenges, visit spots, and earn XP this season
                  </Text>
                </View>
              </Card>
            )}
          </View>
        ) : (
          <Card className="mb-6">
            <View className="items-center py-6">
              <Calendar2 size={48} color="#999" strokeWidth={1} />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                No Active Event
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-2">
                Check back soon for the next seasonal challenge
              </Text>
            </View>
          </Card>
        )}

        {/* All events section */}
        {allEvents.length > 0 && (
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              All Events
            </Text>

            {allEvents.map((event) => {
              const progress = Array.isArray(allEvents)
                ? undefined
                : null;
              const isActive = activeEvent?.id === event.id;

              return (
                <Card key={event.id} className={isActive ? 'border-l-4 border-brand-terracotta' : ''}>
                  <View className="gap-2">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="font-bold text-base text-gray-900 dark:text-white">
                          {event.name}
                        </Text>
                        <Text className="text-xs text-gray-500 capitalize">
                          {event.season} {event.year}
                          {isActive && ' • Active'}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {event.tier_count} Tiers
                      </Text>
                    </View>

                    <Text className="text-sm text-gray-600 dark:text-gray-300">
                      {event.description}
                    </Text>

                    {/* Event dates */}
                    <View className="flex-row gap-2 text-xs text-gray-500">
                      <Text>
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text>—</Text>
                      <Text>
                        {new Date(event.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {allEvents.length === 0 && !activeEvent && (
          <Card>
            <View className="items-center py-8">
              <Text className="text-gray-600 dark:text-gray-300">No seasonal events available</Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
