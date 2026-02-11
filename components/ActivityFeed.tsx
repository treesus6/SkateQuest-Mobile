import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { MapPin, Target, Zap, ArrowUpCircle, Users, Flag, Trophy, Crosshair, Star } from 'lucide-react-native';
import LoadingSkeleton from './ui/LoadingSkeleton';

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

const ACTIVITY_ICONS: Record<string, { icon: any; color: string }> = {
  qr_code_found: { icon: Crosshair, color: '#d2673d' },
  spot_claimed: { icon: Trophy, color: '#f59e0b' },
  challenge_completed: { icon: Target, color: '#4CAF50' },
  level_up: { icon: ArrowUpCircle, color: '#3b82f6' },
  crew_joined: { icon: Users, color: '#8b5cf6' },
  territory_captured: { icon: Flag, color: '#ef4444' },
  achievement_unlocked: { icon: Trophy, color: '#f59e0b' },
  trick_landed: { icon: Zap, color: '#FF6B35' },
  spot_added: { icon: MapPin, color: '#d2673d' },
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`*, profiles!activity_feed_user_id_fkey(username, avatar_url)`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = data?.map((item: any) => ({
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

  useEffect(() => { fetchActivities(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const iconData = ACTIVITY_ICONS[item.activity_type] || { icon: Star, color: '#d2673d' };
    const IconComponent = iconData.icon;

    return (
      <View className="bg-gray-800 rounded-xl p-4 mb-3 border-l-[3px] border-l-brand-terracotta">
        <View className="flex-row items-start">
          <View className="mr-3 mt-1">
            <IconComponent color={iconData.color} size={24} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-brand-terracotta mb-1">{item.username}</Text>
            <Text className="text-base font-semibold text-white mb-1">{item.title}</Text>
            {item.description && <Text className="text-sm text-gray-400 mb-2">{item.description}</Text>}
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-gray-500">{getTimeAgo(item.created_at)}</Text>
              {item.xp_earned > 0 && (
                <Text className="text-xs font-bold text-green-400">+{item.xp_earned} XP</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 p-3">
        <LoadingSkeleton height={80} className="mb-3" />
        <LoadingSkeleton height={80} className="mb-3" />
        <LoadingSkeleton height={80} className="mb-3" />
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id}
      renderItem={renderActivity}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d2673d" />}
      contentContainerStyle={{ padding: 12 }}
      className="bg-gray-900"
      ListEmptyComponent={
        <View className="items-center py-16">
          <Text className="text-lg font-bold text-white mb-2">No activity yet</Text>
          <Text className="text-sm text-gray-500">Start skating to see updates!</Text>
        </View>
      }
    />
  );
}

function getTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}
