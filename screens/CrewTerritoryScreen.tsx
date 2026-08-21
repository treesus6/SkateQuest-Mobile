import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Crosshair, MapPin, Shield, Swords, Target, Trophy, Users } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import { CrewTerritory, crewTerritoryService } from '../lib/crewTerritoryService';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string | null;
};

type CrewMembership = {
  crew_id: string;
  crews: { id: string; name: string; color_hex: string | null } | null;
};

export default function CrewTerritoryScreen() {
  const { user } = useAuthStore();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [territories, setTerritories] = useState<CrewTerritory[]>([]);
  const [membership, setMembership] = useState<CrewMembership | null>(null);
  const [claimSpot, setClaimSpot] = useState<Spot | null>(null);
  const [trick, setTrick] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required.');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [{ data, error }, crew] = await Promise.all([
        spotsService.getNearby(location.coords.latitude, location.coords.longitude, 25000),
        crewTerritoryService.getUserCrew(user.id),
      ]);
      if (error) throw error;
      const nearby = ((data ?? []) as Spot[]).slice(0, 30);
      setSpots(nearby);
      setMembership(crew as unknown as CrewMembership | null);
      setTerritories(await crewTerritoryService.getForSpots(nearby.map(spot => spot.id)));
    } catch (err: any) {
      Alert.alert('Could not load territory', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const leadersBySpot = useMemo(() => {
    const result = new Map<string, CrewTerritory>();
    territories.forEach(territory => {
      if (!result.has(territory.spot_id)) result.set(territory.spot_id, territory);
    });
    return result;
  }, [territories]);

  const myControlledCount = useMemo(
    () =>
      spots.filter(spot => {
        const leader = leadersBySpot.get(spot.id);
        return !!leader && leader.crew_id === membership?.crew_id;
      }).length,
    [leadersBySpot, membership?.crew_id, spots]
  );

  const openCount = useMemo(
    () => spots.filter(spot => !leadersBySpot.has(spot.id)).length,
    [leadersBySpot, spots]
  );

  const claim = async () => {
    if (!claimSpot || !trick.trim()) return;
    setClaiming(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required.');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const result = await crewTerritoryService.claim(
        claimSpot.id,
        location.coords.latitude,
        location.coords.longitude,
        trick.trim()
      );
      setClaimSpot(null);
      setTrick('');
      Alert.alert(
        'Territory points added',
        `Your crew earned ${result.points_awarded} points. You were ${result.distance_meters} m from the spot.`
      );
      await load();
    } catch (err: any) {
      Alert.alert('Claim rejected', err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <View style={s.loadingStamp}>
          <Crosshair color={INK} size={31} strokeWidth={2.8} />
        </View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.muted}>SCANNING NEARBY TERRITORY</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={spots}
        keyExtractor={spot => spot.id}
        refreshing={loading}
        onRefresh={load}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.orangeSlash} />
              <View style={s.acidSlash} />
              <View style={s.blueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Target color={INK} size={28} strokeWidth={2.8} />
                </View>
                <View style={s.gpsChip}>
                  <Crosshair color={INK} size={12} strokeWidth={3} />
                  <Text style={s.gpsChipText}>GPS VERIFIED</Text>
                </View>
              </View>

              <Text style={s.eyebrow}>REAL SPOTS • REAL TRICKS • REAL CONTROL</Text>
              <Text style={s.title}>CREW{`\n`}TERRITORY.</Text>
              <Text style={s.subtitle}>
                Land a trick at a real spot to score points. One skater can score each spot every six hours.
              </Text>
            </View>

            <View style={s.commandBoard}>
              <View style={s.commandTop}>
                <View>
                  <Text style={s.commandKicker}>YOUR CREW</Text>
                  <View style={s.crewIdentityRow}>
                    <View
                      style={[
                        s.crewColor,
                        { backgroundColor: membership?.crews?.color_hex || ORANGE },
                      ]}
                    />
                    <Text style={s.crewName}>{membership?.crews?.name || 'NO CREW YET'}</Text>
                  </View>
                </View>
                <View style={[s.statusStamp, !membership && s.statusStampOff]}>
                  <Text style={s.statusStampText}>{membership ? 'ACTIVE' : 'LOCKED'}</Text>
                </View>
              </View>

              <View style={s.statsRow}>
                <View style={s.statCell}>
                  <Shield color={INK} size={18} strokeWidth={2.7} />
                  <Text style={s.statValue}>{myControlledCount}</Text>
                  <Text style={s.statLabel}>CONTROLLED</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <Target color={INK} size={18} strokeWidth={2.7} />
                  <Text style={s.statValue}>{openCount}</Text>
                  <Text style={s.statLabel}>OPEN</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <MapPin color={INK} size={18} strokeWidth={2.7} />
                  <Text style={s.statValue}>{spots.length}</Text>
                  <Text style={s.statLabel}>IN RANGE</Text>
                </View>
              </View>

              {!membership ? (
                <View style={s.noCrew}>
                  <Users color={INK} size={18} strokeWidth={2.7} />
                  <Text style={s.noCrewText}>Join a crew before claiming territory.</Text>
                </View>
              ) : null}
            </View>

            <View style={s.sectionRow}>
              <View>
                <Text style={s.sectionTitle}>NEARBY TARGETS</Text>
                <Text style={s.sectionSub}>25 KM SCAN • PULL TO REFRESH</Text>
              </View>
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE BOARD</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <MapPin color={ORANGE} size={31} strokeWidth={2.5} />
            <Text style={s.emptyTitle}>NO TARGETS IN RANGE</Text>
            <Text style={s.empty}>No skate spots found within 25 km.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const leader = leadersBySpot.get(item.id);
          const controlledByMine = !!leader && leader.crew_id === membership?.crew_id;
          const statusColor = controlledByMine ? ACID : leader ? ORANGE : BLUE;
          const statusLabel = controlledByMine ? 'DEFEND' : leader ? 'ATTACK' : 'OPEN';

          return (
            <View style={[s.card, controlledByMine && s.myCard, index % 2 === 1 && s.cardTilt]}>
              <View style={[s.cardStripe, { backgroundColor: statusColor }]} />
              <View style={s.cardTop}>
                <View style={s.spotIndex}>
                  <Text style={s.spotIndexText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={s.spotCopy}>
                  <Text style={s.spotName}>{item.name}</Text>
                  <View style={s.cityRow}>
                    <MapPin color={ORANGE} size={12} strokeWidth={2.7} />
                    <Text style={s.spotCity}>{item.city || 'Local spot'}</Text>
                  </View>
                </View>
                <View style={[s.statusPill, { backgroundColor: statusColor }]}>
                  <Text style={s.statusPillText}>{statusLabel}</Text>
                </View>
              </View>

              <View style={s.controlRow}>
                <View style={s.ownerBlock}>
                  <Text style={s.ownerKicker}>CURRENT CONTROL</Text>
                  <View style={s.ownerLine}>
                    <View
                      style={[
                        s.ownerColor,
                        { backgroundColor: leader?.crews?.color_hex || '#A7ADB5' },
                      ]}
                    />
                    <Text style={s.ownerText} numberOfLines={1}>
                      {leader?.crews?.name || 'UNCLAIMED'}
                    </Text>
                  </View>
                </View>
                <View style={s.scoreBlock}>
                  <Trophy color={ORANGE} size={14} strokeWidth={2.8} />
                  <Text style={s.score}>{leader?.total_points ?? 0}</Text>
                  <Text style={s.points}>PTS</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.claimButton, controlledByMine && s.defendButton, !membership && s.disabled]}
                disabled={!membership}
                onPress={() => {
                  setClaimSpot(item);
                  setTrick('');
                }}
              >
                {controlledByMine ? (
                  <Shield color={INK} size={18} strokeWidth={2.8} />
                ) : (
                  <Swords color={INK} size={18} strokeWidth={2.8} />
                )}
                <Text style={s.claimText}>
                  {controlledByMine ? 'DEFEND THIS SPOT' : leader ? 'CHALLENGE CONTROL' : 'SCORE FOR YOUR CREW'}
                </Text>
                <Text style={s.claimArrow}>→</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal
        visible={!!claimSpot}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimSpot(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <View style={s.modalTopRow}>
              <View style={s.modalStamp}>
                <Crosshair color={INK} size={25} strokeWidth={2.8} />
              </View>
              <View style={s.modalHeaderCopy}>
                <Text style={s.modalEyebrow}>VERIFY A REAL CLAIM</Text>
                <Text style={s.modalTitle}>{claimSpot?.name}</Text>
              </View>
            </View>
            <Text style={s.modalBody}>
              Enter the trick you landed. SkateQuest checks that this phone is within 150 meters before crew points are added.
            </Text>

            <Text style={s.inputLabel}>TRICK LANDED</Text>
            <TextInput
              value={trick}
              onChangeText={setTrick}
              placeholder="Kickflip, boardslide, 5-0..."
              placeholderTextColor="#777D87"
              style={s.input}
              maxLength={80}
              autoFocus
            />

            <View style={s.verifyNote}>
              <Crosshair color={INK} size={15} strokeWidth={2.8} />
              <Text style={s.verifyNoteText}>GPS proof is checked again when you score.</Text>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancel} onPress={() => setClaimSpot(null)}>
                <Text style={s.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirm, (!trick.trim() || claiming) && s.disabled]}
                disabled={!trick.trim() || claiming}
                onPress={() => void claim()}
              >
                {claiming ? (
                  <ActivityIndicator color={INK} />
                ) : (
                  <>
                    <Target color={INK} size={17} strokeWidth={3} />
                    <Text style={s.confirmText}>VERIFY + SCORE</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  muted: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  list: { paddingBottom: 118 },

  hero: { minHeight: 305, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 27, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 96, right: -105, top: 57, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 225, height: 28, left: -73, bottom: 36, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  gpsChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  gpsChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 27 },
  title: { color: PAPER, fontSize: 51, lineHeight: 47, fontWeight: '900', letterSpacing: -2.8, marginTop: 3 },
  subtitle: { color: '#A2A9B5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 300, marginTop: 8 },

  commandBoard: { marginHorizontal: 14, marginTop: -10, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, padding: 16, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  commandTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  commandKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  crewIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  crewColor: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: INK },
  crewName: { color: INK, fontSize: 17, fontWeight: '900', maxWidth: 210 },
  statusStamp: { borderRadius: 10, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 9, paddingVertical: 6, transform: [{ rotate: '4deg' }] },
  statusStampOff: { backgroundColor: '#D4D0C7' },
  statusStampText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  statsRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 16, borderTopWidth: 1, borderTopColor: '#D4CEC2', paddingTop: 13 },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 20, lineHeight: 23, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.75, marginTop: 1 },
  noCrew: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, padding: 10, marginTop: 13 },
  noCrewText: { color: INK, fontSize: 10, fontWeight: '800', flex: 1 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingTop: 27, paddingBottom: 11 },
  sectionTitle: { color: PAPER, fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  sectionSub: { color: '#717986', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 3 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },

  card: { marginHorizontal: 14, marginBottom: 12, backgroundColor: PAPER, borderRadius: 21, borderWidth: 2, borderColor: INK, padding: 14, overflow: 'hidden', position: 'relative' },
  myCard: { borderColor: ACID, borderWidth: 3 },
  cardTilt: { transform: [{ rotate: '0.4deg' }] },
  cardStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 3 },
  spotIndex: { width: 42, height: 42, borderRadius: 13, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  spotIndexText: { color: PAPER, fontSize: 11, fontWeight: '900' },
  spotCopy: { flex: 1 },
  spotName: { color: INK, fontSize: 17, fontWeight: '900', letterSpacing: -0.45 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  spotCity: { color: '#747871', fontSize: 9, fontWeight: '800' },
  statusPill: { borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#D7D0C5' },
  ownerBlock: { flex: 1 },
  ownerKicker: { color: '#8A8B84', fontSize: 6.5, fontWeight: '900', letterSpacing: 1 },
  ownerLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ownerColor: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: INK },
  ownerText: { color: INK, fontSize: 11, fontWeight: '900', flex: 1 },
  scoreBlock: { minWidth: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  score: { color: INK, fontSize: 16, fontWeight: '900' },
  points: { color: '#777A74', fontSize: 7, fontWeight: '900' },
  claimButton: { minHeight: 49, marginTop: 13, borderRadius: 14, borderWidth: 2, borderColor: INK, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 },
  defendButton: { backgroundColor: ACID },
  claimText: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.7, flex: 1 },
  claimArrow: { color: INK, fontWeight: '900', fontSize: 17 },
  disabled: { opacity: 0.42 },

  emptyCard: { marginHorizontal: 14, minHeight: 165, borderRadius: 22, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 22 },
  emptyTitle: { color: PAPER, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 9 },
  empty: { color: '#7C8490', textAlign: 'center', marginTop: 4, fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, padding: 18, paddingBottom: 30 },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C6C0B6', alignSelf: 'center', marginBottom: 16 },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  modalStamp: { width: 55, height: 55, borderRadius: 16, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  modalHeaderCopy: { flex: 1 },
  modalEyebrow: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.25 },
  modalTitle: { color: INK, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  modalBody: { color: '#676B65', fontSize: 11, lineHeight: 17, fontWeight: '600', marginTop: 14 },
  inputLabel: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginTop: 17, marginBottom: 6 },
  input: { backgroundColor: '#EAE5DB', color: INK, borderRadius: 13, padding: 14, borderWidth: 1.5, borderColor: '#CCC4B8', fontWeight: '700' },
  verifyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ACID, borderRadius: 12, borderWidth: 1.5, borderColor: INK, padding: 10, marginTop: 11 },
  verifyNoteText: { color: INK, fontSize: 9, fontWeight: '800', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 9, marginTop: 15 },
  cancel: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, backgroundColor: '#D9D4CB', borderRadius: 13, borderWidth: 1.5, borderColor: INK },
  cancelText: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.8 },
  confirm: { flex: 2, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 1.5, borderColor: INK },
  confirmText: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.8 },
});
