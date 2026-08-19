import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Check,
  Clock3,
  Eye,
  Flame,
  Heart,
  MapPin,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  UserRound,
  Video,
  X,
} from 'lucide-react-native';
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
  profiles: { username: string } | null;
}

type FeedTab = 'featured' | 'recent';

export default function SkateTVScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<FeedTab>('featured');
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTrick, setUploadTrick] = useState('');
  const [uploadPark, setUploadPark] = useState('');

  const loadClips = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setFeedError(null);

      try {
        let query = supabase
          .from('skatetv_clips')
          .select('*, profiles(username)')
          .order('created_at', { ascending: false })
          .limit(30);

        if (activeTab === 'featured') query = query.eq('featured', true);

        const { data, error } = await query;
        if (error) throw error;
        setClips((data || []) as Clip[]);

        if (user) {
          const { data: likesData } = await supabase
            .from('skatetv_likes')
            .select('clip_id')
            .eq('user_id', user.id);
          if (likesData) {
            setLikedClips(new Set(likesData.map((like: { clip_id: string }) => like.clip_id)));
          }
        } else {
          setLikedClips(new Set());
        }
      } catch (error) {
        setFeedError(error instanceof Error ? error.message : 'SkateTV could not load right now.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, user]
  );

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  const stats = useMemo(
    () => ({
      clips: clips.length,
      views: clips.reduce((total, clip) => total + (clip.views || 0), 0),
      likes: clips.reduce((total, clip) => total + (clip.likes || 0), 0),
    }),
    [clips]
  );

  const likeClip = async (clipId: string, currentLikes: number) => {
    if (!user) {
      Alert.alert('Sign in to like clips', 'Your likes are saved to your SkateQuest account.');
      return;
    }
    if (likedClips.has(clipId)) return;

    const nextLikes = currentLikes + 1;
    setLikedClips(previous => new Set([...previous, clipId]));
    setClips(previous =>
      previous.map(clip => (clip.id === clipId ? { ...clip, likes: nextLikes } : clip))
    );

    const { error: likeError } = await supabase
      .from('skatetv_likes')
      .insert({ user_id: user.id, clip_id: clipId });

    if (likeError) {
      setLikedClips(previous => {
        const next = new Set(previous);
        next.delete(clipId);
        return next;
      });
      setClips(previous =>
        previous.map(clip => (clip.id === clipId ? { ...clip, likes: currentLikes } : clip))
      );
      Alert.alert('Like not saved', likeError.message);
      return;
    }

    const { error: countError } = await supabase
      .from('skatetv_clips')
      .update({ likes: nextLikes })
      .eq('id', clipId);

    if (countError) {
      await supabase.from('skatetv_likes').delete().eq('user_id', user.id).eq('clip_id', clipId);
      setLikedClips(previous => {
        const next = new Set(previous);
        next.delete(clipId);
        return next;
      });
      setClips(previous =>
        previous.map(clip => (clip.id === clipId ? { ...clip, likes: currentLikes } : clip))
      );
      Alert.alert('Like not saved', countError.message);
    }
  };

  const watchClip = async (clip: Clip) => {
    const nextViews = (clip.views || 0) + 1;
    const { error } = await supabase
      .from('skatetv_clips')
      .update({ views: nextViews })
      .eq('id', clip.id);

    if (!error) {
      setClips(previous =>
        previous.map(item => (item.id === clip.id ? { ...item, views: nextViews } : item))
      );
    }

    try {
      await Linking.openURL(clip.video_url);
    } catch {
      Alert.alert('Video could not open', 'The clip link is unavailable.');
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow media access to choose a clip to upload.');
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

  const resetUpload = () => {
    setUploadVideo(null);
    setUploadTitle('');
    setUploadTrick('');
    setUploadPark('');
  };

  const submitClip = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before posting to SkateTV.');
      return;
    }
    if (!uploadVideo) return;
    if (!uploadTitle.trim()) {
      Alert.alert('Add a title', 'Tell skaters what this clip is about.');
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
      resetUpload();
      setActiveTab('recent');
      Alert.alert('Clip posted', 'Your clip is live on SkateTV.');
      await loadClips(true);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={s.heroIcon}>
            <Video color="#F5E8DE" size={24} />
          </View>
          <View style={s.heroCopy}>
            <Text style={s.eyebrow}>SKATEQUEST VIDEO</Text>
            <Text style={s.title}>SkateTV</Text>
            <Text style={s.sub}>Watch real community clips, post your own, and turn sessions into proof.</Text>
          </View>
        </View>

        <View style={s.statRow}>
          <Stat label="CLIPS" value={stats.clips} icon={<Video color="#D2673D" size={15} />} />
          <Stat label="VIEWS" value={stats.views} icon={<Eye color="#D2673D" size={15} />} />
          <Stat label="LIKES" value={stats.likes} icon={<Heart color="#D2673D" size={15} />} />
        </View>

        <TouchableOpacity style={s.uploadBtn} onPress={() => setUploadModal(true)}>
          <Upload color="#FFFFFF" size={18} />
          <Text style={s.uploadTxt}>Post a clip</Text>
        </TouchableOpacity>
      </View>

      <View style={s.sectionHead}>
        <View>
          <Text style={s.sectionEyebrow}>COMMUNITY FEED</Text>
          <Text style={s.sectionTitle}>{activeTab === 'featured' ? 'Featured runs' : 'Fresh clips'}</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Refresh SkateTV" onPress={() => void loadClips(true)} style={s.refreshBtn}>
          <RefreshCw color="#AEB6C2" size={18} />
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        <FeedTabButton
          active={activeTab === 'featured'}
          label="Featured"
          icon={<Flame color={activeTab === 'featured' ? '#FFFFFF' : '#7F8793'} size={16} />}
          onPress={() => setActiveTab('featured')}
        />
        <FeedTabButton
          active={activeTab === 'recent'}
          label="Recent"
          icon={<Clock3 color={activeTab === 'recent' ? '#FFFFFF' : '#7F8793'} size={16} />}
          onPress={() => setActiveTab('recent')}
        />
      </View>

      {feedError ? (
        <View style={s.errorCard}>
          <Text style={s.errorTitle}>SkateTV did not load</Text>
          <Text style={s.errorText}>{feedError}</Text>
          <TouchableOpacity style={s.errorAction} onPress={() => void loadClips()}>
            <RefreshCw color="#FFFFFF" size={16} />
            <Text style={s.errorActionText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={clips}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadClips(true)} tintColor="#D2673D" />
        }
        contentContainerStyle={s.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity style={s.thumb} onPress={() => void watchClip(item)} activeOpacity={0.9}>
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={s.thumbImg} contentFit="cover" />
              ) : (
                <View style={s.thumbPlaceholder}>
                  <Sparkles color="#D2673D" size={28} />
                  <Text style={s.thumbPlaceholderTitle}>Community clip</Text>
                  <Text style={s.thumbPlaceholderSub}>Tap to watch</Text>
                </View>
              )}
              {item.featured ? (
                <View style={s.featuredBadge}>
                  <Flame color="#FFFFFF" size={12} />
                  <Text style={s.featuredText}>FEATURED</Text>
                </View>
              ) : null}
              <View style={s.playBtn}>
                <Play color="#FFFFFF" fill="#FFFFFF" size={22} />
              </View>
            </TouchableOpacity>

            <View style={s.info}>
              <View style={s.identityRow}>
                <View style={s.avatar}>
                  <UserRound color="#D2673D" size={18} />
                </View>
                <View style={s.infoText}>
                  <Text style={s.clipTitle}>{item.title || 'Skate clip'}</Text>
                  <Text style={s.username}>@{item.profiles?.username || 'skater'}</Text>
                </View>
              </View>

              <View style={s.metaRow}>
                {item.trick_name ? <MetaChip text={item.trick_name} /> : null}
                {item.park_name ? <MetaChip text={item.park_name} icon={<MapPin color="#AEB6C2" size={12} />} /> : null}
              </View>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.metricButton, likedClips.has(item.id) && s.metricButtonActive]}
                  onPress={() => void likeClip(item.id, item.likes || 0)}
                >
                  <Heart
                    color={likedClips.has(item.id) ? '#F5E8DE' : '#AEB6C2'}
                    fill={likedClips.has(item.id) ? '#D2673D' : 'transparent'}
                    size={18}
                  />
                  <Text style={s.metricText}>{item.likes || 0}</Text>
                </TouchableOpacity>
                <View style={s.metricButton}>
                  <Eye color="#AEB6C2" size={18} />
                  <Text style={s.metricText}>{item.views || 0}</Text>
                </View>
                <TouchableOpacity style={s.watchBtn} onPress={() => void watchClip(item)}>
                  <Play color="#FFFFFF" fill="#FFFFFF" size={15} />
                  <Text style={s.watchText}>Watch</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={s.loadingState}>
              <ActivityIndicator color="#D2673D" size="large" />
              <Text style={s.loadingText}>Loading SkateTV…</Text>
            </View>
          ) : !feedError ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Video color="#D2673D" size={28} />
              </View>
              <Text style={s.emptyTitle}>{activeTab === 'featured' ? 'No featured clips yet' : 'No clips posted yet'}</Text>
              <Text style={s.emptyText}>
                {activeTab === 'featured'
                  ? 'Featured clips will show here when the community has something worth spotlighting.'
                  : 'Post the first real clip from your session.'}
              </Text>
              {activeTab === 'recent' ? (
                <TouchableOpacity style={s.emptyAction} onPress={() => setUploadModal(true)}>
                  <Upload color="#FFFFFF" size={16} />
                  <Text style={s.emptyActionText}>Post a clip</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null
        }
      />

      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>SKATETV UPLOAD</Text>
                <Text style={s.modalTitle}>Post your clip</Text>
              </View>
              <TouchableOpacity style={s.closeButton} onPress={() => setUploadModal(false)} accessibilityLabel="Close upload">
                <X color="#C4CBD4" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={[s.videoPicker, uploadVideo && s.videoPickerDone]} onPress={pickVideo}>
                {uploadVideo ? (
                  <>
                    <View style={s.selectedIcon}>
                      <Check color="#FFFFFF" size={22} />
                    </View>
                    <Text style={s.videoPickerDoneText}>Video selected</Text>
                    <Text style={s.videoPickerSub}>Tap to choose a different clip</Text>
                  </>
                ) : (
                  <>
                    <View style={s.pickerIcon}>
                      <Video color="#D2673D" size={26} />
                    </View>
                    <Text style={s.videoPickerText}>Choose a skate clip</Text>
                    <Text style={s.videoPickerSub}>Up to 60 seconds · MP4 or MOV</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={s.label}>TITLE *</Text>
              <TextInput
                style={s.input}
                placeholder="What happened in this clip?"
                placeholderTextColor="#59616D"
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />

              <Text style={s.label}>TRICK</Text>
              <TextInput
                style={s.input}
                placeholder="Kickflip, boardslide, line…"
                placeholderTextColor="#59616D"
                value={uploadTrick}
                onChangeText={setUploadTrick}
              />

              <Text style={s.label}>SPOT</Text>
              <TextInput
                style={s.input}
                placeholder="Where did you skate?"
                placeholderTextColor="#59616D"
                value={uploadPark}
                onChangeText={setUploadPark}
              />

              <View style={s.proofNote}>
                <Sparkles color="#D2673D" size={17} />
                <Text style={s.proofNoteText}>SkateTV clips can also be used by real SkateQuest proof flows.</Text>
              </View>

              <TouchableOpacity
                style={[s.postBtn, (!uploadVideo || uploading) && s.postBtnDisabled]}
                onPress={() => void submitClip()}
                disabled={!uploadVideo || uploading}
              >
                {uploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Upload color="#FFFFFF" size={18} />}
                <Text style={s.postBtnText}>{uploading ? 'Uploading…' : 'Post to SkateTV'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <View style={s.stat}>
      <View style={s.statLabelRow}>{icon}<Text style={s.statLabel}>{label}</Text></View>
      <Text style={s.statValue}>{value.toLocaleString()}</Text>
    </View>
  );
}

function FeedTabButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.tab, active && s.tabActive]} onPress={onPress}>
      {icon}
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetaChip({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <View style={s.metaChip}>
      {icon}
      <Text style={s.metaChipText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  listContent: { padding: 14, paddingBottom: 36, gap: 14 },
  hero: { backgroundColor: '#10151D', borderRadius: 24, borderWidth: 1, borderColor: '#29303A', padding: 18, marginBottom: 22 },
  heroTop: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#D2673D', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  eyebrow: { color: '#D2673D', fontSize: 11, letterSpacing: 1.5, fontWeight: '900' },
  title: { color: '#F7F8FA', fontSize: 31, fontWeight: '900', marginTop: 2 },
  sub: { color: '#929AA6', fontSize: 13, lineHeight: 19, marginTop: 5 },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 17 },
  stat: { flex: 1, backgroundColor: '#0A0E14', borderRadius: 15, borderWidth: 1, borderColor: '#242A33', padding: 11 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { color: '#747D89', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#F4F6F8', fontSize: 18, fontWeight: '900', marginTop: 5 },
  uploadBtn: { marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: '#D2673D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadTxt: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionEyebrow: { color: '#727B87', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: '#F3F5F7', fontSize: 21, fontWeight: '900', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#11161E', borderWidth: 1, borderColor: '#29303A', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: '#11161E', borderWidth: 1, borderColor: '#29303A' },
  tabActive: { backgroundColor: '#D2673D', borderColor: '#D2673D' },
  tabText: { color: '#7F8793', fontWeight: '800', fontSize: 13 },
  tabTextActive: { color: '#FFFFFF' },
  errorCard: { backgroundColor: '#19100E', borderWidth: 1, borderColor: '#693522', borderRadius: 17, padding: 14, marginBottom: 14 },
  errorTitle: { color: '#F5E8DE', fontWeight: '900', fontSize: 15 },
  errorText: { color: '#B99A8C', fontSize: 12, marginTop: 4, lineHeight: 18 },
  errorAction: { alignSelf: 'flex-start', marginTop: 11, flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#D2673D', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  errorActionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  card: { backgroundColor: '#10151D', borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: '#29303A' },
  thumb: { height: 220, backgroundColor: '#080B10', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  thumbPlaceholderTitle: { color: '#D8DDE3', fontWeight: '900', marginTop: 4 },
  thumbPlaceholderSub: { color: '#68717D', fontSize: 12 },
  featuredBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D2673D', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  featuredText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  playBtn: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(210,103,61,0.94)', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 14 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 39, height: 39, borderRadius: 13, backgroundColor: '#211612', borderWidth: 1, borderColor: '#5A3325', alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1 },
  clipTitle: { color: '#F3F5F7', fontWeight: '900', fontSize: 16 },
  username: { color: '#747D89', fontSize: 12, fontWeight: '700', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  metaChip: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: '#151B24', borderWidth: 1, borderColor: '#29313C', paddingHorizontal: 9, paddingVertical: 6 },
  metaChipText: { color: '#AEB6C2', fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  metricButton: { height: 39, minWidth: 58, paddingHorizontal: 11, borderRadius: 12, backgroundColor: '#0B1016', borderWidth: 1, borderColor: '#29303A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  metricButtonActive: { backgroundColor: '#211612', borderColor: '#5A3325' },
  metricText: { color: '#AEB6C2', fontWeight: '800', fontSize: 12 },
  watchBtn: { marginLeft: 'auto', minHeight: 39, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#D2673D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  watchText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  loadingState: { alignItems: 'center', paddingVertical: 54, gap: 12 },
  loadingText: { color: '#7E8793', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#17110F', borderWidth: 1, borderColor: '#4E2D22', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#EEF1F4', fontWeight: '900', fontSize: 18, marginTop: 14 },
  emptyText: { color: '#757E8A', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  emptyAction: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#D2673D', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10 },
  emptyActionText: { color: '#FFFFFF', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0D1219', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: '#29303A', maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 19, borderBottomWidth: 1, borderBottomColor: '#20262F' },
  modalEyebrow: { color: '#D2673D', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  modalTitle: { color: '#F4F6F8', fontSize: 21, fontWeight: '900', marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#151B23', borderWidth: 1, borderColor: '#29303A', alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingHorizontal: 19 },
  modalBodyContent: { paddingTop: 18, paddingBottom: 28 },
  videoPicker: { minHeight: 152, backgroundColor: '#090D12', borderRadius: 18, borderWidth: 1.5, borderColor: '#303743', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 22, marginBottom: 18 },
  videoPickerDone: { borderStyle: 'solid', borderColor: '#75432F', backgroundColor: '#17110F' },
  pickerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#17110F', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  selectedIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#D2673D', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  videoPickerText: { color: '#E1E5E9', fontWeight: '900', fontSize: 15 },
  videoPickerDoneText: { color: '#F4E4DA', fontWeight: '900', fontSize: 15 },
  videoPickerSub: { color: '#707985', fontSize: 12, marginTop: 4 },
  label: { color: '#858E99', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: '#090D12', color: '#F2F4F6', borderRadius: 13, paddingHorizontal: 13, fontSize: 14, borderWidth: 1, borderColor: '#29303A', marginBottom: 15 },
  proofNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#17110F', borderRadius: 13, padding: 12, marginBottom: 17, borderWidth: 1, borderColor: '#4E2D22' },
  proofNoteText: { color: '#C5937D', fontSize: 12, lineHeight: 18, flex: 1 },
  postBtn: { minHeight: 50, backgroundColor: '#D2673D', borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
