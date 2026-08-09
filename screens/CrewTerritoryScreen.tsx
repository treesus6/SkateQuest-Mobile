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
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import { CrewTerritory, crewTerritoryService } from '../lib/crewTerritoryService';

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
    if (!user) return;
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
    load();
  }, [load]);

  const leadersBySpot = useMemo(() => {
    const result = new Map<string, CrewTerritory>();
    territories.forEach(territory => {
      if (!result.has(territory.spot_id)) result.set(territory.spot_id, territory);
    });
    return result;
  }, [territories]);

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
        'Territory points added 🛹',
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
        <ActivityIndicator size="large" color="#d2673d" />
        <Text style={s.muted}>Loading nearby territory…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>GPS-VERIFIED CREW PLAY</Text>
        <Text style={s.title}>Crew Territory</Text>
        <Text style={s.subtitle}>
          Land a trick at a real spot to score points. One skater can score each spot every six
          hours.
        </Text>
        {membership?.crews ? (
          <View style={s.crewBadge}>
            <View
              style={[s.crewColor, { backgroundColor: membership.crews.color_hex || '#d2673d' }]}
            />
            <Text style={s.crewName}>{membership.crews.name}</Text>
          </View>
        ) : (
          <View style={s.noCrew}>
            <Text style={s.noCrewText}>Join a crew before claiming territory.</Text>
          </View>
        )}
      </View>

      <FlatList
        data={spots}
        keyExtractor={spot => spot.id}
        contentContainerStyle={s.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={s.empty}>No skate spots found within 25 km.</Text>}
        renderItem={({ item }) => {
          const leader = leadersBySpot.get(item.id);
          const controlledByMine = !!leader && leader.crew_id === membership?.crew_id;
          return (
            <View style={[s.card, controlledByMine && s.myCard]}>
              <View style={s.cardTop}>
                <View style={s.spotCopy}>
                  <Text style={s.spotName}>{item.name}</Text>
                  <Text style={s.spotCity}>{item.city || 'Local spot'}</Text>
                </View>
                {leader ? (
                  <View style={s.scoreBadge}>
                    <Text style={s.score}>{leader.total_points}</Text>
                    <Text style={s.points}>PTS</Text>
                  </View>
                ) : (
                  <View style={s.openBadge}>
                    <Text style={s.openText}>OPEN</Text>
                  </View>
                )}
              </View>
              <View style={s.ownerRow}>
                <View
                  style={[s.ownerColor, { backgroundColor: leader?.crews?.color_hex || '#4B5563' }]}
                />
                <Text style={s.ownerText}>
                  {leader?.crews?.name
                    ? `${leader.crews.name} controls this spot`
                    : 'No crew has scored here yet'}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.claimButton, !membership && s.disabled]}
                disabled={!membership}
                onPress={() => {
                  setClaimSpot(item);
                  setTrick('');
                }}
              >
                <Text style={s.claimText}>
                  {controlledByMine ? 'Defend this spot' : 'Score for your crew'}
                </Text>
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
            <Text style={s.modalEyebrow}>VERIFY A REAL CLAIM</Text>
            <Text style={s.modalTitle}>{claimSpot?.name}</Text>
            <Text style={s.modalBody}>
              Enter the trick you landed. SkateQuest will verify that your phone is within 150
              meters before adding crew points.
            </Text>
            <TextInput
              value={trick}
              onChangeText={setTrick}
              placeholder="Trick landed (for example: kickflip)"
              placeholderTextColor="#667085"
              style={s.input}
              maxLength={80}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancel} onPress={() => setClaimSpot(null)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirm, (!trick.trim() || claiming) && s.disabled]}
                disabled={!trick.trim() || claiming}
                onPress={claim}
              >
                {claiming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.confirmText}>Verify + score</Text>
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
  container: { flex: 1, backgroundColor: '#05070B' },
  loading: {
    flex: 1,
    backgroundColor: '#05070B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  muted: { color: '#718096' },
  header: { padding: 20, paddingBottom: 12 },
  eyebrow: { color: '#d2673d', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#8A96A8', fontSize: 13, lineHeight: 19, marginTop: 6 },
  crewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#111925',
    borderRadius: 12,
    padding: 10,
    marginTop: 13,
  },
  crewColor: { width: 12, height: 12, borderRadius: 6 },
  crewName: { color: '#fff', fontWeight: '800' },
  noCrew: { backgroundColor: '#2A1C12', borderRadius: 12, padding: 11, marginTop: 13 },
  noCrewText: { color: '#FDBA74', fontWeight: '700' },
  list: { padding: 20, paddingTop: 5, paddingBottom: 45 },
  empty: { color: '#718096', textAlign: 'center', marginTop: 50 },
  card: {
    backgroundColor: '#111925',
    borderRadius: 16,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#202B3A',
  },
  myCard: { borderColor: 'rgba(74,222,128,0.45)' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  spotCopy: { flex: 1 },
  spotName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  spotCity: { color: '#718096', fontSize: 11, marginTop: 2 },
  scoreBadge: {
    minWidth: 52,
    backgroundColor: 'rgba(210,103,61,0.14)',
    borderRadius: 10,
    padding: 7,
    alignItems: 'center',
  },
  score: { color: '#ff8c42', fontSize: 17, fontWeight: '900' },
  points: { color: '#ff8c42', fontSize: 7, fontWeight: '900' },
  openBadge: {
    backgroundColor: '#263141',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  openText: { color: '#94A3B8', fontSize: 9, fontWeight: '900' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 12 },
  ownerColor: { width: 9, height: 9, borderRadius: 5 },
  ownerText: { color: '#9AA6B7', fontSize: 12, flex: 1 },
  claimButton: { backgroundColor: '#d2673d', borderRadius: 10, padding: 11, alignItems: 'center' },
  claimText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  disabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#111925',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 36,
  },
  modalEyebrow: { color: '#d2673d', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 5 },
  modalBody: { color: '#8A96A8', fontSize: 13, lineHeight: 19, marginTop: 8 },
  input: {
    backgroundColor: '#05070B',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#293548',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancel: {
    flex: 1,
    alignItems: 'center',
    padding: 13,
    backgroundColor: '#263141',
    borderRadius: 11,
  },
  cancelText: { color: '#CBD5E1', fontWeight: '800' },
  confirm: {
    flex: 2,
    alignItems: 'center',
    padding: 13,
    backgroundColor: '#d2673d',
    borderRadius: 11,
  },
  confirmText: { color: '#fff', fontWeight: '900' },
});
