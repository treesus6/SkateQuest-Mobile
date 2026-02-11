import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string;
  xp_earned: number;
  created_at: string;
  username?: string;
  avatar_url?: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(
          `
          *,
          profiles!activity_feed_user_id_fkey(username, avatar_url)
        `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted =
        data?.map((item: any) => ({
          ...item,
          username: item.profiles?.username || 'Unknown',
          avatar_url: item.profiles?.avatar_url,
        })) || [];

      setActivities(formatted);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const getActivityEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      qr_code_found: '📱',
      spot_claimed: '👑',
      challenge_completed: '✅',
      level_up: '⬆️',
      crew_joined: '🤝',
      territory_captured: '🏴',
      achievement_unlocked: '🏆',
      trick_landed: '🛹',
      spot_added: '📍',
    };
    return emojiMap[type] || '⭐';
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const timeAgo = getTimeAgo(item.created_at);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Text style={styles.emoji}>{getActivityEmoji(item.activity_type)}</Text>
          <View style={styles.activityContent}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.title}>{item.title}</Text>
            {item.description && <Text style={styles.description}>{item.description}</Text>}
            <View style={styles.footer}>
              <Text style={styles.time}>{timeAgo}</Text>
              {item.xp_earned > 0 && <Text style={styles.xp}>+{item.xp_earned} XP</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item: Activity) => item.id}
      renderItem={renderActivity}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d2673d" />
      }
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>Start skating to see updates!</Text>
        </View>
      }
    />
  );
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  listContainer: {
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  activityCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d2673d',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d2673d',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  xp: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
