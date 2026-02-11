import React, { useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { MapPin, Target, Zap, ArrowUpCircle, Camera, Trophy, Sparkles, Upload } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { feedService } from '../lib/feedService';
import { Activity } from '../types';
import Card from '../components/ui/Card';

const ACTIVITY_ICONS: Record<string, { icon: typeof MapPin; color: string }> = {
  spot_added: { icon: MapPin, color: '#d2673d' },
  challenge_completed: { icon: Target, color: '#4CAF50' },
  trick_landed: { icon: Zap, color: '#FF6B35' },
  level_up: { icon: ArrowUpCircle, color: '#6B4CE6' },
  media_uploaded: { icon: Camera, color: '#2196F3' },
  skate_game_won: { icon: Trophy, color: '#FFD700' },
};

export default function FeedScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { data: activities, loading, refetch } = useSupabaseQuery<Activity[]>(
    () => feedService.getRecent(50),
    [],
    { cacheKey: 'feed-recent' }
  );

  useEffect(() => {
    const subscription = feedService.subscribeToFeed(() => refetch());
    return () => { subscription.unsubscribe(); };
  }, [refetch]);

  const renderActivityIcon = (type: string) => {
    const config = ACTIVITY_ICONS[type] || { icon: Sparkles, color: '#999' };
    const Icon = config.icon;
    return <Icon color={config.color} size={24} />;
  };

  const renderActivity = ({ item }: { item: Activity }) => (
    <Card>
      <View className="flex-row items-start">
        <View className="mr-3 mt-0.5">
          {renderActivityIcon(item.activity_type)}
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-brand-terracotta mb-0.5">
            {item.user?.username || 'Skater'}
          </Text>
          <Text className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
            {item.title}
          </Text>
          {item.description ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.description}</Text>
          ) : null}
          <Text className="text-xs text-gray-400">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {item.xp_earned > 0 && (
          <View className="bg-brand-green px-2.5 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">+{item.xp_earned} XP</Text>
          </View>
        )}
      </View>

      {item.media && (
        <View className="mt-3 rounded-lg overflow-hidden">
          {item.media.type === 'photo' ? (
            <Image
              source={{ uri: item.media.url }}
              style={{ width: '100%', height: 250 }}
              resizeMode="cover"
            />
          ) : (
            <Video
              source={{ uri: item.media.url }}
              style={{ width: '100%', height: 250 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
          {item.media.caption ? (
            <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">
              {item.media.caption}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-white">Feed</Text>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full flex-row items-center gap-1.5"
          onPress={() => navigation.navigate('UploadMedia')}
        >
          <Upload color="#d2673d" size={14} />
          <Text className="text-brand-terracotta font-bold text-sm">Upload</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities ?? []}
        renderItem={renderActivity}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">No activity yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Be the first to post!</Text>
          </View>
        }
      />
    </View>
  );
}
