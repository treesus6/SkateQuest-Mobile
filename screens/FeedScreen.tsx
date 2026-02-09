import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { Activity } from '../types';
import { getFeedActivities } from '../services/activities';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

const { width } = Dimensions.get('window');

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeSubscription([{
    channel: 'feed-updates',
    table: 'activities',
    onPayload: () => loadFeed(),
  }]);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const data = await getFeedActivities();
      setActivities(data);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'spot_added':
        return '📍';
      case 'challenge_completed':
        return '🎯';
      case 'trick_landed':
        return '🛹';
      case 'level_up':
        return '⬆️';
      case 'media_uploaded':
        return '📹';
      case 'skate_game_won':
        return '🏆';
      default:
        return '✨';
    }
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const icon = getActivityIcon(item.activity_type);

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityIcon}>{icon}</Text>
          <View style={styles.activityHeaderText}>
            <Text style={styles.username}>{item.user?.username || 'Skater'}</Text>
            <Text style={styles.activityTitle}>{item.title}</Text>
            {item.description && <Text style={styles.activityDescription}>{item.description}</Text>}
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          {item.xp_earned > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{item.xp_earned} XP</Text>
            </View>
          )}
        </View>

        {item.media && (
          <View style={styles.mediaContainer}>
            {item.media.type === 'photo' ? (
              <Image
                source={{ uri: item.media.url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : (
              <Video
                source={{ uri: item.media.url }}
                style={styles.mediaVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            )}
            {item.media.caption && <Text style={styles.mediaCaption}>{item.media.caption}</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌟 Feed</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => navigation.navigate('UploadMedia')}
        >
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFeed} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>Be the first to post!</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d2673d',
    padding: 15,
    paddingTop: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: '#d2673d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  activityHeaderText: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d2673d',
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 3,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  xpBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  xpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mediaContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
  },
  mediaVideo: {
    width: '100%',
    height: 250,
  },
  mediaCaption: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontStyle: 'italic',
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
