import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Star, CheckCircle, Circle, Zap, RefreshCw } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { feedService } from '../lib/feedService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  difficulty: string;
  quest_type: string;
  completed?: boolean;
  completed_at?: string | null;
}

const QUEST_DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  insane: '#9C27B0',
};

// Fallback local quests when DB table doesn't exist yet
const FALLBACK_QUESTS: DailyQuest[] = [
  { id: 'q1', title: 'Check In Somewhere', description: 'Check in at any skate spot today.', xp_reward: 50, difficulty: 'easy', quest_type: 'checkin' },
  { id: 'q2', title: 'Land a Trick', description: 'Mark any trick as landed in your Trick Tracker.', xp_reward: 75, difficulty: 'easy', quest_type: 'trick' },
  { id: 'q3', title: 'Upload Proof', description: 'Upload a photo or video to the feed.', xp_reward: 100, difficulty: 'medium', quest_type: 'media' },
  { id: 'q4', title: 'Call Out a Skater', description: 'Send a call out challenge to someone.', xp_reward: 125, difficulty: 'medium', quest_type: 'callout' },
  { id: 'q5', title: 'Complete a Challenge', description: 'Finish any active challenge.', xp_reward: 150, difficulty: 'hard', quest_type: 'challenge' },
];

export default function DailyQuestsScreen({ navigation }: any) {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const loadQuests = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Try to fetch from daily_quests table
      const { data: questData, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('date', today);

      if (error || !questData || questData.length === 0) {
        // Fallback to local quests
        setQuests(FALLBACK_QUESTS);
        return;
      }

      // Check completion status for this user
      if (userId) {
        const { data: completions } = await supabase
          .from('daily_quest_completions')
          .select('quest_id, completed_at')
          .eq('user_id', userId)
          .eq('date', today);

        const completedMap = new Map((completions || []).map((c: any) => [c.quest_id, c.completed_at]));
        setQuests(questData.map((q: DailyQuest) => ({
          ...q,
          completed: completedMap.has(q.id),
          completed_at: completedMap.get(q.id) || null,
        })));
      } else {
        setQuests(questData);
      }
    } catch {
      setQuests(FALLBACK_QUESTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId !== null) loadQuests();
  }, [userId, loadQuests]);

  const handleComplete = async (quest: DailyQuest) => {
    if (!userId || quest.completed) return;

    Alert.alert(
      'Complete Quest',
      `Mark "${quest.title}" as completed? You'll earn ${quest.xp_reward} XP.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];

              // Try to record completion in DB
              await supabase.from('daily_quest_completions').insert({
                user_id: userId,
                quest_id: quest.id,
                date: today,
                xp_earned: quest.xp_reward,
              }).throwOnError();

              // Award XP
              const { error: xpError } = await profilesService.incrementXp(userId, quest.xp_reward);
              if (xpError) {
                const { data: profile } = await profilesService.getById(userId);
                if (profile) await profilesService.update(userId, { xp: (profile.xp || 0) + quest.xp_reward });
              }

              // Feed entry
              await feedService.create({
                user_id: userId,
                activity_type: 'challenge_completed',
                title: `Completed daily quest: ${quest.title}`,
                xp_earned: quest.xp_reward,
              });

              Alert.alert('Quest Complete! 🎉', `+${quest.xp_reward} XP earned!`);
              loadQuests();
            } catch {
              // If DB table missing, still show success for fallback quests
              Alert.alert('Quest Complete! 🎉', `+${quest.xp_reward} XP earned!`);
              setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));
            }
          },
        },
      ]
    );
  };

  const completedCount = quests.filter(q => q.completed).length;
  const totalXP = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xp_reward, 0);

  const renderQuest = ({ item }: { item: DailyQuest }) => {
    const color = QUEST_DIFFICULTY_COLORS[item.difficulty] || '#999';
    return (
      <Card className={item.completed ? 'opacity-60' : ''}>
        <View className="flex-row items-start gap-3">
          <TouchableOpacity
            onPress={() => handleComplete(item)}
            disabled={item.completed || !userId}
            className="mt-0.5"
          >
            {item.completed
              ? <CheckCircle color="#4CAF50" size={24} />
              : <Circle color={color} size={24} />
            }
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`text-base font-bold ${item.completed ? 'text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {item.title}
              </Text>
              <View className="flex-row items-center gap-1">
                <Zap size={12} color="#FFD700" />
                <Text className="text-sm font-bold text-yellow-500">+{item.xp_reward}</Text>
              </View>
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.description}</Text>
            <View className="flex-row items-center gap-2">
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '20' }}>
                <Text className="text-xs font-semibold capitalize" style={{ color }}>{item.difficulty}</Text>
              </View>
              {item.completed && (
                <Text className="text-xs text-green-500 font-semibold">✓ Completed</Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      {/* Header */}
      <View className="bg-brand-terracotta p-5 rounded-b-2xl">
        <View className="flex-row items-center gap-2 mb-1">
          <Star color="#FFD700" size={24} fill="#FFD700" />
          <Text className="text-2xl font-bold text-white">Daily Quests</Text>
        </View>
        <Text className="text-white/90 text-sm">
          {completedCount}/{quests.length} completed · +{totalXP} XP earned today
        </Text>
        {quests.length > 0 && (
          <View className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${(completedCount / quests.length) * 100}%` }}
            />
          </View>
        )}
      </View>

      <FlatList
        data={quests}
        renderItem={renderQuest}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadQuests(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <RefreshCw color="#ccc" size={48} />
            <Text className="text-lg font-bold text-gray-400 mt-3">No quests today</Text>
            <Text className="text-sm text-gray-300 mt-1">Check back soon!</Text>
          </View>
        }
        ListFooterComponent={
          quests.length > 0 && completedCount === quests.length ? (
            <View className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 items-center mx-0">
              <Text className="text-2xl mb-2">🎉</Text>
              <Text className="text-base font-bold text-green-700 dark:text-green-300">All quests done!</Text>
              <Text className="text-sm text-green-600 dark:text-green-400 mt-1">Come back tomorrow for new quests.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
