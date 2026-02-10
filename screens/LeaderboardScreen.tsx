import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { UserProfile } from '../types';
import { getLeaderboard } from '../services/leaderboard';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeSubscription([
    {
      channel: 'leaderboard-changes',
      table: 'profiles',
      onPayload: () => loadLeaderboard(),
    },
  ]);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaders(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeader = ({ item, index }: { item: UserProfile; index: number }) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

    return (
      <View style={[styles.leaderCard, rank <= 3 && styles.topThreeCard]}>
        <Text style={styles.rank}>{medal || `#${rank}`}</Text>
        <View style={styles.leaderInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.stats}>
            Level {item.level} • {item.spots_added} spots
          </Text>
        </View>
        <Text style={styles.xp}>{item.xp} XP</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Global Leaderboard</Text>
        <Text style={styles.headerSubtitle}>Top Skaters Worldwide</Text>
      </View>
      <FlatList
        data={leaders}
        renderItem={renderLeader}
        keyExtractor={(item: UserProfile) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaderboard} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No skaters yet</Text>
            <Text style={styles.emptySubtext}>Be the first to earn XP!</Text>
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
  header: {
    backgroundColor: '#d2673d',
    padding: 20,
    paddingTop: 15,
    paddingBottom: 25,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topThreeCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF0',
  },
  rank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d2673d',
    minWidth: 50,
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stats: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  xp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
});
