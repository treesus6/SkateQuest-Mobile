import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { MapPin, Target, Zap, ArrowUpCircle, Camera, Trophy, Sparkles, Upload, Activity as ActivityIcon } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { feedService } from '../lib/feedService';
import { supabase } from '../lib/supabase';
import { Activity } from '../types';
import HypeButton from '../components/ui/HypeButton';
import { useNavigation } from '../lib/useNavigation';

const ACTIVITY_ICONS: Record<string, { icon: typeof MapPin; color: string }> = {
  spot_added: { icon: MapPin, color: '#D2673D' },
  challenge_completed: { icon: Target, color: '#4ADE80' },
  trick_landed: { icon: Zap, color: '#F59E0B' },
  level_up: { icon: ArrowUpCircle, color: '#8B5CF6' },
  media_uploaded: { icon: Camera, color: '#38BDF8' },
  skate_game_won: { icon: Trophy, color: '#FFD166' },
};

type HypeState = Record<string, { total: number; mine: number }>;

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: activities, loading, refetch } = useSupabaseQuery<Activity[]>(
    () => feedService.getRecent(50),
    [],
    { cacheKey: 'feed-recent' }
  );
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const [hypeState, setHypeState] = useState<HypeState>({});

  useEffect(() => {
    if (!activities || !user) return;
    const mediaIds = activities.filter(a => a.media_id).map(a => a.media_id as string);
    if (!mediaIds.length) return;
    void (async () => {
      const [{ data: totals }, { data: mine }] = await Promise.all([
        supabase.from('media_hype').select('media_id,total_hype').in('media_id', mediaIds),
        supabase.from('media_hype_users').select('media_id,hype_count').eq('user_id', user.id).in('media_id', mediaIds),
      ]);
      const next: HypeState = {};
      for (const activity of activities) {
        if (!activity.media_id) continue;
        next[activity.id] = {
          total: totals?.find(row => row.media_id === activity.media_id)?.total_hype ?? activity.media?.likes_count ?? 0,
          mine: mine?.find(row => row.media_id === activity.media_id)?.hype_count ?? 0,
        };
      }
      setHypeState(next);
    })();
  }, [activities, user]);

  useEffect(() => {
    const subscription = feedService.subscribeToFeed(() => refetchRef.current());
    return () => { void subscription.unsubscribe(); };
  }, []);

  const handleHype = useCallback(async (activityId: string, mediaId: string, newCount: number) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('set_media_hype', { p_media_id: mediaId, p_hype_count: newCount });
    if (error) throw error;
    const result = (data ?? {}) as { total?: number; mine?: number };
    setHypeState(prev => ({
      ...prev,
      [activityId]: {
        total: result.total ?? prev[activityId]?.total ?? 0,
        mine: result.mine ?? newCount,
      },
    }));
  }, [user]);

  const renderActivity = ({ item }: { item: Activity }) => {
    const hype = hypeState[item.id] || { total: item.media?.likes_count ?? 0, mine: 0 };
    const config = ACTIVITY_ICONS[item.activity_type] || { icon: Sparkles, color: '#8B95A5' };
    const Icon = config.icon;

    return (
      <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] overflow-hidden mb-3">
        <View className="p-4">
          <View className="flex-row items-start gap-3">
            <View className="w-11 h-11 rounded-2xl bg-[#0B1017] border border-[#252D39] items-center justify-center">
              <Icon color={config.color} size={21} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-[#D2673D] text-sm font-black">@{item.user?.username || 'skater'}</Text>
                <Text className="text-[#596271] text-[11px]">{timeAgo(item.created_at)}</Text>
              </View>
              <Text className="text-white text-[16px] font-black mt-1">{item.title}</Text>
              {item.description ? <Text className="text-[#A7AFBA] text-sm leading-5 mt-1">{item.description}</Text> : null}
            </View>
            {item.xp_earned > 0 ? (
              <View className="bg-[#12331F] border border-[#285D39] px-2.5 py-1 rounded-full">
                <Text className="text-[#4ADE80] text-[10px] font-black">+{item.xp_earned} XP</Text>
              </View>
            ) : null}
          </View>
        </View>

        {item.media ? (
          <View>
            {item.media.url ? (
              item.media.type === 'photo' ? (
                <Image source={{ uri: item.media.url }} style={{ width: '100%', height: 280 }} contentFit="cover" />
              ) : (
                <Video source={{ uri: item.media.url }} style={{ width: '100%', height: 280 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
              )
            ) : (
              <View style={{ height: 90 }} className="bg-[#0B1017] items-center justify-center">
                <Text className="text-[#687383] text-sm">Media unavailable</Text>
              </View>
            )}
            {item.media.caption ? <Text className="text-[#A7AFBA] text-sm px-4 pt-3 italic">{item.media.caption}</Text> : null}
          </View>
        ) : null}

        <View className="flex-row items-center justify-between px-4 py-3.5 border-t border-[#252D39] mt-3">
          <HypeButton
            mediaId={item.media_id || item.id}
            initialHypeCount={hype.total}
            userHypeCount={hype.mine}
            onHype={(mediaId, newCount) => handleHype(item.id, mediaId, newCount)}
            size="md"
          />
          <Text className="text-[#596271] text-[10px] font-black uppercase tracking-wider">{item.activity_type.replace(/_/g, ' ')}</Text>
        </View>
      </View>
    );
  };

  const feedItems = activities ?? [];
  const mediaPosts = feedItems.filter(item => item.media_id || item.activity_type === 'media_uploaded').length;

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">COMMUNITY NOW</Text>
            <Text className="text-white text-[30px] font-black mt-1">Feed</Text>
            <Text className="text-[#7B8493] text-sm mt-1">Landings, clips, sessions and progress from the scene.</Text>
          </View>
          <TouchableOpacity className="bg-[#D2673D] px-4 py-3 rounded-2xl flex-row items-center gap-2" onPress={() => navigation.navigate('UploadMedia')}>
            <Upload color="#fff" size={15} />
            <Text className="text-white font-black text-sm">Post</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <ActivityIcon size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{feedItems.length}</Text>
            <Text className="text-[#697383] text-[11px]">recent activity</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Camera size={16} color="#38BDF8" />
            <Text className="text-white text-xl font-black mt-1">{mediaPosts}</Text>
            <Text className="text-[#697383] text-[11px]">media posts</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={feedItems}
        renderItem={renderActivity}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={loading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
              <Sparkles size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">No activity yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">Post a clip, complete a challenge, or log a session to get the scene moving.</Text>
          </View>
        }
      />
    </View>
  );
}
