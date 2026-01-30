import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { ActivityFeedItem } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ACTIVITY_CONFIG = {
  achievement: {
    icon: '🏆',
    color: '#f39c12',
    bgColor: '#fef9e7',
  },
  spot_claim: {
    icon: '📍',
    color: '#e74c3c',
    bgColor: '#fdedec',
  },
  shop_redeem: {
    icon: '🛍️',
    color: '#9b59b6',
    bgColor: '#f5eef8',
  },
  level_up: {
    icon: '⬆️',
    color: '#3498db',
    bgColor: '#ebf5fb',
  },
  first_blood: {
    icon: '🩸',
    color: '#c0392b',
    bgColor: '#f9ebea',
  },
};

const RARITY_COLORS = {
  common: '#95a5a6',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12',
};

export default function GlobalFeedScreen() {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnims = useState<Map<string, Animated.Value>>(new Map())[0];

  const getFadeAnim = (id: string) => {
    if (!fadeAnims.has(id)) {
      fadeAnims.set(id, new Animated.Value(0));
    }
    return fadeAnims.get(id)!;
  };

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);

      // Use the RPC function for better performance
      const { data, error } = await supabase.rpc('get_global_feed', {
        p_limit: 50,
        p_offset: 0,
      });

      if (error) {
        // Fallback to direct query if RPC doesn't exist yet
        console.log('RPC not available, using direct query:', error.message);
        const { data: directData, error: directError } = await supabase
          .from('activity_feed')
          .select(
            `
            *,
            user:profiles(username, level)
          `
          )
          .order('created_at', { ascending: false })
          .limit(50);

        if (directError) {
          console.error('Error loading feed:', directError);
          return;
        }

        // Transform the data
        const transformed = (directData || []).map((item: any) => ({
          ...item,
          username: item.user?.username,
          user_level: item.user?.level,
        }));
        setActivities(transformed);
      } else {
        setActivities(data || []);
      }

      // Animate new items
      (data || []).forEach((item: ActivityFeedItem, index: number) => {
        const anim = getFadeAnim(item.id);
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }).start();
      });
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();

    // Real-time subscription for new activities
    const subscription = supabase
      .channel('global-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        payload => {
          // Add new activity to the top with animation
          const newItem = payload.new as ActivityFeedItem;
          const anim = getFadeAnim(newItem.id);
          anim.setValue(0);

          setActivities(prev => [newItem, ...prev.slice(0, 49)]);

          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadFeed]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderActivity = ({ item, index }: { item: ActivityFeedItem; index: number }) => {
    const config = ACTIVITY_CONFIG[item.activity_type] || ACTIVITY_CONFIG.achievement;
    const fadeAnim = getFadeAnim(item.id);
    const rarity = item.metadata?.rarity as keyof typeof RARITY_COLORS | undefined;
    const rarityColor = rarity ? RARITY_COLORS[rarity] : null;

    return (
      <Animated.View
        style={[
          styles.activityCard,
          { backgroundColor: config.bgColor },
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Activity icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
          <Text style={styles.activityIcon}>{item.metadata?.achievement_icon || config.icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.activityMessage}>{item.message}</Text>

          <View style={styles.metaRow}>
            {/* Rarity badge for achievements */}
            {rarityColor && (
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                <Text style={styles.rarityText}>{rarity?.toUpperCase()}</Text>
              </View>
            )}

            {/* User level */}
            {item.user_level && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {item.user_level}</Text>
              </View>
            )}

            {/* Timestamp */}
            <Text style={styles.timestamp}>{getTimeAgo(item.created_at)}</Text>
          </View>
        </View>

        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: config.color }]} />
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Global Feed</Text>
      <Text style={styles.headerSubtitle}>See what the community is up to</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFeed} tintColor="#d2673d" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛹</Text>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to unlock an achievement or claim a spot!
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 100,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 22,
  },
  contentContainer: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
