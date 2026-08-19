import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Users, GraduationCap, HandHelping, UserRoundCheck } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { mentorshipService } from '../lib/mentorshipService';
import MentorshipCard from '../components/MentorshipCard';
import { Logger } from '../lib/logger';

export default function MentorshipListScreen() {
  const { user } = useAuthStore();
  const [mentees, setMentees] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
      </SafeAreaView>
    );
  }

  const allRelationships = [
    ...mentees.map(m => ({ ...m, role: 'mentor' })),
    ...mentors.map(m => ({ ...m, role: 'mentee' })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-4 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">PASS IT FORWARD</Text>
        <View className="flex-row items-center gap-2 mt-1">
          <Users size={22} color="#D2673D" />
          <Text className="text-white text-[30px] font-black">Mentorship</Text>
        </View>
        <Text className="text-[#7B8493] text-sm mt-1">Learn from experienced skaters and help the next person progress.</Text>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <GraduationCap size={16} color="#C084FC" />
            <Text className="text-white text-xl font-black mt-1">{stats?.mentors_count ?? mentors.length}</Text>
            <Text className="text-[#697383] text-[11px]">mentors</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <HandHelping size={16} color="#38BDF8" />
            <Text className="text-white text-xl font-black mt-1">{stats?.mentees_count ?? mentees.length}</Text>
            <Text className="text-[#697383] text-[11px]">mentees</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <UserRoundCheck size={16} color="#4ADE80" />
            <Text className="text-white text-xl font-black mt-1">{allRelationships.length}</Text>
            <Text className="text-[#697383] text-[11px]">connections</Text>
          </View>
        </View>
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
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
              <Users size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">No mentorships yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">When you connect as a mentor or learner, the relationship will show here.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </SafeAreaView>
  );
}
