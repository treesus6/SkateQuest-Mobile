import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowUpRight,
  Camera,
  Eye,
  Flame,
  Heart,
  MapPin,
  Play,
  Plus,
  Sparkles,
  Upload,
  Video,
  X,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { uploadSkateTVClip } from '../lib/uploadMedia';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F5F0E7';
const ORANGE = '#E36D3F';
const ACID = '#D8F04B';
const BLUE = '#63A7FF';
const MUTED = '#929AA7';

type Clip = {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
  trick_name: string | null;
  park_name: string | null;
  likes: number;
  views: number;
  featured: boolean;
  created_at: string;
  profiles: { username: string | null } | null;
};

export default function SkateTVSceneScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<'fresh' | 'featured'>('fresh');
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTrick, setUploadTrick] = useState('');
  const [uploadPark, setUploadPark] = useState('');

  const loadClips = useCallback(async () => {
    let query = supabase
      .from('skatetv_clips')
      .select('id,user_id,video_url,thumbnail_url,title,trick_name,park_name,likes,views,featured,created_at,profiles(username)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (activeTab === 'featured') query = query.eq('featured', true);
    const { data, error } = await query;
    if (error) {
      console.error('SkateTV load failed', error);
      setRefreshing(false);
      return;
    }

    const nextClips = (data ?? []) as unknown as Clip[];
    setClips(nextClips);

    if (user?.id && nextClips.length > 0) {
      const { data: likes } = await supabase
        .from('skatetv_likes')
        .select('clip_id')
        .eq('user_id', user.id)
        .in('clip_id', nextClips.map(clip => clip.id));
      setLikedClips(new Set((likes ?? []).map(row => row.clip_id)));
    } else {
      setLikedClips(new Set());
    }
    setRefreshing(false);
  }, [activeTab, user?.id]);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  const stats = useMemo(
    () => ({
      clips: clips.length,
      views: clips.reduce((sum, clip) => sum + Number(clip.views || 0), 0),
      likes: clips.reduce((sum, clip) => sum + Number(clip.likes || 0), 0),
    }),
    [clips]
  );

  const toggleLike = async (clip: Clip) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to hype clips.');
      return;
    }

    const previousLiked = likedClips.has(clip.id);
    const previousLikes = clip.likes;
    setLikedClips(current => {
      const next = new Set(current);
      if (previousLiked) next.delete(clip.id);
      else next.add(clip.id);
      return next;
    });
    setClips(current => current.map(item => item.id === clip.id ? { ...item, likes: Math.max(0, item.likes + (previousLiked ? -1 : 1)) } : item));

    const { data, error } = await supabase.rpc('toggle_skatetv_like', { p_clip_id: clip.id });
    if (error) {
      setLikedClips(current => {
        const next = new Set(current);
        if (previousLiked) next.add(clip.id);
        else next.delete(clip.id);
        return next;
      });
      setClips(current => current.map(item => item.id === clip.id ? { ...item, likes: previousLikes } : item));
      Alert.alert('Could not update hype', error.message);
      return;
    }

    const result = data as { liked?: boolean; likes?: number } | null;
    if (result) {
      setLikedClips(current => {
        const next = new Set(current);
        if (result.liked) next.add(clip.id);
        else next.delete(clip.id);
        return next;
      });
      if (typeof result.likes === 'number') {
        setClips(current => current.map(item => item.id === clip.id ? { ...item, likes: result.likes as number } : item));
      }
    }
  };

  const watchClip = async (clip: Clip) => {
    const { data } = await supabase.rpc('record_skatetv_view', { p_clip_id: clip.id });
    const result = data as { views?: number } | null;
    if (typeof result?.views === 'number') {
      setClips(current => current.map(item => item.id === clip.id ? { ...item, views: result.views as number } : item));
    }
    void Linking.openURL(clip.video_url).catch(() => Alert.alert('Could not open clip', 'Try again in a moment.'));
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'SkateQuest needs media access to post a clip.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled) setUploadVideo(result.assets[0].uri);
  };

  const submitClip = async () => {
    if (!user?.id || !uploadVideo || uploading) return;
    if (!uploadTitle.trim()) {
      Alert.alert('Add a title', 'Tell people what went down.');
      return;
    }

    setUploading(true);
    try {
      const { url, error } = await uploadSkateTVClip(uploadVideo, user.id);
      if (error || !url) throw new Error(error || 'Upload failed');
      const { error: insertError } = await supabase.from('skatetv_clips').insert({
        user_id: user.id,
        video_url: url,
        thumbnail_url: null,
        title: uploadTitle.trim(),
        trick_name: uploadTrick.trim() || null,
        park_name: uploadPark.trim() || null,
        likes: 0,
        views: 0,
        featured: false,
      });
      if (insertError) throw insertError;

      setUploadModal(false);
      setUploadVideo(null);
      setUploadTitle('');
      setUploadTrick('');
      setUploadPark('');
      setActiveTab('fresh');
      await loadClips();
      Alert.alert('Clip is live', 'Your clip is on SkateTV.');
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={clips}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadClips();
            }}
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View>
            <View style={s.hero}>
              <View style={s.heroSlashA} />
              <View style={s.heroSlashB} />
              <View style={s.heroTop}>
                <View>
                  <View style={s.kickerRow}><Video size={14} color={ORANGE} /><Text style={s.kicker}>SKATEQUEST VIDEO</Text></View>
                  <Text style={s.title}>SKATE{`\n`}TV.</Text>
                  <Text style={s.sub}>Real clips. Real spots. No stock filler.</Text>
                </View>
                <Pressable style={s.uploadBtn} onPress={() => setUploadModal(true)}>
                  <Plus size={20} color={INK} strokeWidth={3} />
                  <Text style={s.uploadTxt}>DROP</Text>
                </Pressable>
              </View>
            </View>

            <View style={s.statsRail}>
              <Stat color={ORANGE} value={stats.clips} label="CLIPS" />
              <Stat color={ACID} value={stats.views} label="VIEWS" />
              <Stat color={BLUE} value={stats.likes} label="HYPE" />
            </View>

            <View style={s.tabs}>
              <Pressable style={[s.tab, activeTab === 'fresh' && s.tabOn]} onPress={() => setActiveTab('fresh')}>
                <Sparkles size={16} color={activeTab === 'fresh' ? INK : MUTED} />
                <Text style={[s.tabText, activeTab === 'fresh' && s.tabTextOn]}>FRESH</Text>
              </Pressable>
              <Pressable style={[s.tab, activeTab === 'featured' && s.tabOn]} onPress={() => setActiveTab('featured')}>
                <Flame size={16} color={activeTab === 'featured' ? INK : MUTED} />
                <Text style={[s.tabText, activeTab === 'featured' && s.tabTextOn]}>FEATURED</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const liked = likedClips.has(item.id);
          return (
            <View style={s.card}>
              <Pressable style={s.media} onPress={() => void watchClip(item)}>
                {item.thumbnail_url ? (
                  <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                ) : (
                  <View style={s.noThumb}><Camera color={ORANGE} size={42} /><Text style={s.noThumbText}>VIDEO READY</Text></View>
                )}
                <View style={s.scrim} />
                <View style={s.indexSticker}><Text style={s.indexText}>{String(index + 1).padStart(2, '0')}</Text></View>
                {item.featured ? <View style={s.featured}><Flame color={INK} size={12} /><Text style={s.featuredText}>FEATURED</Text></View> : null}
                <View style={s.play}><Play color="#fff" fill="#fff" size={18} /></View>
                <View style={s.mediaCopy}>
                  <Text style={s.clipTitle} numberOfLines={2}>{item.title || item.trick_name || 'Skate clip'}</Text>
                  <Text style={s.byline}>@{item.profiles?.username || 'skater'}</Text>
                </View>
              </Pressable>

              <View style={s.info}>
                <View style={s.tagRow}>
                  {item.trick_name ? <View style={s.trickTag}><Text style={s.trickTagText}>{item.trick_name.toUpperCase()}</Text></View> : null}
                  {item.park_name ? <View style={s.spotTag}><MapPin color={MUTED} size={12} /><Text style={s.spotText} numberOfLines={1}>{item.park_name}</Text></View> : null}
                </View>
                <View style={s.actions}>
                  <Pressable style={[s.action, liked && s.actionLiked]} onPress={() => void toggleLike(item)}>
                    <Heart color={liked ? INK : ORANGE} fill={liked ? INK : 'transparent'} size={18} />
                    <Text style={[s.actionText, liked && s.actionTextLiked]}>{item.likes}</Text>
                  </Pressable>
                  <View style={s.action}><Eye color={MUTED} size={18} /><Text style={s.actionText}>{item.views}</Text></View>
                  <Pressable style={s.watch} onPress={() => void watchClip(item)}>
                    <Play color={INK} fill={INK} size={13} />
                    <Text style={s.watchText}>WATCH</Text>
                    <ArrowUpRight color={INK} size={14} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Pressable style={s.empty} onPress={() => setUploadModal(true)}>
            <View style={s.emptyIcon}><Upload color={INK} size={28} /></View>
            <Text style={s.emptyTitle}>{activeTab === 'featured' ? 'NO FEATURED CLIPS YET' : 'THE FEED IS EMPTY'}</Text>
            <Text style={s.emptyText}>{activeTab === 'featured' ? 'Switch to Fresh or post something worth featuring.' : 'Be the first real clip on the scene.'}</Text>
          </Pressable>
        }
      />

      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={s.modalShade}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View><Text style={s.kicker}>DROP A CLIP</Text><Text style={s.modalTitle}>Post to SkateTV</Text></View>
              <Pressable style={s.close} onPress={() => setUploadModal(false)}><X color={PAPER} size={18} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
              <Pressable style={[s.videoPicker, uploadVideo && s.videoPickerReady]} onPress={() => void pickVideo()}>
                <Upload color={uploadVideo ? INK : ORANGE} size={29} />
                <Text style={[s.videoPickerTitle, uploadVideo && { color: INK }]}>{uploadVideo ? 'VIDEO LOCKED IN' : 'CHOOSE SKATE CLIP'}</Text>
                <Text style={[s.videoPickerSub, uploadVideo && { color: 'rgba(7,8,11,0.62)' }]}>Up to 60 seconds</Text>
              </Pressable>

              <Input label="TITLE *" placeholder="What went down?" value={uploadTitle} onChangeText={setUploadTitle} />
              <Input label="TRICK" placeholder="Kickflip, boardslide, line…" value={uploadTrick} onChangeText={setUploadTrick} />
              <Input label="SPOT" placeholder="Where did you skate?" value={uploadPark} onChangeText={setUploadPark} />

              <Pressable style={[s.postButton, (!uploadVideo || uploading) && s.postButtonDisabled]} onPress={() => void submitClip()} disabled={!uploadVideo || uploading}>
                {uploading ? <ActivityIndicator color={INK} /> : <><Upload color={INK} size={18} /><Text style={s.postButtonText}>POST REAL CLIP</Text></>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Input({ label, placeholder, value, onChangeText }: { label: string; placeholder: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={s.inputBlock}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput style={s.input} placeholder={placeholder} placeholderTextColor="#626B78" value={value} onChangeText={onChangeText} />
    </View>
  );
}

function Stat({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View style={[s.stat, { backgroundColor: color }]}>
      <Text style={s.statValue}>{value.toLocaleString()}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  list: { padding: 14, paddingBottom: 40, gap: 14 },
  hero: { minHeight: 210, borderRadius: 27, backgroundColor: '#161A21', borderWidth: 1, borderColor: '#2C323C', overflow: 'hidden', padding: 19 },
  heroSlashA: { position: 'absolute', width: 240, height: 72, backgroundColor: ORANGE, right: -78, top: 22, transform: [{ rotate: '29deg' }] },
  heroSlashB: { position: 'absolute', width: 190, height: 20, backgroundColor: ACID, left: -66, bottom: 33, transform: [{ rotate: '-10deg' }] },
  heroTop: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: PAPER, fontSize: 45, lineHeight: 41, fontWeight: '900', letterSpacing: -2.2, marginTop: 7 },
  sub: { color: '#B7BDC7', fontSize: 11, fontWeight: '700', marginTop: 7 },
  uploadBtn: { width: 64, height: 64, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  uploadTxt: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  statsRail: { flexDirection: 'row', gap: 8, marginTop: 9 },
  stat: { flex: 1, minHeight: 72, borderRadius: 17, padding: 11, justifyContent: 'center' },
  statValue: { color: INK, fontSize: 18, fontWeight: '900' },
  statLabel: { color: 'rgba(7,8,11,0.67)', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 2 },
  tab: { flex: 1, minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#151A21', borderWidth: 1, borderColor: '#2C323C' },
  tabOn: { backgroundColor: PAPER, borderColor: PAPER },
  tabText: { color: MUTED, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  tabTextOn: { color: INK },
  card: { backgroundColor: '#12161C', borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: '#2B313B' },
  media: { height: 330, backgroundColor: '#171B22', overflow: 'hidden' },
  noThumb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9 },
  noThumbText: { color: MUTED, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  indexSticker: { position: 'absolute', top: 13, left: 13, minWidth: 40, height: 31, borderRadius: 10, paddingHorizontal: 9, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  indexText: { color: INK, fontSize: 11, fontWeight: '900' },
  featured: { position: 'absolute', top: 13, right: 13, minHeight: 31, borderRadius: 10, paddingHorizontal: 9, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  play: { position: 'absolute', left: 18, bottom: 82, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center' },
  mediaCopy: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  clipTitle: { color: '#fff', fontSize: 25, lineHeight: 28, fontWeight: '900', letterSpacing: -0.8 },
  byline: { color: '#D1D5DC', fontSize: 11, fontWeight: '800', marginTop: 5 },
  info: { padding: 13 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  trickTag: { backgroundColor: ORANGE, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  trickTagText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  spotTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  spotText: { flex: 1, color: MUTED, fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 },
  action: { minHeight: 40, minWidth: 62, borderRadius: 12, borderWidth: 1, borderColor: '#303641', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  actionLiked: { backgroundColor: ORANGE, borderColor: ORANGE },
  actionText: { color: PAPER, fontSize: 10, fontWeight: '900' },
  actionTextLiked: { color: INK },
  watch: { marginLeft: 'auto', minHeight: 40, borderRadius: 12, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  watchText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  empty: { minHeight: 220, borderRadius: 23, backgroundColor: '#13171D', borderWidth: 1, borderColor: '#2B313B', padding: 22, justifyContent: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  emptyTitle: { color: PAPER, fontSize: 21, fontWeight: '900', marginTop: 14 },
  emptyText: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 4 },
  modalShade: { flex: 1, backgroundColor: 'rgba(2,3,5,0.76)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '86%', backgroundColor: '#11151B', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: '#343B46' },
  modalHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: PAPER, fontSize: 25, fontWeight: '900', marginTop: 2 },
  close: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#222832', alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingHorizontal: 18, paddingBottom: 28 },
  videoPicker: { minHeight: 150, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B424D', backgroundColor: '#171B22', alignItems: 'center', justifyContent: 'center', gap: 7 },
  videoPickerReady: { backgroundColor: ACID, borderColor: ACID, borderStyle: 'solid' },
  videoPickerTitle: { color: PAPER, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  videoPickerSub: { color: MUTED, fontSize: 9 },
  inputBlock: { marginTop: 14 },
  inputLabel: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginBottom: 6 },
  input: { minHeight: 50, borderRadius: 14, backgroundColor: '#1A1F27', borderWidth: 1, borderColor: '#303743', color: PAPER, paddingHorizontal: 13, fontSize: 14, fontWeight: '700' },
  postButton: { minHeight: 52, borderRadius: 15, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  postButtonDisabled: { opacity: 0.4 },
  postButtonText: { color: INK, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
