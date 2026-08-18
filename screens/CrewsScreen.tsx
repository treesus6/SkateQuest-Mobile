import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Flame, Plus, Trophy, Users, X, Zap } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { crewsService, Crew } from '../lib/crewsService';

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';

export default function CrewsScreen() {
  const user = useAuthStore(s => s.user);
  const {
    data: crews,
    loading,
    refetch,
  } = useSupabaseQuery<Crew[]>(() => crewsService.getAll(), []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewDescription, setNewCrewDescription] = useState('');

  const crewList = crews ?? [];
  const totalMembers = useMemo(
    () => crewList.reduce((sum, crew) => sum + (crew.member_count || 0), 0),
    [crewList]
  );
  const totalXp = useMemo(
    () => crewList.reduce((sum, crew) => sum + (crew.total_xp || 0), 0),
    [crewList]
  );

  const createCrew = async () => {
    if (!user) return;
    if (!newCrewName.trim()) {
      Alert.alert('Crew name needed', 'Give your crew a name first.');
      return;
    }
    try {
      const { error } = await crewsService.create({
        name: newCrewName.trim(),
        description: newCrewDescription.trim(),
        created_by: user.id,
      });
      if (error) throw error;
      setNewCrewName('');
      setNewCrewDescription('');
      setShowCreateModal(false);
      Alert.alert('Crew created', 'Your crew is live.');
      refetch();
    } catch (error: any) {
      Alert.alert('Could not create crew', error.message);
    }
  };

  const joinCrew = async (crewId: string, crewName: string) => {
    Alert.alert('Join crew', `Join ${crewName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        onPress: async () => {
          if (!user) return;
          try {
            const { error } = await crewsService.join(crewId, user.id);
            if (error) throw error;
            Alert.alert('You joined', `You're now in ${crewName}.`);
            refetch();
          } catch (error: any) {
            Alert.alert('Could not join crew', error.message);
          }
        },
      },
    ]);
  };

  const renderCrew = ({ item, index }: { item: Crew; index: number }) => (
    <TouchableOpacity activeOpacity={0.9} style={[s.crewCard, index === 0 && s.topCrewCard]}>
      <View style={s.cardTopRow}>
        <View style={s.crewIdentity}>
          <View style={[s.crewAvatar, index === 0 && s.topCrewAvatar]}>
            <Text style={s.crewInitial}>{item.name?.slice(0, 2).toUpperCase() || 'SQ'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.crewName} numberOfLines={1}>{item.name}</Text>
              {index === 0 ? (
                <View style={s.rankPill}>
                  <Flame color="#FFD37A" size={12} />
                  <Text style={s.rankText}>HOT</Text>
                </View>
              ) : null}
            </View>
            <View style={s.miniMetaRow}>
              <Users color="#8B95A5" size={13} />
              <Text style={s.miniMeta}>{item.member_count || 0} skaters</Text>
            </View>
          </View>
        </View>
        <View style={s.xpBlock}>
          <Text style={s.xpValue}>{(item.total_xp || 0).toLocaleString()}</Text>
          <Text style={s.xpLabel}>CREW XP</Text>
        </View>
      </View>

      {item.description ? (
        <Text style={s.description} numberOfLines={3}>{item.description}</Text>
      ) : (
        <Text style={s.descriptionMuted}>No bio yet — this crew is keeping it low-key.</Text>
      )}

      <View style={s.cardBottomRow}>
        <View style={s.repRow}>
          <Zap color={ACCENT} size={15} />
          <Text style={s.repText}>Build rep together</Text>
        </View>
        <Pressable style={s.joinButton} onPress={() => void joinCrew(item.id, item.name)}>
          <Text style={s.joinText}>JOIN</Text>
          <ChevronRight color="#fff" size={16} strokeWidth={3} />
        </Pressable>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={crewList}
        renderItem={renderCrew}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={refetch}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <View style={s.eyebrowRow}>
                <Users color={ACCENT} size={16} strokeWidth={2.5} />
                <Text style={s.eyebrow}>SKATE TOGETHER</Text>
              </View>
              <View style={s.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>Crews</Text>
                  <Text style={s.subtitle}>Find your people, stack clips, earn crew XP, and rep your scene.</Text>
                </View>
                <TouchableOpacity style={s.createButton} onPress={() => setShowCreateModal(true)}>
                  <Plus color="#fff" size={20} strokeWidth={3} />
                </TouchableOpacity>
              </View>

              <View style={s.statsRow}>
                <View style={s.statTile}>
                  <Users color="#6FC3FF" size={18} />
                  <Text style={s.statValue}>{totalMembers}</Text>
                  <Text style={s.statLabel}>Skaters</Text>
                </View>
                <View style={s.statTile}>
                  <Trophy color="#F7B955" size={18} />
                  <Text style={s.statValue}>{crewList.length}</Text>
                  <Text style={s.statLabel}>Crews</Text>
                </View>
                <View style={s.statTile}>
                  <Zap color={ACCENT} size={18} />
                  <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                  <Text style={s.statLabel}>Total XP</Text>
                </View>
              </View>
            </View>

            {crewList.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>Active crews</Text>
                  <Text style={s.sectionSub}>Tap join to roll with them</Text>
                </View>
                <View style={s.livePill}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>COMMUNITY</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Users color={ACCENT} size={32} />
              </View>
              <Text style={s.emptyTitle}>No crews yet</Text>
              <Text style={s.emptyText}>Start the first crew and give local skaters somewhere to rally.</Text>
              <TouchableOpacity style={s.emptyCreate} onPress={() => setShowCreateModal(true)}>
                <Plus color="#fff" size={17} />
                <Text style={s.emptyCreateText}>Create a crew</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalEyebrow}>START SOMETHING</Text>
                <Text style={s.modalTitle}>Create a crew</Text>
              </View>
              <TouchableOpacity style={s.closeButton} onPress={() => setShowCreateModal(false)}>
                <X color="#D8DEE8" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Crew name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Burnside Lurkers"
              placeholderTextColor="#596577"
              value={newCrewName}
              onChangeText={setNewCrewName}
              maxLength={30}
            />

            <Text style={s.inputLabel}>What are you about?</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="DIY spots, night sessions, filming, street, parks..."
              placeholderTextColor="#596577"
              value={newCrewDescription}
              onChangeText={setNewCrewDescription}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />

            <TouchableOpacity style={s.modalCreateButton} onPress={() => void createCrew()}>
              <Users color="#fff" size={18} />
              <Text style={s.modalCreateText}>Create crew</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 42 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: { color: ACCENT, fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, gap: 14 },
  title: { color: '#F7F4EF', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#8B95A5', fontSize: 14, lineHeight: 20, marginTop: 6 },
  createButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statTile: { flex: 1, backgroundColor: '#0D131D', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1C2635' },
  statValue: { color: '#F7F4EF', fontSize: 17, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#697587', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900' },
  sectionSub: { color: '#667085', fontSize: 11, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10261C', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#4ADE80', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  crewCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  topCrewCard: { borderColor: 'rgba(210,103,61,0.48)', backgroundColor: '#13151B' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  crewIdentity: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 },
  crewAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#192332', borderWidth: 1, borderColor: '#2A3748', alignItems: 'center', justifyContent: 'center' },
  topCrewAvatar: { backgroundColor: 'rgba(210,103,61,0.16)', borderColor: 'rgba(210,103,61,0.5)' },
  crewInitial: { color: '#F7F4EF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  crewName: { color: '#F7F4EF', fontSize: 18, fontWeight: '900', flexShrink: 1 },
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B2912', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  rankText: { color: '#FFD37A', fontSize: 9, fontWeight: '900' },
  miniMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  miniMeta: { color: '#8B95A5', fontSize: 11, fontWeight: '600' },
  xpBlock: { alignItems: 'flex-end' },
  xpValue: { color: ACCENT, fontSize: 17, fontWeight: '900' },
  xpLabel: { color: '#596577', fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 1 },
  description: { color: '#A7B0BE', fontSize: 13, lineHeight: 19, marginTop: 14 },
  descriptionMuted: { color: '#5F6A7A', fontSize: 13, fontStyle: 'italic', marginTop: 14 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1D2734', marginTop: 15, paddingTop: 14 },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  repText: { color: '#D2D8E1', fontSize: 12, fontWeight: '700' },
  joinButton: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  joinText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  emptyState: { alignItems: 'center', paddingHorizontal: 30, paddingTop: 66 },
  emptyIcon: { width: 66, height: 66, borderRadius: 21, backgroundColor: 'rgba(210,103,61,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,103,61,0.25)' },
  emptyTitle: { color: '#F7F4EF', fontSize: 19, fontWeight: '900', marginTop: 16 },
  emptyText: { color: '#8B95A5', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
  emptyCreate: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 18 },
  emptyCreateText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.74)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0D131D', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: '#202B39' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalEyebrow: { color: ACCENT, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  modalTitle: { color: '#F7F4EF', fontSize: 26, fontWeight: '900', marginTop: 4 },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#151E2B', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: '#B8C1CE', fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 2 },
  input: { backgroundColor: '#111A27', borderWidth: 1, borderColor: '#263246', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, color: '#F7F4EF', fontSize: 15, marginBottom: 16 },
  textarea: { minHeight: 100 },
  modalCreateButton: { minHeight: 50, backgroundColor: ACCENT, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  modalCreateText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
