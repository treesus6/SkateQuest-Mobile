import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const { width } = Dimensions.get('window');

interface Clip {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  trick_name: string;
  park_name: string;
  likes: number;
  views: number;
  featured: boolean;
  created_at: string;
  profiles: { username: string; avatar_url: string };
}

export default function SkateTVScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'recent' | 'nearby'>('featured');
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());

  useEffect(() => { loadClips(); }, [activeTab]);

  const loadClips = async () => {
    let query = supabase
      .from('skatetv_clips')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (activeTab === 'featured') query = query.eq('featured', true);
    const { data } = await query;
    setClips(data || []);
  };

  const likeClip = async (clipId: string, currentLikes: number) => {
    if (!user) return;
    if (likedClips.has(clipId)) return;

    setLikedClips(prev => new Set([...prev, clipId]));
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: c.likes + 1 } : c));

    await supabase.from('skatetv_likes').insert({ user_id: user.id, clip_id: clipId });
    await supabase.from('skatetv_clips').update({ likes: currentLikes + 1 }).eq('id', clipId);
  };

  const tabs = [
    { key: 'featured', label: '🔥 Featured' },
    { key: 'recent', label: '🕐 Recent' },
    { key: 'nearby', label: '📍 Nearby' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>📺 SkateTV</Text>
        <Text style={s.sub}>Best clips from the community</Text>
      </View>

      <View style={s.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabOn]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[s.tabTxt, activeTab === tab.key && s.tabTxtOn]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={clips}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.thumb}>
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={s.thumbImg} />
              ) : (
                <View style={s.thumbPlaceholder}>
                  <Text style={s.thumbIcon}>🎥</Text>
                </View>
              )}
              {item.featured && (
                <View style={s.featBadge}>
                  <Text style={s.featTxt}>🔥 FEATURED</Text>
                </View>
              )}
              <View style={s.playBtn}>
                <Text style={s.playIcon}>▶</Text>
              </View>
            </View>

            <View style={s.info}>
              <View style={s.infoTop}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>🛹</Text>
                </View>
                <View style={s.infoText}>
                  <Text style={s.username}>@{item.profiles?.username || 'skater'}</Text>
                  {item.trick_name && <Text style={s.trickName}>{item.trick_name}</Text>}
                  {item.park_name && <Text style={s.parkName}>📍 {item.park_name}</Text>}
                </View>
              </View>

              <View style={s.actions}>
                <TouchableOpacity style={s.action} onPress={() => likeClip(item.id, item.likes)}>
                  <Text style={[s.actionIcon, likedClips.has(item.id) && s.liked]}>
                    {likedClips.has(item.id) ? '❤️' : '🤍'}
                  </Text>
                  <Text style={s.actionCount}>{item.likes}</Text>
                </TouchableOpacity>
                <View style={s.action}>
                  <Text style={s.actionIcon}>👁</Text>
                  <Text style={s.actionCount}>{item.views}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📺</Text>
            <Text style={s.emptyText}>No clips yet. Be the first to post!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabOn: { backgroundColor: '#d2673d' },
  tabTxt: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  tabTxtOn: { color: 'white' },
  card: { backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1a2030' },
  thumb: { height: 200, backgroundColor: '#0a0e1a', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  thumbIcon: { fontSize: 48 },
  featBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#d2673d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  featTxt: { color: 'white', fontSize: 10, fontWeight: '900' },
  playBtn: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(210,103,61,0.9)', justifyContent: 'center', alignItems: 'center' },
  playIcon: { color: 'white', fontSize: 20, marginLeft: 4 },
  info: { padding: 12 },
  infoTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(210,103,61,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 16 },
  infoText: { flex: 1 },
  username: { color: '#d2673d', fontWeight: '700', fontSize: 13 },
  trickName: { color: '#F3F4F6', fontWeight: '700', fontSize: 15 },
  parkName: { color: '#6B7280', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 18 },
  liked: { color: '#ef4444' },
  actionCount: { color: '#9CA3AF', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
});
