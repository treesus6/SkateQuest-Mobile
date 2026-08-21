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
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function CrewsScreen() {
  const navigation = useNavigation();
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

  const renderCrew = ({ item, index }: { item: Crew; index: number }) => {
    const isTopCrew = index === 0;
    const accent = isTopCrew ? ACID : index % 3 === 1 ? BLUE : ORANGE;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[s.crewCard, isTopCrew && s.topCrewCard, index % 2 === 1 && s.cardTilt]}
        onPress={() => navigation.navigate('CrewDetails', { crewId: item.id })}
      >
        <View style={[s.cardStripe, { backgroundColor: accent }]} />
        <View style={s.cardTopRow}>
          <View style={[s.rankBlock, { backgroundColor: accent }]}>
            <Text style={s.rankNumber}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={s.rankLabel}>{isTopCrew ? 'TOP' : 'CREW'}</Text>
          </View>

          <View style={s.crewMain}>
            <View style={s.nameRow}>
              <Text style={s.crewName} numberOfLines={1}>{item.name}</Text>
              {isTopCrew ? (
                <View style={s.hotPill}>
                  <Flame color={INK} size={11} strokeWidth={3} />
                  <Text style={s.hotText}>HOT</Text>
                </View>
              ) : null}
            </View>
            <View style={s.metaRow}>
              <Users color={ORANGE} size={13} strokeWidth={2.6} />
              <Text style={s.metaText}>{item.member_count || 0} SKATERS</Text>
              <View style={s.metaDot} />
              <Zap color={ORANGE} size={12} strokeWidth={2.8} />
              <Text style={s.metaText}>{(item.total_xp || 0).toLocaleString()} XP</Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={s.description} numberOfLines={3}>{item.description}</Text>
        ) : (
          <Text style={s.descriptionMuted}>No bio yet — this crew is keeping it low-key.</Text>
        )}

        <View style={s.cardBottomRow}>
          <Pressable
            style={s.detailsButton}
            onPress={() => navigation.navigate('CrewDetails', { crewId: item.id })}
          >
            <Text style={s.detailsText}>VIEW CREW</Text>
            <ChevronRight color={INK} size={16} strokeWidth={3} />
          </Pressable>

          <Pressable
            style={[s.joinButton, { backgroundColor: accent }]}
            onPress={event => {
              event.stopPropagation();
              void joinCrew(item.id, item.name);
            }}
          >
            <Plus color={INK} size={15} strokeWidth={3} />
            <Text style={s.joinText}>JOIN</Text>
          </Pressable>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={crewList}
        renderItem={renderCrew}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={refetch}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.heroOrangeSlash} />
              <View style={s.heroAcidSlash} />
              <View style={s.heroBlueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Users color={INK} size={29} strokeWidth={2.8} />
                </View>
                <TouchableOpacity style={s.createButton} onPress={() => setShowCreateModal(true)}>
                  <Plus color={INK} size={19} strokeWidth={3} />
                  <Text style={s.createButtonText}>START A CREW</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.eyebrow}>FIND YOUR PEOPLE • REP YOUR SCENE</Text>
              <Text style={s.title}>CREWS.</Text>
              <Text style={s.subtitle}>Stack clips, earn crew XP, fight for territory, and build something local.</Text>
            </View>

            <View style={s.statsTicket}>
              <View style={s.statCell}>
                <Users color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{totalMembers}</Text>
                <Text style={s.statLabel}>SKATERS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Trophy color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{crewList.length}</Text>
                <Text style={s.statLabel}>CREWS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Zap color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{totalXp.toLocaleString()}</Text>
                <Text style={s.statLabel}>TOTAL XP</Text>
              </View>
            </View>

            {crewList.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>SCENE ROSTER</Text>
                  <Text style={s.sectionSub}>RANKED BY LIVE CREW DATA</Text>
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
                <Users color={INK} size={31} strokeWidth={2.8} />
              </View>
              <Text style={s.emptyTitle}>NO CREWS YET</Text>
              <Text style={s.emptyText}>Start the first crew and give local skaters somewhere to rally.</Text>
              <TouchableOpacity style={s.emptyCreate} onPress={() => setShowCreateModal(true)}>
                <Plus color={INK} size={17} strokeWidth={3} />
                <Text style={s.emptyCreateText}>CREATE A CREW</Text>
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
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={s.modalHeadingRow}>
                <View style={s.modalStamp}>
                  <Users color={INK} size={24} strokeWidth={2.8} />
                </View>
                <View>
                  <Text style={s.modalEyebrow}>START SOMETHING</Text>
                  <Text style={s.modalTitle}>Create a crew</Text>
                </View>
              </View>
              <TouchableOpacity style={s.closeButton} onPress={() => setShowCreateModal(false)}>
                <X color={INK} size={20} strokeWidth={2.8} />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>CREW NAME</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Burnside Lurkers"
              placeholderTextColor="#777D87"
              value={newCrewName}
              onChangeText={setNewCrewName}
              maxLength={30}
            />

            <Text style={s.inputLabel}>WHAT ARE YOU ABOUT?</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="DIY spots, night sessions, filming, street, parks..."
              placeholderTextColor="#777D87"
              value={newCrewDescription}
              onChangeText={setNewCrewDescription}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />

            <View style={s.modalNote}>
              <Zap color={INK} size={15} strokeWidth={2.8} />
              <Text style={s.modalNoteText}>Crew XP and territory are earned through real SkateQuest activity.</Text>
            </View>

            <TouchableOpacity style={s.modalCreateButton} onPress={() => void createCrew()}>
              <Plus color={INK} size={18} strokeWidth={3} />
              <Text style={s.modalCreateText}>CREATE CREW</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 285, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  heroOrangeSlash: { position: 'absolute', width: 300, height: 92, right: -105, top: 52, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  heroAcidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 32, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  heroBlueOrb: { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: 12, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 12 },
  createButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 27 },
  title: { color: PAPER, fontSize: 57, lineHeight: 55, fontWeight: '900', letterSpacing: -3.2, marginTop: 2 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 285, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 20, lineHeight: 23, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#75766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.75, marginTop: 1 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#727A87', fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },

  crewCard: { marginHorizontal: 14, marginBottom: 12, backgroundColor: PAPER, borderRadius: 22, padding: 15, borderWidth: 2, borderColor: INK, overflow: 'hidden', position: 'relative' },
  topCrewCard: { borderColor: ACID, borderWidth: 3 },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  cardStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 7 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 2 },
  rankBlock: { width: 48, height: 48, borderRadius: 14, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },
  rankNumber: { color: INK, fontSize: 15, lineHeight: 17, fontWeight: '900' },
  rankLabel: { color: INK, fontSize: 6, fontWeight: '900', letterSpacing: 0.7 },
  crewMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  crewName: { color: INK, fontSize: 20, fontWeight: '900', flexShrink: 1, letterSpacing: -0.7 },
  hotPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ACID, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  hotText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.65 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  metaText: { color: '#777A74', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.55 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#B6B1A7', marginHorizontal: 2 },
  description: { color: '#5F645E', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 14 },
  descriptionMuted: { color: '#898B84', fontSize: 11, fontStyle: 'italic', marginTop: 14 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: '#D7D0C5', marginTop: 15, paddingTop: 12 },
  detailsButton: { flex: 1, minHeight: 45, borderRadius: 13, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  detailsText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  joinButton: { minWidth: 96, minHeight: 45, borderRadius: 13, borderWidth: 1.5, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12 },
  joinText: { color: INK, fontWeight: '900', fontSize: 8, letterSpacing: 0.8 },

  emptyState: { marginHorizontal: 14, marginTop: 28, minHeight: 230, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 16, fontWeight: '900', letterSpacing: 0.8, marginTop: 15 },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 275 },
  emptyCreate: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 47, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK, paddingHorizontal: 16, marginTop: 17 },
  emptyCreateText: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.7 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.76)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 30, borderWidth: 2, borderBottomWidth: 0, borderColor: INK },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C6C0B6', alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalStamp: { width: 52, height: 52, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  modalEyebrow: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: INK, fontSize: 24, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#DDD7CD', borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 1.05, marginBottom: 6, marginTop: 2 },
  input: { backgroundColor: '#EAE5DB', borderWidth: 1.5, borderColor: '#CCC4B8', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, color: INK, fontSize: 14, fontWeight: '700', marginBottom: 15 },
  textarea: { minHeight: 100 },
  modalNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ACID, borderRadius: 12, borderWidth: 1.5, borderColor: INK, padding: 10, marginBottom: 13 },
  modalNoteText: { color: INK, fontSize: 9, fontWeight: '800', flex: 1 },
  modalCreateButton: { minHeight: 50, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modalCreateText: { color: INK, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
});
