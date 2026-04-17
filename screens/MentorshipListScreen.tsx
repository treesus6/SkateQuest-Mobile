import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Users } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { mentorshipService } from '../lib/mentorshipService';
import MentorshipCard from '../components/MentorshipCard';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

export default function MentorshipListScreen() {
  const { user } = useAuthStore();
  const [mentees, setMentees] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, _setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [menteesData, mentorsData, statsData] = await Promise.all([
        mentorshipService.getUserMentees(user.id),
        mentorshipService.getUserMentors(user.id),
        mentorshipService.getMentorshipStats(user.id),
      ]);
      setMentees(menteesData);
      setMentors(mentorsData);
      setStats(statsData);
    } catch (error) {
      Logger.error('Failed to load mentorship data', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </SafeAreaView>
    );
  }

  const allRelationships = [
    ...mentees.map(m => ({ ...m, role: 'mentor' })),
    ...mentors.map(m => ({ ...m, role: 'mentee' })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Users size={28} color="white" fill="white" strokeWidth={1.5} />
          <Text className="text-2xl font-bold text-white">Mentorship</Text>
        </View>
        <Text className="text-white/90 text-sm">Learn from & teach the community</Text>
      </View>

      <FlatList
        data={allRelationships}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="px-4 mb-3">
            <MentorshipCard
              mentorName={item.role === 'mentor' ? 'You' : 'Mentor'}
              menteeName={item.role === 'mentee' ? 'You' : 'Learner'}
              isMentor={item.role === 'mentor'}
              status={item.status}
              startedAt={item.started_at}
              progressNotes={item.progress_notes}
            />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData()} />}
        ListHeaderComponent={
          stats && (stats.mentees_count > 0 || stats.mentors_count > 0) ? (
            <View className="px-4 mb-4 gap-2 flex-row">
              {stats.mentees_count > 0 && (
                <Card className="flex-1">
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-brand-terracotta">
                      {stats.mentees_count}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Mentees</Text>
                  </View>
                </Card>
              )}
              {stats.mentors_count > 0 && (
                <Card className="flex-1">
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-brand-terracotta">
                      {stats.mentors_count}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">Mentors</Text>
                  </View>
                </Card>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="px-4 mt-8 items-center">
            <Card>
              <View className="items-center py-8">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No mentorships yet
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Become a mentor or find a mentor to get started
                </Text>
              </View>
            </Card>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}
