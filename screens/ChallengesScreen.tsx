import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Challenge } from '../types';
import DailyChallenge from '../components/DailyChallenge';

type ChallengeFilter = 'ALL' | 'DAILY' | 'SPOT_SPECIFIC' | 'USER_ISSUED' | 'BOUNTY';

export default function ChallengesScreen() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChallengeFilter>('ALL');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadChallenges();
    loadStreak();
  }, [filter]);

  const loadStreak = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', user.id)
      .single();

    if (data) {
      setStreak(data.current_streak || 0);
    }
  };

  const loadChallenges = async () => {
    try {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      // Apply filter if not ALL
      if (filter !== 'ALL') {
        query = query.eq('challenge_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading challenges:', error);
      } else {
        setChallenges(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeChallenge = async (challenge: Challenge) => {
    if (!user) return;

    Alert.alert(
      'Complete Challenge',
      `Complete "${challenge.title || challenge.trick}"?\nYou'll earn ${challenge.xp_reward} XP!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              // Update challenge status
              const { error: challengeError } = await supabase
                .from('challenges')
                .update({
                  status: 'completed',
                  completed_by: user.id,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', challenge.id);

              if (challengeError) throw challengeError;

              // Update user XP
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('xp, challenges_completed')
                .eq('id', user.id)
                .single();

              if (userError) throw userError;

              const updatedChallenges = [...(userData.challenges_completed || []), challenge.id];

              await supabase
                .from('profiles')
                .update({
                  xp: (userData.xp || 0) + challenge.xp_reward,
                  challenges_completed: updatedChallenges,
                })
                .eq('id', user.id);

              Alert.alert('Success', `You earned ${challenge.xp_reward} XP!`);
              loadChallenges(); // Reload challenges
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderChallenge = ({ item }: { item: Challenge }) => (
    <View style={styles.challengeCard}>
      <Text style={styles.challengeTitle}>{item.title || item.trick}</Text>
      {item.description && <Text style={styles.challengeDescription}>{item.description}</Text>}
      <View style={styles.challengeFooter}>
        <Text style={styles.xpText}>+{item.xp_reward} XP</Text>
        <TouchableOpacity style={styles.completeButton} onPress={() => completeChallenge(item)}>
          <Text style={styles.completeButtonText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filterOptions: { key: ChallengeFilter; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All', icon: '📋' },
    { key: 'DAILY', label: 'Daily', icon: '🔥' },
    { key: 'SPOT_SPECIFIC', label: 'Spots', icon: '📍' },
    { key: 'USER_ISSUED', label: 'User', icon: '👤' },
    { key: 'BOUNTY', label: 'Bounty', icon: '💰' },
  ];

  return (
    <View style={styles.container}>
      {/* Streak Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Challenges</Text>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{streak}</Text>
          </View>
        )}
      </View>

      {/* Daily Challenge Card */}
      <DailyChallenge onComplete={loadChallenges} />

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[styles.filterButton, filter === option.key && styles.filterButtonActive]}
            onPress={() => setFilter(option.key)}
          >
            <Text style={styles.filterIcon}>{option.icon}</Text>
            <Text style={[styles.filterText, filter === option.key && styles.filterTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Challenge List */}
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadChallenges}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No challenges available</Text>
            <Text style={styles.emptySubtext}>Check back later or try a different filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: '#fff',
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#d2673d',
  },
  filterIcon: {
    fontSize: 14,
  },
  filterText: {
    fontSize: 13,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  xpText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d2673d',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
