import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Eye, Flame, Heart, MapPin, Play, Plus, Sparkles, Upload, Video } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { uploadSkateTVClip } from '../lib/uploadMedia';
import { useAuthStore } from '../stores/useAuthStore';

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
  profiles: { username: string };
}

export default function SkateTVScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'recent'>('featured');
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTrick, setUploadTrick] = useState('');
  const [uploadPark, setUploadPark] = useState('');

  useEffect(() => {
    void loadClips();
  }, [activeTab]);

  const loadClips = async () => {
    let query = supabase
      .from('skatetv_clips')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (activeTab === 'featured') query = query.eq('featured', true);
    const { data } = await query;
    setClips(data || []);
    setRefreshing(false);
  };

  const stats = useMemo(() => ({
    clips: clips.length,
    views: clips.reduce((sum, clip) => sum + (clip.views || 0), 0),
    likes: clips.reduce((sum, clip) => sum + (clip.likes || 0), 0),
  }), [clips]);

  const likeClip = async (clipId: string, currentLikes: number) => {
    if (!user || likedClips.has(clipId)) return;
    setLikedClips(prev => new Set([...prev, clipId]));
    setClips(prev => prev.map(c => (c.id === clipId ? { ...c, likes: c.likes + 1 } : c)));
    await supabase.from('skatetv_likes').insert({ user_id: user.id, clip_id: clipId });
    await supabase.from('skatetv_clips').update({ likes: currentLikes + 1 }).eq('id', clipId);
  };

  const watchClip = async (clip: Clip) => {
    setClips(prev => prev.map(c => c.id === clip.id ? { ...c, views: c.views + 1 } : c));
    await supabase.from('skatetv_clips').update({ views: clip.views + 1 }).eq('id', clip.id);
    Linking.openURL(clip.video_url).catch(() => Alert.alert('Could not open clip', 'Try again in a moment.'));
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Need camera roll access to upload clips');
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
    if (!user || !uploadVideo) return;
    if (!uploadTitle.trim()) {
      Alert.alert('Add a title', 'Tell people what this clip is about');
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
      await loadClips();
      Alert.alert('Clip is live', 'Your clip was posted to SkateTV.');
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={clips}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadClips(); }} tintColor="#D2673D" />}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.heroTop}>
                <View style={{ flex: 1 }}>
                  <View style={s.kickerRow}><Video size={14} color="#D2673D" /><Text style={s.kicker}>SKATEQUEST VIDEO</Text></View>
                  <Text style={s.title}>SkateTV</Text>
                  <Text style={s.sub}>Community clips, real spots, real tricks.</Text>
                </View>
                <TouchableOpacity style={s.uploadBtn} onPress={() => setUploadModal(true)}>
                  <Plus size={18} color="#fff" strokeWidth={3} />
                  <Text style={s.uploadTxt}>Post</Text>
                </TouchableOpacity>
              </View>

              <View style={s.statsRow}>
                <View style={s.stat}><Text style={s.statValue}>{stats.clips}</Text><Text style={s.statLabel}>CLIPS</Text></View>
                <View style={s.stat}><Text style={s.statValue}>{stats.views}</Text><Text style={s.statLabel}>VIEWS</Text></View>
                <View style={s.stat}><Text style={s.statValue}>{stats.likes}</Text><Text style={s.statLabel}>LIKES</Text></View>
              </View>
            </View>

            <View style={s.tabs}>
              {(['featured', 'recent'] as const).map(tab => (
                <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabOn]} onPress={() => setActiveTab(tab)}>
                  {tab === 'featured' ? <Flame size={16} color={activeTab === tab ? '#fff' : '#7B8493'} /> : <Sparkles size={16} color={activeTab === tab ? '#fff' : '#7B8493'} />}
                  <Text style={[s.tabTxt, activeTab === tab && s.tabTxtOn]}>{tab === 'featured' ? 'Featured' : 'Fresh'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={[s.card, index === 0 && item.featured && s.cardHero]}>
            <TouchableOpacity style={[s.thumb, index === 0 && item.featured && s.thumbHero]} onPress={() => void watchClip(item)} activeOpacity={0.9}>
              {item.thumbnail_url ? <Image source={{ uri: item.thumbnail_url }} style={s.thumbImg} contentFit="cover" /> : (
                <View style={s.thumbPlaceholder}><Video color="#D2673D" size={42} strokeWidth={1.8} /><Text style={s.noThumb}>Clip ready to watch</Text></View>
              )}
              <View style={s.scrim} />
              {item.featured ? <View style={s.featBadge}><Flame size={12} color="#fff" /><Text style={s.featTxt}>FEATURED</Text></View> : null}
              <View style={s.playBtn}><Play color="#fff" size={22} fill="#fff" /></View>
              <View style={s.thumbMeta}>
                <Text style={s.clipTitle} numberOfLines={2}>{item.title || 'Skate clip'}</Text>
                <Text style={s.username}>@{item.profiles?.username || 'skater'}</Text>
              </View>
            </TouchableOpacity>

            <View style={s.info}>
              <View style={s.tagsRow}>
                {item.trick_name ? <View style={s.tag}><Text style={s.tagText}>{item.trick_name}</Text></View> : null}
                {item.park_name ? <View style={s.locationTag}><MapPin size={12} color="#9CA3AF" /><Text style={s.locationText} numberOfLines={1}>{item.park_name}</Text></View> : null}
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.action} onPress={() => void likeClip(item.id, item.likes)}>
                  <Heart size={19} color={likedClips.has(item.id) ? '#D2673D' : '#9CA3AF'} fill={likedClips.has(item.id) ? '#D2673D' : 'transparent'} />
                  <Text style={s.actionCount}>{item.likes}</Text>
                </TouchableOpacity>
                <View style={s.action}><Eye size={19} color="#9CA3AF" /><Text style={s.actionCount}>{item.views}</Text></View>
                <TouchableOpacity style={s.watchBtn} onPress={() => void watchClip(item)}><Play size={14} color="#fff" fill="#fff" /><Text style={s.watchTxt}>Watch clip</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <TouchableOpacity style={s.empty} onPress={() => setUploadModal(true)}>
            <Video color="#D2673D" size={42} />
            <Text style={s.emptyTitle}>{activeTab === 'featured' ? 'No featured clips yet' : 'No clips yet'}</Text>
            <Text style={s.emptyText}>Post a real skate clip and get the feed moving.</Text>
            <View style={s.emptyCta}><Upload size={16} color="#fff" /><Text style={s.emptyCtaText}>Post a clip</Text></View>
          </TouchableOpacity>
        }
      />

      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View><Text style={s.modalKicker}>DROP A CLIP</Text><Text style={s.modalTitle}>Post to SkateTV</Text></View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setUploadModal(false)}><Text style={s.closeTxt}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 26 }}>
              <TouchableOpacity style={[s.videoPicker, uploadVideo && s.videoPickerDone]} onPress={pickVideo}>
                <Upload size={30} color={uploadVideo ? '#4ADE80' : '#D2673D'} />
                <Text style={[s.videoPickerTxt, uploadVideo && { color: '#4ADE80' }]}>{uploadVideo ? 'Video selected — tap to change' : 'Choose your skate clip'}</Text>
                <Text style={s.videoPickerSub}>Up to 60 seconds</Text>
              </TouchableOpacity>

              <Text style={s.lbl}>Title *</Text>
              <TextInput style={s.input} placeholder="What went down?" placeholderTextColor="#596273" value={uploadTitle} onChangeText={setUploadTitle} />
              <Text style={s.lbl}>Trick</Text>
              <TextInput style={s.input} placeholder="Kickflip, boardslide, line..." placeholderTextColor="#596273" value={uploadTrick} onChangeText={setUploadTrick} />
              <Text style={s.lbl}>Spot</Text>
              <TextInput style={s.input} placeholder="Where did you skate?" placeholderTextColor="#596273" value={uploadPark} onChangeText={setUploadPark} />

              <View style={s.proofNote}><Sparkles size={16} color="#D2673D" /><Text style={s.proofNoteTxt}>Your real clip can also support quest and challenge proof flows.</Text></View>

              <TouchableOpacity style={[s.postBtn, (!uploadVideo || uploading) && s.postBtnDis]} onPress={() => void submitClip()} disabled={!uploadVideo || uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <><Upload size={18} color="#fff" /><Text style={s.postBtnTxt}>Post clip</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  list: { padding: 14, paddingBottom: 40, gap: 14 },
  hero: { backgroundColor: '#0F1623', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: '#D2673D', fontWeight: '900', fontSize: 10, letterSpacing: 1.8 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 4 },
  sub: { color: '#8E97A4', fontSize: 13, marginTop: 4 },
  uploadBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#D2673D', paddingHorizontal: 15, paddingVertical: 11, borderRadius: 14 },
  uploadTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
  statsRow: { flexDirection: 'row', marginTop: 18, backgroundColor: '#0A0E16', borderRadius: 16, paddingVertical: 13 },
  stat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#1C2430' },
  statValue: { color: '#F7F4EF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#596273', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#0F1623', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#1C2430' },
  tabOn: { backgroundColor: '#D2673D', borderColor: '#D2673D' },
  tabTxt: { color: '#7B8493', fontSize: 13, fontWeight: '800' },
  tabTxtOn: { color: '#fff' },
  card: { backgroundColor: '#0F1623', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardHero: { borderColor: 'rgba(210,103,61,0.45)' },
  thumb: { height: 235, backgroundColor: '#0A0E16', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  thumbHero: { height: 280 },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', gap: 9 },
  noThumb: { color: '#6F7886', fontSize: 12, fontWeight: '700' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, backgroundColor: 'rgba(0,0,0,0.5)' },
  featBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D2673D', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  featTxt: { color: '#fff', fontWeight: '900', fontSize: 9, letterSpacing: 1 },
  playBtn: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(210,103,61,0.93)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  thumbMeta: { position: 'absolute', left: 14, right: 14, bottom: 13 },
  clipTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  username: { color: '#D6DAE0', fontSize: 12, marginTop: 3, fontWeight: '700' },
  info: { padding: 14 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 13 },
  tag: { backgroundColor: 'rgba(210,103,61,0.13)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.32)', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { color: '#D2673D', fontWeight: '800', fontSize: 11 },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  locationText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', maxWidth: 190 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  watchBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D2673D', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  watchTxt: { color: '#fff', fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 20, padding: 34, borderWidth: 1, borderColor: '#1C2430' },
  emptyTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 19, marginTop: 12 },
  emptyText: { color: '#7B8493', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  emptyCta: { flexDirection: 'row', gap: 7, backgroundColor: '#D2673D', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, marginTop: 18 },
  emptyCtaText: { color: '#fff', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0F1623', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', borderWidth: 1, borderColor: '#1C2430' },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#394252', alignSelf: 'center', marginTop: 9 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1C2430' },
  modalKicker: { color: '#D2673D', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  modalTitle: { color: '#F7F4EF', fontSize: 23, fontWeight: '900', marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A2230', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#A7AFBB', fontSize: 25, lineHeight: 28 },
  modalBody: { padding: 20 },
  videoPicker: { backgroundColor: '#0A0E16', borderRadius: 16, borderWidth: 1.5, borderColor: '#2A3341', borderStyle: 'dashed', padding: 28, alignItems: 'center', marginBottom: 18 },
  videoPickerDone: { borderColor: '#2F7A52', borderStyle: 'solid', backgroundColor: 'rgba(74,222,128,0.05)' },
  videoPickerTxt: { color: '#C8CDD5', fontWeight: '800', fontSize: 14, marginTop: 9 },
  videoPickerSub: { color: '#596273', fontSize: 11, marginTop: 4 },
  lbl: { color: '#9CA3AF', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  input: { backgroundColor: '#0A0E16', color: '#F3F4F6', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, borderWidth: 1, borderColor: '#202938', marginBottom: 14 },
  proofNote: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: 'rgba(210,103,61,0.08)', borderRadius: 13, padding: 13, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(210,103,61,0.2)' },
  proofNoteTxt: { color: '#B7BEC8', fontSize: 12, lineHeight: 18, flex: 1 },
  postBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#D2673D', borderRadius: 14, padding: 16 },
  postBtnDis: { opacity: 0.45 },
  postBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});