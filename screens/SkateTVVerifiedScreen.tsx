import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Eye,
  Flame,
  Heart,
  MapPin,
  Play,
  Plus,
  Sparkles,
  Tv,
  Upload,
  X,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { uploadSkateTVClip } from '../lib/uploadMedia';
import { useAuthStore } from '../stores/useAuthStore';
import { ResizeMode, Video } from '../components/VideoPlayer';

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
  profiles: { username?: string | null } | { username?: string | null }[] | null;
}

type TabKey = 'featured' | 'recent';
type LikeResult = { liked?: boolean; likes?: number };
type ViewResult = { views?: number };

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

function profileName(clip: Clip) {
  const profile = Array.isArray(clip.profiles) ? clip.profiles[0] : clip.profiles;
  return profile?.username || 'Unknown skater';
}

function formatPosted(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'JUST NOW';
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}D AGO`;
  return date.toLocaleDateString();
}

export default function SkateTVVerifiedScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [likedClipIds, setLikedClipIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('recent');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
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
      const rows = (data ?? []) as unknown as Clip[];
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
    setSelectedClipId(null);
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
      const result = (Array.isArray(data) ? data[0] : data ?? {}) as LikeResult;
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

  const playClip = async (clip: Clip) => {
    if (!clip.video_url) {
      Alert.alert('Video unavailable', 'This clip does not have a playable video URL.');
      return;
    }

    if (selectedClipId === clip.id) {
      setSelectedClipId(null);
      return;
    }

    setSelectedClipId(clip.id);
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.rpc('record_skatetv_view', { p_clip_id: clip.id });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data ?? {}) as ViewResult;
      const views = Number(result.views ?? clip.views);
      setClips(current => current.map(item => item.id === clip.id ? { ...item, views } : item));
    } catch (error) {
      console.warn('SkateTV view count failed:', error);
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

  const totalLikes = useMemo(() => clips.reduce((sum, clip) => sum + Number(clip.likes || 0), 0), [clips]);
  const totalViews = useMemo(() => clips.reduce((sum, clip) => sum + Number(clip.views || 0), 0), [clips]);

  const header = useMemo(() => (
    <>
      <View style={s.hero}>
        <View style={s.orangeSlash} />
        <View style={s.acidSlash} />
        <View style={s.blueOrb} />
        <View style={s.heroTop}>
          <View style={s.heroStamp}><Tv color={INK} size={29} strokeWidth={2.8} /></View>
          <TouchableOpacity style={s.postButton} onPress={() => setUploadModal(true)}>
            <Plus color={INK} size={16} strokeWidth={3} />
            <Text style={s.postButtonText}>POST CLIP</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.eyebrow}>REAL COMMUNITY CLIPS • REAL ENGAGEMENT</Text>
        <Text style={s.title}>SKATE{`\n`}TV.</Text>
        <Text style={s.sub}>Watch actual SkateQuest uploads in-app, hype the clips you like, and post your own footage.</Text>
      </View>

      <View style={s.statsTicket}>
        <View style={s.statCell}>
          <Camera color={INK} size={18} strokeWidth={2.8} />
          <Text style={s.statValue}>{clips.length}</Text>
          <Text style={s.statLabel}>{activeTab === 'featured' ? 'FEATURED' : 'CLIPS'}</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCell}>
          <Heart color={INK} size={18} strokeWidth={2.8} />
          <Text style={s.statValue}>{totalLikes}</Text>
          <Text style={s.statLabel}>LIKES</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCell}>
          <Eye color={INK} size={18} strokeWidth={2.8} />
          <Text style={s.statValue}>{totalViews}</Text>
          <Text style={s.statLabel}>VIEWS</Text>
        </View>
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
              {tab === 'recent'
                ? <Flame color={selected ? INK : '#7F8793'} size={15} strokeWidth={2.8} />
                : <Sparkles color={selected ? INK : '#7F8793'} size={15} strokeWidth={2.8} />}
              <Text style={[s.tabText, selected && s.tabTextSelected]}>{tab === 'recent' ? 'RECENT' : 'FEATURED'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loadError ? (
        <View style={s.errorCard}>
          <Text style={s.errorTitle}>SKATETV DID NOT LOAD</Text>
          <Text style={s.errorText}>{loadError}</Text>
          <TouchableOpacity style={s.retryButton} onPress={() => void loadClips()}>
            <Text style={s.retryText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {clips.length > 0 ? (
        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionKicker}>{activeTab === 'featured' ? 'HAND-PICKED' : 'LATEST UPLOADS'}</Text>
            <Text style={s.sectionTitle}>{activeTab === 'featured' ? 'FEATURED CUTS' : 'THE FEED'}</Text>
          </View>
          <View style={s.livePill}><View style={s.liveDot} /><Text style={s.liveText}>LIVE</Text></View>
        </View>
      ) : null}
    </>
  ), [activeTab, clips.length, loadClips, loadError, totalLikes, totalViews]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {loading ? (
        <View style={s.loadingWrap}>
          <View style={s.loadingStamp}><Tv color={INK} size={30} strokeWidth={2.8} /></View>
          <ActivityIndicator color={ORANGE} size="large" />
          <Text style={s.loadingText}>LOADING REAL CLIPS</Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={item => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={ORANGE}
              onRefresh={() => {
                setRefreshing(true);
                void loadClips();
              }}
            />
          }
          renderItem={({ item, index }) => {
            const liked = likedClipIds.has(item.id);
            const playing = selectedClipId === item.id;
            return (
              <View style={[s.card, index % 2 === 1 && s.cardTilt]}>
                <TouchableOpacity
                  style={s.media}
                  onPress={() => void playClip(item)}
                  activeOpacity={0.92}
                >
                  {playing ? (
                    <Video
                      source={{ uri: item.video_url }}
                      style={s.inlineVideo}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay
                      isLooping={false}
                      useNativeControls
                    />
                  ) : item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={s.thumbnailImage} contentFit="cover" />
                  ) : (
                    <View style={s.noThumbnail}>
                      <View style={s.noThumbSlash} />
                      <Tv color={PAPER} size={44} strokeWidth={2.4} />
                      <Text style={s.noThumbnailTitle}>REAL VIDEO • NO THUMBNAIL</Text>
                      <Text style={s.noThumbnailText}>Tap play to load the actual clip.</Text>
                    </View>
                  )}

                  {!playing ? (
                    <View style={s.playStamp}>
                      <Play color={INK} size={22} fill={INK} strokeWidth={1.5} />
                    </View>
                  ) : null}

                  {item.featured ? (
                    <View style={s.featuredBadge}>
                      <Sparkles color={INK} size={11} strokeWidth={3} />
                      <Text style={s.featuredBadgeText}>FEATURED</Text>
                    </View>
                  ) : null}
                  <View style={s.postedBadge}><Text style={s.postedBadgeText}>{formatPosted(item.created_at)}</Text></View>
                </TouchableOpacity>

                <View style={s.cardBody}>
                  <View style={s.clipTop}>
                    <View style={s.avatar}><Text style={s.avatarText}>{profileName(item).slice(0, 1).toUpperCase()}</Text></View>
                    <View style={s.clipCopy}>
                      <Text style={s.clipTitle}>{item.title}</Text>
                      <Text style={s.username}>@{profileName(item)}</Text>
                    </View>
                  </View>

                  {(item.trick_name || item.park_name) ? (
                    <View style={s.detailRow}>
                      {item.trick_name ? <View style={s.detailTag}><Flame color={INK} size={12} strokeWidth={2.8} /><Text style={s.detailText}>{item.trick_name.toUpperCase()}</Text></View> : null}
                      {item.park_name ? <View style={s.detailTag}><MapPin color={INK} size={12} strokeWidth={2.8} /><Text numberOfLines={1} style={s.detailText}>{item.park_name.toUpperCase()}</Text></View> : null}
                    </View>
                  ) : null}

                  <View style={s.engagementRow}>
                    <TouchableOpacity style={[s.engagementButton, liked && s.engagementLiked]} onPress={() => void toggleLike(item)}>
                      <Heart color={INK} fill={liked ? INK : 'transparent'} size={19} strokeWidth={2.7} />
                      <Text style={s.engagementText}>{item.likes}</Text>
                    </TouchableOpacity>
                    <View style={s.engagementButton}>
                      <Eye color={INK} size={19} strokeWidth={2.7} />
                      <Text style={s.engagementText}>{item.views}</Text>
                    </View>
                    <TouchableOpacity style={s.watchButton} onPress={() => void playClip(item)}>
                      <Play color={INK} size={15} fill={INK} strokeWidth={1.5} />
                      <Text style={s.watchText}>{playing ? 'CLOSE PLAYER' : 'WATCH IN APP'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loadError ? (
              <View style={s.empty}>
                <View style={s.emptyStamp}><Camera color={INK} size={30} strokeWidth={2.8} /></View>
                <Text style={s.emptyTitle}>{activeTab === 'featured' ? 'NO FEATURED CLIPS YET' : 'NO CLIPS YET'}</Text>
                <Text style={s.emptyText}>{activeTab === 'featured' ? 'Featured stays empty until a real posted clip is actually featured.' : 'Be the first skater to post a real clip to SkateTV.'}</Text>
                {activeTab === 'recent' ? (
                  <TouchableOpacity style={s.emptyPostButton} onPress={() => setUploadModal(true)}>
                    <Plus color={INK} size={16} strokeWidth={3} />
                    <Text style={s.emptyPostText}>POST THE FIRST CLIP</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null
          }
        />
      )}

      <Modal visible={uploadModal} transparent animationType="slide" onRequestClose={() => setUploadModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={s.modalStamp}><Upload color={INK} size={24} strokeWidth={2.8} /></View>
              <View style={s.modalHeaderCopy}>
                <Text style={s.modalKicker}>REAL VIDEO UPLOAD</Text>
                <Text style={s.modalTitle}>POST TO SKATETV.</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadModal(false)} style={s.closeButton}>
                <X color={INK} size={20} strokeWidth={2.8} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>
              {uploadVideo ? (
                <View style={s.previewWrap}>
                  <Video
                    source={{ uri: uploadVideo }}
                    style={s.previewVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    useNativeControls
                  />
                </View>
              ) : null}

              <TouchableOpacity style={[s.videoPicker, uploadVideo && s.videoPickerSelected]} onPress={() => void pickVideo()}>
                <Upload color={INK} size={25} strokeWidth={2.8} />
                <View style={s.videoPickerCopy}>
                  <Text style={s.videoPickerTitle}>{uploadVideo ? 'VIDEO SELECTED' : 'CHOOSE A REAL SKATE VIDEO'}</Text>
                  <Text style={s.videoPickerText}>{uploadVideo ? 'Tap to choose a different clip.' : 'Video only • up to 60 seconds.'}</Text>
                </View>
              </TouchableOpacity>

              <Text style={s.label}>TITLE *</Text>
              <TextInput style={s.input} placeholder="What happened in this clip?" placeholderTextColor="#858780" value={uploadTitle} onChangeText={setUploadTitle} maxLength={120} />
              <Text style={s.label}>TRICK</Text>
              <TextInput style={s.input} placeholder="Kickflip, boardslide, line…" placeholderTextColor="#858780" value={uploadTrick} onChangeText={setUploadTrick} maxLength={80} />
              <Text style={s.label}>SPOT</Text>
              <TextInput style={s.input} placeholder="Where did you skate?" placeholderTextColor="#858780" value={uploadPark} onChangeText={setUploadPark} maxLength={100} />

              <TouchableOpacity
                style={[s.submitButton, (!uploadVideo || !uploadTitle.trim() || uploading) && s.disabled]}
                disabled={!uploadVideo || !uploadTitle.trim() || uploading}
                onPress={() => void submitClip()}
              >
                {uploading ? <ActivityIndicator color={INK} /> : <><Camera color={INK} size={18} strokeWidth={2.8} /><Text style={s.submitButtonText}>UPLOAD REAL CLIP</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },

  hero: { minHeight: 294, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 305, height: 94, right: -105, top: 55, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  postButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 13, borderWidth: 2, borderColor: INK, paddingHorizontal: 11 },
  postButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 27 },
  title: { color: PAPER, fontSize: 52, lineHeight: 48, fontWeight: '900', letterSpacing: -3, marginTop: 3 },
  sub: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },

  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, marginTop: 18 },
  tab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#15181E' },
  tabSelected: { backgroundColor: ORANGE, borderColor: INK, borderWidth: 2 },
  tabText: { color: '#7F8793', fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  tabTextSelected: { color: INK },
  errorCard: { marginHorizontal: 14, marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#63362A', backgroundColor: '#20110E', padding: 13 },
  errorTitle: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  errorText: { color: '#C6A99F', fontSize: 10, lineHeight: 15, marginTop: 3 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: ORANGE, borderRadius: 9, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 10, paddingVertical: 6, marginTop: 9 },
  retryText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  sectionHeader: { paddingHorizontal: 18, paddingTop: 25, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },

  card: { marginHorizontal: 14, marginBottom: 15, backgroundColor: PAPER, borderRadius: 23, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  cardTilt: { transform: [{ rotate: '0.3deg' }] },
  media: { height: 245, backgroundColor: '#11151B', position: 'relative', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%' },
  inlineVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  noThumbnail: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, overflow: 'hidden', position: 'relative' },
  noThumbSlash: { position: 'absolute', width: 350, height: 70, backgroundColor: ORANGE, transform: [{ rotate: '-18deg' }] },
  noThumbnailTitle: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 0.85 },
  noThumbnailText: { color: '#A3AAB5', fontSize: 9, fontWeight: '700' },
  playStamp: { position: 'absolute', width: 61, height: 61, borderRadius: 19, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', left: '50%', top: '50%', marginLeft: -30, marginTop: -30, transform: [{ rotate: '-5deg' }] },
  featuredBadge: { position: 'absolute', left: 11, top: 11, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 8, paddingVertical: 5 },
  featuredBadgeText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  postedBadge: { position: 'absolute', right: 11, top: 11, backgroundColor: PAPER, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 8, paddingVertical: 5 },
  postedBadgeText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55 },
  cardBody: { padding: 14 },
  clipTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 44, height: 44, borderRadius: 13, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  avatarText: { color: INK, fontSize: 14, fontWeight: '900' },
  clipCopy: { flex: 1 },
  clipTitle: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', letterSpacing: -0.55 },
  username: { color: '#6D726C', fontSize: 8.5, fontWeight: '900', marginTop: 2 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  detailTag: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E9E4DA', borderRadius: 999, borderWidth: 1, borderColor: '#CDC5B8', paddingHorizontal: 8, maxWidth: '100%' },
  detailText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.55, flexShrink: 1 },
  engagementRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#D7D0C5' },
  engagementButton: { minWidth: 60, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: INK, backgroundColor: '#E9E4DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
  engagementLiked: { backgroundColor: ORANGE },
  engagementText: { color: INK, fontSize: 9, fontWeight: '900' },
  watchButton: { flex: 1, height: 42, borderRadius: 12, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8 },
  watchText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },

  empty: { marginHorizontal: 14, marginTop: 25, minHeight: 235, borderRadius: 23, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: 14, textAlign: 'center' },
  emptyText: { color: '#7F8793', fontSize: 10.5, lineHeight: 16, textAlign: 'center', maxWidth: 280, marginTop: 5 },
  emptyPostButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 12, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, marginTop: 14 },
  emptyPostText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.45 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, paddingHorizontal: 16, paddingBottom: 26 },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C6C0B6', alignSelf: 'center', marginTop: 9, marginBottom: 13 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  modalStamp: { width: 50, height: 50, borderRadius: 14, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  modalHeaderCopy: { flex: 1 },
  modalKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { color: INK, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  closeButton: { width: 41, height: 41, borderRadius: 12, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  modalBody: { paddingBottom: 8 },
  previewWrap: { height: 190, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: INK, marginTop: 15 },
  previewVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
  videoPicker: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E9E4DA', borderRadius: 15, borderWidth: 1.5, borderColor: '#CCC4B8', paddingHorizontal: 12, marginTop: 15 },
  videoPickerSelected: { backgroundColor: ACID, borderColor: INK },
  videoPickerCopy: { flex: 1 },
  videoPickerTitle: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.65 },
  videoPickerText: { color: '#686D67', fontSize: 8.5, fontWeight: '700', marginTop: 2 },
  label: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  input: { minHeight: 49, backgroundColor: '#E9E4DA', borderRadius: 13, borderWidth: 1.5, borderColor: '#CCC4B8', color: INK, paddingHorizontal: 12, fontSize: 12, fontWeight: '700' },
  submitButton: { minHeight: 51, backgroundColor: ORANGE, borderRadius: 14, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  submitButtonText: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.75 },
});
