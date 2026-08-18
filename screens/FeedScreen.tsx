import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { MapPin, Target, Zap, ArrowUpCircle, Camera, Trophy, Sparkles, Upload } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { feedService } from '../lib/feedService';
import { supabase } from '../lib/supabase';
import { Activity } from '../types';
import Card from '../components/ui/Card';
import HypeButton from '../components/ui/HypeButton';
import { useNavigation } from '../lib/useNavigation';

const ACTIVITY_ICONS: Record<string, { icon: typeof MapPin; color: string }> = {
  spot_added: { icon: MapPin, color: '#d2673d' }, challenge_completed: { icon: Target, color: '#4CAF50' }, trick_landed: { icon: Zap, color: '#FF6B35' }, level_up: { icon: ArrowUpCircle, color: '#6B4CE6' }, media_uploaded: { icon: Camera, color: '#2196F3' }, skate_game_won: { icon: Trophy, color: '#FFD700' },
};

type HypeState = Record<string, { total: number; mine: number }>;

export default function FeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { data: activities, loading, refetch } = useSupabaseQuery<Activity[]>(() => feedService.getRecent(50), [], { cacheKey: 'feed-recent' });
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
    return () => subscription.unsubscribe();
  }, []);

  const handleHype = useCallback(async (activityId: string, mediaId: string, newCount: number) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('set_media_hype', { p_media_id: mediaId, p_hype_count: newCount });
    if (error) throw error;
    const result = (data ?? {}) as { total?: number; mine?: number };
    setHypeState(prev => ({ ...prev, [activityId]: { total: result.total ?? prev[activityId]?.total ?? 0, mine: result.mine ?? newCount } }));
  }, [user]);

  const renderActivityIcon = (type: string) => {
    const config = ACTIVITY_ICONS[type] || { icon: Sparkles, color: '#999' };
    const Icon = config.icon;
    return <Icon color={config.color} size={24} />;
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const hype = hypeState[item.id] || { total: item.media?.likes_count ?? 0, mine: 0 };
    return <Card>
      <View className="flex-row items-start"><View className="mr-3 mt-0.5">{renderActivityIcon(item.activity_type)}</View><View className="flex-1"><Text className="text-base font-bold text-brand-terracotta mb-0.5">{item.user?.username || 'Skater'}</Text><Text className="text-[15px] font-semibold text-gray-800 dark:text-gray-100 mb-1">{item.title}</Text>{item.description ? <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">{item.description}</Text> : null}<Text className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</Text></View>{item.xp_earned > 0 && <View className="bg-brand-green px-2.5 py-1 rounded-full"><Text className="text-white text-xs font-bold">+{item.xp_earned} XP</Text></View>}</View>
      {item.media && <View className="mt-3 rounded-lg overflow-hidden">{item.media.url ? item.media.type === 'photo' ? <Image source={{ uri: item.media.url }} style={{ width: '100%', height: 250 }} contentFit="cover" /> : <Video source={{ uri: item.media.url }} style={{ width: '100%', height: 250 }} useNativeControls resizeMode={ResizeMode.CONTAIN} /> : <View style={{ height: 60 }} className="bg-gray-100 dark:bg-gray-700 items-center justify-center"><Text className="text-sm text-gray-400">Media unavailable</Text></View>}{item.media.caption ? <Text className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">{item.media.caption}</Text> : null}</View>}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"><HypeButton mediaId={item.media_id || item.id} initialHypeCount={hype.total} userHypeCount={hype.mine} onHype={(mediaId,newCount) => handleHype(item.id,mediaId,newCount)} size="md"/><Text className="text-xs text-gray-400">{item.activity_type.replace(/_/g, ' ')}</Text></View>
    </Card>;
  };

  return <View className="flex-1 bg-brand-beige dark:bg-gray-900"><View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center"><Text className="text-2xl font-bold text-white">Feed</Text><TouchableOpacity className="bg-white px-4 py-2 rounded-full flex-row items-center gap-1.5" onPress={() => navigation.navigate('UploadMedia')}><Upload color="#d2673d" size={14}/><Text className="text-brand-terracotta font-bold text-sm">Upload</Text></TouchableOpacity></View><FlatList data={activities ?? []} renderItem={renderActivity} keyExtractor={item => item.id} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch}/>} ListEmptyComponent={<View className="items-center mt-24"><Text className="text-lg font-bold text-gray-400">No activity yet</Text><Text className="text-sm text-gray-300 mt-1">Be the first to post!</Text></View>}/></View>;
}
