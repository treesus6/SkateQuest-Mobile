import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Image, Modal, TextInput, Alert, ActivityIndicator,
  ScrollView, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { uploadSkateTVClip } from '../lib/uploadMedia';
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
  profiles: { username: string };
}

export default function SkateTVScreen() {
  const { user } = useAuthStore();
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'recent'>('featured');
  const [likedClips, setLikedClips] = useState<Set<string>>(new Set());
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadVideo, setUploadVideo] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTrick, setUploadTrick] = useState('');
  const [uploadPark, setUploadPark] = useState('');

  useEffect(() => { loadClips(); }, [activeTab]);

  const loadClips = async () => {
    let query = supabase
      .from('skatetv_clips')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (activeTab === 'featured') query = query.eq('featured', true);
    const { data } = await query;
    setClips(data || []);
  };

  const likeClip = async (clipId: string, currentLikes: number) => {
    if (!user || likedClips.has(clipId)) return;
    setLikedClips(prev => new Set([...prev, clipId]));
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, likes: c.likes + 1 } : c));
    await supabase.from('skatetv_likes').insert({ user_id: user.id, clip_id: clipId });
    await supabase.from('skatetv_clips').update({ likes: currentLikes + 1 }).eq('id', clipId);
  };

  const watchClip = async (clip: Clip) => {
    await supabase.from('skatetv_clips').update({ views: clip.views + 1 }).eq('id', clip.id);
    if (clip.video_url.includes('youtube')) {
      Linking.openURL(clip.video_url);
    } else {
      Linking.openURL(clip.video_url);
    }
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
    if (!result.canceled) {
      setUploadVideo(result.assets[0].uri);
    }
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

      await supabase.from('skatetv_clips').insert({
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

      Alert.alert('🛹 Clip uploaded!', 'Your clip is live on SkateTV.', [
        { text: 'Sick!', onPress: () => { setUploadModal(false); setUploadVideo(null); setUploadTitle(''); setUploadTrick(''); setUploadPark(''); loadClips(); } }
      ]);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Try again');
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { key: 'featured', label: '🔥 Featured' },
    { key: 'recent', label: '🕐 Recent' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>📺 SkateTV</Text>
            <Text style={s.sub}>Best clips from the community</Text>
          </View>
          <TouchableOpacity style={s.uploadBtn} onPress={() => setUploadModal(true)}>
            <Text style={s.uploadTxt}>+ Post Clip</Text>
          </TouchableOpacity>
        </View>
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
            <TouchableOpacity style={s.thumb} onPress={() => watchClip(item)}>
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={s.thumbImg} />
              ) : (
                <View style={s.thumbPlaceholder}>
                  <Text style={s.thumbIcon}>🎥</Text>
                </View>
              )}
              {item.featured && (
                <View style={s.featBadge}><Text style={s.featTxt}>🔥 FEATURED</Text></View>
              )}
              <View style={s.playBtn}><Text style={s.playIcon}>▶</Text></View>
            </TouchableOpacity>

            <View style={s.info}>
              <View style={s.infoTop}>
                <View style={s.avatar}><Text style={s.avatarTxt}>🛹</Text></View>
                <View style={s.infoText}>
                  <Text style={s.clipTitle}>{item.title || 'Skate clip'}</Text>
                  {item.trick_name ? <Text style={s.trickName}>{item.trick_name}</Text> : null}
                  {item.park_name ? <Text style={s.parkName}>📍 {item.park_name}</Text> : null}
                  <Text style={s.username}>@{item.profiles?.username || 'skater'}</Text>
                </View>
              </View>

              <View style={s.actions}>
                <TouchableOpacity style={s.action} onPress={() => likeClip(item.id, item.likes)}>
                  <Text style={s.actionIcon}>{likedClips.has(item.id) ? '❤️' : '🤍'}</Text>
                  <Text style={s.actionCount}>{item.likes}</Text>
                </TouchableOpacity>
                <View style={s.action}>
                  <Text style={s.actionIcon}>👁</Text>
                  <Text style={s.actionCount}>{item.views}</Text>
                </View>
                <TouchableOpacity style={s.watchBtn} onPress={() => watchClip(item)}>
                  <Text style={s.watchTxt}>Watch ▶</Text>
                </TouchableOpacity>
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

      {/* Upload Modal */}
      <Modal visible={uploadModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Post a Clip 🎥</Text>
              <TouchableOpacity onPress={() => setUploadModal(false)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              {/* Video picker */}
              <TouchableOpacity style={[s.videoPicker, uploadVideo && s.videoPickerDone]} onPress={pickVideo}>
                {uploadVideo ? (
                  <Text style={s.videoPickerDoneTxt}>✓ Video selected — tap to change</Text>
                ) : (
                  <>
                    <Text style={s.videoPickerIcon}>🎥</Text>
                    <Text style={s.videoPickerTxt}>Tap to select your clip</Text>
                    <Text style={s.videoPickerSub}>Max 60 seconds · MP4 or MOV</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={s.lbl}>Title *</Text>
              <TextInput style={s.input} placeholder="What's this clip?" placeholderTextColor="#4B5563" value={uploadTitle} onChangeText={setUploadTitle} />

              <Text style={s.lbl}>Trick</Text>
              <TextInput style={s.input} placeholder="Kickflip, Boardslide, etc." placeholderTextColor="#4B5563" value={uploadTrick} onChangeText={setUploadTrick} />

              <Text style={s.lbl}>Spot</Text>
              <TextInput style={s.input} placeholder="Where was this?" placeholderTextColor="#4B5563" value={uploadPark} onChangeText={setUploadPark} />

              <View style={s.proofNote}>
                <Text style={s.proofNoteTxt}>📸 Clips posted here also count as proof for daily quests</Text>
              </View>

              <TouchableOpacity
                style={[s.postBtn, (!uploadVideo || uploading) && s.postBtnDis]}
                onPress={submitClip}
                disabled={!uploadVideo || uploading}
              >
                {uploading ? (
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={s.postBtnTxt}>Uploading...</Text>
                  </View>
                ) : (
                  <Text style={s.postBtnTxt}>Post to SkateTV 🛹</Text>
                )}
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
  header: { padding: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  uploadBtn: { backgroundColor: '#d2673d', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  uploadTxt: { color: 'white', fontWeight: '700', fontSize: 13 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabOn: { backgroundColor: '#d2673d' },
  tabTxt: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  tabTxtOn: { color: 'white' },
  card: { backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#1a2030' },
  thumb: { height: 200, backgroundColor: '#0a0e1a', justifyContent: 'center', alignItems: 'center', position: 'relative' },
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
  clipTitle: { color: '#F3F4F6', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  trickName: { color: '#d2673d', fontSize: 13, fontWeight: '600' },
  parkName: { color: '#6B7280', fontSize: 12 },
  username: { color: '#4B5563', fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 18 },
  actionCount: { color: '#9CA3AF', fontSize: 13 },
  watchBtn: { marginLeft: 'auto' as any, backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(210,103,61,0.4)' },
  watchTxt: { color: '#d2673d', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#1a2030' },
  modalTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '900' },
  closeBtn: { color: '#6B7280', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  videoPicker: { backgroundColor: '#0a0e1a', borderRadius: 12, borderWidth: 2, borderColor: '#1a2030', borderStyle: 'dashed', padding: 30, alignItems: 'center', marginBottom: 16 },
  videoPickerDone: { borderColor: '#d2673d', borderStyle: 'solid' },
  videoPickerIcon: { fontSize: 36, marginBottom: 8 },
  videoPickerTxt: { color: '#9CA3AF', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  videoPickerSub: { color: '#4B5563', fontSize: 12 },
  videoPickerDoneTxt: { color: '#d2673d', fontWeight: '700', fontSize: 14 },
  lbl: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#0a0e1a', color: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#1a2030', marginBottom: 14 },
  proofNote: { backgroundColor: 'rgba(210,103,61,0.08)', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(210,103,61,0.2)' },
  proofNoteTxt: { color: '#d2673d', fontSize: 13, textAlign: 'center' },
  postBtn: { backgroundColor: '#d2673d', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  postBtnDis: { opacity: 0.5 },
  postBtnTxt: { color: 'white', fontWeight: '700', fontSize: 16 },
});
