import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Eye, Heart, Play, Plus, Upload, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { uploadSkateTVClip } from '../lib/uploadMedia';
import { useAuthStore } from '../stores/useAuthStore';

interface Clip {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string;
  trick_name: string | null;
  park_name: string | null;
  likes: number;
  views: number;
  featured: boolean;
  created_at: string;
  profiles: { username?: string | null } | null;
}

type TabKey = 'featured' | 'recent';

type LikeResult = { liked?: boolean; likes?: number };
type ViewResult = { views?: number };

const ACCENT = '#D2673D';

export default function SkateTVVerifiedScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [likedClipIds, setLikedClipIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('recent');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTrick, setUploadTrick] = useState('');
  const [uploadPark, setUploadPark] = useState('');

  const loadClips = useCallback(async () => {
    try {
      setLoadError(null);
      let query = supabase
        .from('skatetv_clips')
        .select('id,user_id,video_url,thumbnail_url,title,trick_name,park_name,likes,views,featured,created_at,profiles(username)')
        .order('created_at', { ascending: false })
        .limit(40);

      if (activeTab === 'featured') query = query.eq('featured', true);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as Clip[];
      setClips(rows);

      if (user?.id && rows.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from('skatetv_likes')
          .select('clip_id')
          .eq('user_id', user.id)
          .in('clip_id', rows.map(row => row.id));
        if (likesError) throw likesError;
        setLikedClipIds(new Set((likes ?? []).map((item: any) => String(item.clip_id))));
      } else {
        setLikedClipIds(new Set());
      }
    } catch (error: any) {
      console.error('SkateTV load failed:', error);
      setClips([]);
      setLoadError(error?.message || 'SkateTV could not load right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, user?.id]);

  useEffect(() => {
    setLoading(true);
    void loadClips();
  }, [loadClips]);

  const toggleLike = async (clip: Clip) => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to like SkateTV clips.');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('toggle_skatetv_like', { p_clip_id: clip.id });
      if (error) throw error;
      const result = (data ?? {}) as LikeResult;
      const liked = Boolean(result.liked);
      const likes = Number(result.likes ?? clip.likes);

      setLikedClipIds(current => {
        const next = new Set(current);
        if (liked) next.add(clip.id);
        else next.delete(clip.id);
        return next;
      });
      setClips(current => current.map(item => item.id === clip.id ? { ...item, likes } : item));
    } catch (error: any) {
      Alert.alert('Like not saved', error?.message || 'Please try again.');
    }
  };

  const watchClip = async (clip: Clip) => {
    if (!clip.video_url) {
      Alert.alert('Video unavailable', 'This clip does not have a playable video URL.');
      return;
    }

    try {
      if (user?.id) {
        const { data, error } = await supabase.rpc('record_skatetv_view', { p_clip_id: clip.id });
        if (error) throw error;
        const result = (data ?? {}) as ViewResult;
        const views = Number(result.views ?? clip.views);
        setClips(current => current.map(item => item.id === clip.id ? { ...item, views } : item));
      }

      const supported = await Linking.canOpenURL(clip.video_url);
      if (!supported) throw new Error('This video URL cannot be opened on this device.');
      await Linking.openURL(clip.video_url);
    } catch (error: any) {
      Alert.alert('Video could not open', error?.message || 'Please try again.');
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow media access to choose a real video clip.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setUploadVideo(result.assets[0].uri);
    }
  };

  const resetUpload = () => {
    setUploadVideo(null);
    setUploadTitle('');
    setUploadTrick('');
    setUploadPark('');
  };

  const submitClip = async () => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in before posting a clip.');
      return;
    }
    if (!uploadVideo) {
      Alert.alert('Choose a video', 'Select a real skate clip first.');
      return;
    }
    if (!uploadTitle.trim()) {
      Alert.alert('Add a title', 'Give your clip a title before posting.');
      return;
    }

    setUploading(true);
    try {
      const { url, error: uploadError } = await uploadSkateTVClip(uploadVideo, user.id);
      if (uploadError || !url) throw new Error(uploadError || 'Video upload failed.');

      const { error } = await supabase.from('skatetv_clips').insert({
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
      if (error) throw error;

      setUploadModal(false);
      resetUpload();
      setActiveTab('recent');
      await loadClips();
      Alert.alert('Clip posted', 'Your real clip is live on SkateTV.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const header = useMemo(() => (
    <>
      <View style={s.header}>
        <View style={s.headerTextWrap}>
          <Text style={s.kicker}>REAL COMMUNITY CLIPS</Text>
          <Text style={s.title}>SkateTV</Text>
          <Text style={s.sub}>No demo videos, no made-up engagement. Every card comes from an actual posted clip.</Text>
        </View>
        <TouchableOpacity style={s.postButton} onPress={() => setUploadModal(true)}>
          <Plus color="#fff" size={17} strokeWidth={3} />
          <Text style={s.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {(['recent', 'featured'] as TabKey[]).map(tab => {
          const selected = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tab, selected && s.tabSelected]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, selected && s.tabTextSelected]}>
                {tab === 'recent' ? 'Recent' : 'Featured'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loadError ? (
        <View style={s.errorCard}>
          <Text style={s.errorTitle}>SkateTV did not load</Text>
          <Text style={s.errorText}>{loadError}</Text>
          <TouchableOpacity style={s.retryButton} onPress={() => void loadClips()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  ), [activeTab, loadError, loadClips]);

  return (
    <SafeAreaView style={s.container}>
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={s.loadingText}>Loading real clips…</Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={item => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={ACCENT}
              onRefresh={() => {
                setRefreshing(true);
                void loadClips();
              }}
            />
          }
          renderItem={({ item }) => {
            const liked = likedClipIds.has(item.id);
            return (
              <View style={s.card}>
                <TouchableOpacity style={s.thumbnail} onPress={() => void watchClip(item)} activeOpacity={0.9}>
                  {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={s.thumbnailImage} />
                  ) : (
                    <View style={s.noThumbnail}>
                      <Camera color="#5F6B7A" size={42} />
                      <Text style={s.noThumbnailText}>Video posted without a thumbnail</Text>
                    </View>
                  )}
                  <View style={s.playButton}>
                    <Play color="#fff" size={22} fill="#fff" />
                  </View>
                  {item.featured ? <Text style={s.featuredBadge}>FEATURED</Text> : null}
                </TouchableOpacity>

                <View style={s.cardBody}>
                  <Text style={s.clipTitle}>{item.title}</Text>
                  <Text style={s.username}>@{item.profiles?.username || 'Unknown skater'}</Text>
                  {item.trick_name ? <Text style={s.detail}>{item.trick_name}</Text> : null}
                  {item.park_name ? <Text style={s.detail}>📍 {item.park_name}</Text> : null}

                  <View style={s.engagementRow}>
                    <TouchableOpacity style={s.engagementButton} onPress={() => void toggleLike(item)}>
                      <Heart color={liked ? '#FF5C6C' : '#9AA4B2'} fill={liked ? '#FF5C6C' : 'transparent'} size={20} />
                      <Text style={s.engagementText}>{item.likes}</Text>
                    </TouchableOpacity>
                    <View style={s.engagementButton}>
                      <Eye color="#9AA4B2" size={20} />
                      <Text style={s.engagementText}>{item.views}</Text>
                    </View>
                    <TouchableOpacity style={s.watchButton} onPress={() => void watchClip(item)}>
                      <Play color="#fff" size={15} fill="#fff" />
                      <Text style={s.watchText}>Watch</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loadError ? (
              <View style={s.empty}>
                <Camera color="#596579" size={48} />
                <Text style={s.emptyTitle}>{activeTab === 'featured' ? 'No featured clips yet' : 'No clips yet'}</Text>
                <Text style={s.emptyText}>
                  {activeTab === 'featured'
                    ? 'Featured stays empty until a real clip is actually featured.'
                    : 'Be the first skater to post a real clip.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Post a real clip</Text>
                <Text style={s.modalSub}>Your video is uploaded to SkateQuest before the post appears.</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadModal(false)} style={s.closeButton}>
                <X color="#C4CBD4" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              <TouchableOpacity style={[s.videoPicker, uploadVideo && s.videoPickerSelected]} onPress={() => void pickVideo()}>
                <Upload color={uploadVideo ? '#4ADE80' : ACCENT} size={28} />
                <Text style={s.videoPickerTitle}>{uploadVideo ? 'Video selected' : 'Choose skate video'}</Text>
                <Text style={s.videoPickerText}>{uploadVideo ? 'Tap to choose a different clip.' : 'Video only · up to 60 seconds.'}</Text>
              </TouchableOpacity>

              <Text style={s.label}>Title *</Text>
              <TextInput style={s.input} placeholder="What happened in this clip?" placeholderTextColor="#687386" value={uploadTitle} onChangeText={setUploadTitle} />
              <Text style={s.label}>Trick</Text>
              <TextInput style={s.input} placeholder="Kickflip, boardslide, line…" placeholderTextColor="#687386" value={uploadTrick} onChangeText={setUploadTrick} />
              <Text style={s.label}>Spot</Text>
              <TextInput style={s.input} placeholder="Where did you skate?" placeholderTextColor="#687386" value={uploadPark} onChangeText={setUploadPark} />

              <TouchableOpacity
                style={[s.submitButton, (!uploadVideo || !uploadTitle.trim() || uploading) && s.submitButtonDisabled]}
                disabled={!uploadVideo || !uploadTitle.trim() || uploading}
                onPress={() => void submitClip()}
              >
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitButtonText}>Post to SkateTV</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  listContent: { paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#748094', marginTop: 12 },
  header: { padding: 20, paddingBottom: 12, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  headerTextWrap: { flex: 1 },
  kicker: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#F7F4EF', fontSize: 33, fontWeight: '900', marginTop: 4 },
  sub: { color: '#8994A5', fontSize: 13, lineHeight: 19, marginTop: 5 },
  postButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  postButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  tab: { backgroundColor: '#111823', borderWidth: 1, borderColor: '#222E3D', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  tabSelected: { backgroundColor: 'rgba(210,103,61,0.16)', borderColor: 'rgba(210,103,61,0.65)' },
  tabText: { color: '#8A95A6', fontWeight: '800', fontSize: 12 },
  tabTextSelected: { color: '#F29A74' },
  errorCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#221316', borderWidth: 1, borderColor: '#5B252D', borderRadius: 14, padding: 14 },
  errorTitle: { color: '#FF9DA8', fontWeight: '900' },
  errorText: { color: '#C8A6AB', marginTop: 4, fontSize: 12 },
  retryButton: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#6B2932', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { color: '#fff', fontWeight: '800' },
  card: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#101722', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937' },
  thumbnail: { height: 210, backgroundColor: '#090D13', alignItems: 'center', justifyContent: 'center' },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  noThumbnail: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  noThumbnailText: { color: '#687386', fontSize: 12, textAlign: 'center' },
  playButton: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(210,103,61,0.94)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  featuredBadge: { position: 'absolute', top: 12, left: 12, color: '#fff', backgroundColor: ACCENT, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardBody: { padding: 15 },
  clipTitle: { color: '#F7F4EF', fontSize: 18, fontWeight: '900' },
  username: { color: '#7E8999', fontSize: 12, marginTop: 4 },
  detail: { color: '#B3BBC6', fontSize: 12, marginTop: 6 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: '#1E2936' },
  engagementButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  engagementText: { color: '#A8B1BE', fontSize: 12, fontWeight: '700' },
  watchButton: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  watchText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 70 },
  emptyTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '900', marginTop: 15 },
  emptyText: { color: '#6E798A', textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', backgroundColor: '#101722', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#243043' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#202B39' },
  modalTitle: { color: '#F7F4EF', fontSize: 20, fontWeight: '900' },
  modalSub: { color: '#778296', fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 310 },
  closeButton: { padding: 4 },
  modalBody: { padding: 20, paddingBottom: 35 },
  videoPicker: { minHeight: 130, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#465266', backgroundColor: '#0A0F17', padding: 18 },
  videoPickerSelected: { borderColor: '#3E8A58', backgroundColor: '#0D1912' },
  videoPickerTitle: { color: '#F0F3F6', fontWeight: '900', marginTop: 10 },
  videoPickerText: { color: '#6D788A', fontSize: 12, marginTop: 4 },
  label: { color: '#AAB2BF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 17, marginBottom: 7 },
  input: { backgroundColor: '#080C12', borderWidth: 1, borderColor: '#253043', color: '#F5F5F5', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  submitButton: { marginTop: 22, minHeight: 50, borderRadius: 13, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
