import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Image, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface Quest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: string;
  requirement_type: string;
}

interface Submission {
  quest_id: string;
  status: string;
  xp_awarded: boolean;
}

export default function DailyQuestsScreen() {
  const { user } = useAuthStore();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [proofModal, setProofModal] = useState<Quest | null>(null);
  const [proofType, setProofType] = useState<'photo' | 'video' | 'location' | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!user) return;
    const { data: q } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('active', true)
      .order('xp_reward', { ascending: false });
    setQuests(q || []);

    const { data: s } = await supabase
      .from('quest_proof_submissions')
      .select('quest_id, status, xp_awarded')
      .eq('user_id', user.id);
    const map = new Map<string, Submission>();
    s?.forEach(sub => map.set(sub.quest_id, sub));
    setSubmissions(map);
    setLoading(false);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll access to upload proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setProofImage(result.assets[0].uri);
      setProofType('photo');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera access to take proof photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setProofImage(result.assets[0].uri);
      setProofType('photo');
    }
  };

  const useLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need location access to verify you were at the spot.');
      return;
    }
    setProofType('location');
    Alert.alert('Location captured', 'Your location will be submitted as proof.');
  };

  const uploadProofToStorage = async (uri: string, questId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() || 'jpg';
      const filename = `quest-proof/${user!.id}/${questId}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('quest-proofs')
        .upload(filename, blob, { contentType: `image/${ext}` });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('quest-proofs').getPublicUrl(filename);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  const submitProof = async () => {
    if (!proofModal || !user) return;
    if (!proofType) {
      Alert.alert('Proof required', 'Please add a photo, video, or location check-in as proof.');
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl = null;
      let lat = null;
      let lng = null;

      if (proofType === 'photo' && proofImage) {
        proofUrl = await uploadProofToStorage(proofImage, proofModal.id);
        if (!proofUrl) {
          // Fall back to just note if upload fails
          proofUrl = 'submitted';
        }
      } else if (proofType === 'location') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const { data, error } = await supabase.rpc('submit_quest_proof', {
        p_user_id: user.id,
        p_quest_id: proofModal.id,
        p_proof_type: proofType,
        p_proof_url: proofUrl,
        p_proof_note: proofNote.trim() || null,
        p_latitude: lat,
        p_longitude: lng,
      });

      if (error) throw error;

      if (data?.success) {
        Alert.alert(
          '🛹 Quest Complete!',
          `+${proofModal.xp_reward} XP earned! Keep shredding.`,
          [{ text: 'Let\'s go!', onPress: () => { setProofModal(null); loadData(); } }]
        );
      } else {
        Alert.alert('Error', data?.error || 'Something went wrong');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  const openProofModal = (quest: Quest) => {
    setProofModal(quest);
    setProofType(null);
    setProofImage(null);
    setProofNote('');
  };

  const questTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      location: '📍', tricks: '🛹', challenge: '🎯',
      social: '👥', exploration: '🗺', general: '⚡'
    };
    return icons[type] || '⚡';
  };

  const renderQuest = ({ item }: { item: Quest }) => {
    const sub = submissions.get(item.id);
    const done = sub?.status === 'approved';

    return (
      <View style={[s.card, done && s.cardDone]}>
        <View style={s.cardTop}>
          <Text style={s.questIcon}>{questTypeIcon(item.quest_type)}</Text>
          <View style={s.questInfo}>
            <Text style={[s.questTitle, done && s.questTitleDone]}>{item.title}</Text>
            <Text style={s.questDesc}>{item.description}</Text>
          </View>
          <View style={s.xpBadge}>
            <Text style={s.xpText}>+{item.xp_reward}</Text>
            <Text style={s.xpLabel}>XP</Text>
          </View>
        </View>

        <View style={s.cardBottom}>
          <View style={s.proofRequired}>
            <Text style={s.proofIcon}>📸</Text>
            <Text style={s.proofText}>Proof required to claim XP</Text>
          </View>
          {done ? (
            <View style={s.doneBtn}>
              <Text style={s.doneTxt}>✓ Completed</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.submitBtn} onPress={() => openProofModal(item)}>
              <Text style={s.submitTxt}>Submit Proof</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>⚡ Daily Quests</Text>
        <Text style={s.sub}>Submit proof to claim your XP. Resets every day.</Text>
        <View style={s.progressRow}>
          <Text style={s.progressTxt}>{submissions.size} / {quests.length} completed today</Text>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: quests.length ? `${(submissions.size/quests.length)*100}%` as any : '0%' }]} />
          </View>
        </View>
      </View>

      <FlatList
        data={quests}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={renderQuest}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>⚡</Text>
              <Text style={s.emptyTxt}>No quests today. Check back soon!</Text>
            </View>
          ) : <ActivityIndicator color="#d2673d" style={{ marginTop: 40 }} />
        }
      />

      {/* Proof Submission Modal */}
      <Modal visible={!!proofModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Submit Proof</Text>
              <TouchableOpacity onPress={() => setProofModal(null)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <Text style={s.modalQuest}>{proofModal?.title}</Text>
              <Text style={s.modalDesc}>{proofModal?.description}</Text>

              <Text style={s.proofSectionTitle}>Choose your proof type:</Text>

              {/* Photo options */}
              <View style={s.proofOptions}>
                <TouchableOpacity style={[s.proofOption, proofType === 'photo' && s.proofOptionOn]} onPress={takePhoto}>
                  <Text style={s.proofOptionIcon}>📷</Text>
                  <Text style={s.proofOptionTxt}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.proofOption, proofType === 'photo' && s.proofOptionOn]} onPress={pickImage}>
                  <Text style={s.proofOptionIcon}>🖼</Text>
                  <Text style={s.proofOptionTxt}>Upload Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.proofOption, proofType === 'location' && s.proofOptionOn]} onPress={useLocation}>
                  <Text style={s.proofOptionIcon}>📍</Text>
                  <Text style={s.proofOptionTxt}>Check-in Location</Text>
                </TouchableOpacity>
              </View>

              {/* Image preview */}
              {proofImage && (
                <View style={s.imagePreview}>
                  <Image source={{ uri: proofImage }} style={s.previewImg} resizeMode="cover" />
                  <TouchableOpacity style={s.removeImg} onPress={() => { setProofImage(null); setProofType(null); }}>
                    <Text style={s.removeImgTxt}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              )}

              {proofType === 'location' && (
                <View style={s.locationConfirm}>
                  <Text style={s.locationTxt}>📍 Location will be captured when you submit</Text>
                </View>
              )}

              {/* Note */}
              <Text style={s.noteLbl}>Add a note (optional)</Text>
              <TextInput
                style={s.noteInput}
                placeholder="Describe what you did, who was there, any details..."
                placeholderTextColor="#4B5563"
                value={proofNote}
                onChangeText={setProofNote}
                multiline
                numberOfLines={3}
              />

              {/* XP reminder */}
              <View style={s.xpReminder}>
                <Text style={s.xpReminderTxt}>🏆 You'll earn <Text style={s.xpReminderNum}>+{proofModal?.xp_reward} XP</Text> when approved</Text>
              </View>

              <TouchableOpacity
                style={[s.submitProofBtn, (!proofType || submitting) && s.submitProofBtnDis]}
                onPress={submitProof}
                disabled={!proofType || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={s.submitProofTxt}>Submit & Claim XP 🛹</Text>
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
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 12 },
  progressRow: { gap: 6 },
  progressTxt: { color: '#d2673d', fontSize: 12, fontWeight: '700' },
  progressBar: { height: 4, backgroundColor: '#1a1f3a', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d2673d', borderRadius: 2 },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1a2030' },
  cardDone: { borderColor: '#166534', backgroundColor: 'rgba(22,101,52,0.1)' },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  questIcon: { fontSize: 28, marginTop: 2 },
  questInfo: { flex: 1 },
  questTitle: { color: '#F3F4F6', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  questTitleDone: { color: '#4ade80' },
  questDesc: { color: '#6B7280', fontSize: 13, lineHeight: 18 },
  xpBadge: { alignItems: 'center', backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(210,103,61,0.4)', minWidth: 48 },
  xpText: { color: '#d2673d', fontWeight: '900', fontSize: 16 },
  xpLabel: { color: '#d2673d', fontSize: 9, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderColor: '#1a2030' },
  proofRequired: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  proofIcon: { fontSize: 14 },
  proofText: { color: '#4B5563', fontSize: 11 },
  submitBtn: { backgroundColor: '#d2673d', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  submitTxt: { color: 'white', fontWeight: '700', fontSize: 13 },
  doneBtn: { backgroundColor: 'rgba(22,101,52,0.3)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#166834' },
  doneTxt: { color: '#4ade80', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { color: '#4B5563', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#1a2030' },
  modalTitle: { color: '#F3F4F6', fontSize: 18, fontWeight: '900' },
  closeBtn: { color: '#6B7280', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  modalQuest: { color: '#d2673d', fontSize: 18, fontWeight: '900', marginBottom: 6 },
  modalDesc: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  proofSectionTitle: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  proofOptions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  proofOption: { flex: 1, backgroundColor: '#0a0e1a', borderRadius: 12, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#1a2030' },
  proofOptionOn: { borderColor: '#d2673d', backgroundColor: 'rgba(210,103,61,0.1)' },
  proofOptionIcon: { fontSize: 24 },
  proofOptionTxt: { color: '#9CA3AF', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  imagePreview: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: 200 },
  removeImg: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  removeImgTxt: { color: 'white', fontSize: 12, fontWeight: '600' },
  locationConfirm: { backgroundColor: 'rgba(210,103,61,0.1)', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(210,103,61,0.3)' },
  locationTxt: { color: '#d2673d', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  noteLbl: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  noteInput: { backgroundColor: '#0a0e1a', color: '#F3F4F6', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#1a2030', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  xpReminder: { backgroundColor: 'rgba(210,103,61,0.08)', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  xpReminderTxt: { color: '#9CA3AF', fontSize: 13 },
  xpReminderNum: { color: '#d2673d', fontWeight: '900', fontSize: 15 },
  submitProofBtn: { backgroundColor: '#d2673d', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  submitProofBtnDis: { opacity: 0.5 },
  submitProofTxt: { color: 'white', fontWeight: '700', fontSize: 16 },
});
