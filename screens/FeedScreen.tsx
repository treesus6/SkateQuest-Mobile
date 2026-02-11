import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Activity } from '../types';
import { getFeedActivities } from '../services/activities';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

export default function FeedScreen({ navigation }: any) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeSubscription([
    {
      channel: 'feed-updates',
      table: 'activities',
      onPayload: () => loadFeed(),
    },
  ]);

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
        return '\u{1F4CD}';
      case 'challenge_completed':
        return '\u{1F3AF}';
      case 'trick_landed':
        return '\u{1F6F9}';
      case 'level_up':
        return '\u2B06\uFE0F';
      case 'media_uploaded':
        return '\u{1F4F9}';
      case 'skate_game_won':
        return '\u{1F3C6}';
      default:
        return '\u2728';
    }
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const icon = getActivityIcon(item.activity_type);

    return (
      <View className="bg-white rounded-xl p-[15px] mb-[15px] shadow-md">
        <View className="flex-row items-start">
          <Text className="text-[28px] mr-[10px]">{icon}</Text>
          <View className="flex-1">
            <Text className="text-base font-bold text-brand-orange mb-[2px]">
              {item.user?.username || 'Skater'}
            </Text>
            <Text className="text-[15px] text-[#333] font-semibold mb-[3px]">{item.title}</Text>
            {item.description && (
              <Text className="text-sm text-[#666] mb-[5px]">{item.description}</Text>
            )}
            <Text className="text-xs text-[#999]">
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.xp_earned > 0 && (
            <View className="bg-[#4CAF50] px-[10px] py-[5px] rounded-xl">
              <Text className="text-white text-xs font-bold">+{item.xp_earned} XP</Text>
            </View>
          )}
        </View>

        {item.media && (
          <View className="mt-3 rounded-lg overflow-hidden">
            {item.media.type === 'photo' ? (
              <Image
                source={{ uri: item.media.url }}
                className="w-full h-[250px] rounded-lg"
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
            {item.media.caption && (
              <Text className="text-sm text-[#333] mt-2 italic">{item.media.caption}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="flex-row justify-between items-center bg-brand-orange p-[15px] rounded-bl-[15px] rounded-br-[15px]">
        <Text className="text-2xl font-bold text-white">{'\u{1F31F}'} Feed</Text>
        <TouchableOpacity
          className="bg-white px-[15px] py-2 rounded-[20px]"
          onPress={() => navigation.navigate('UploadMedia')}
        >
          <Text className="text-brand-orange font-bold text-sm">+ Upload</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item: Activity) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFeed} />}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No activity yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Be the first to post!</Text>
          </View>
        }
      />
    </View>
  );
}
