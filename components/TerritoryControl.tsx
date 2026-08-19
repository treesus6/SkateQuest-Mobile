import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Crosshair, Flag, MapPin, ShieldCheck, Swords, Trophy } from 'lucide-react-native';
import { crewsService } from '../lib/crewsService';
import { getBrowserLocation } from '../lib/browserLocation';
import { useAuthStore } from '../stores/useAuthStore';

const ACCENT = '#D2673D';
const CARD = '#101722';
const BORDER = '#202B3A';

interface TerritoryControlProps {
  spotId: string;
  onUpdate?: () => void;
}

interface Territory {
  crew_id: string;
  crew_name: string;
  crew_color: string;
  total_points: number;
}

interface UserCrew {
  id: string;
  name: string;
  color: string;
}

async function currentCoordinates() {
  if (Platform.OS === 'web') {
    const location = await getBrowserLocation();
    return { latitude: location.latitude, longitude: location.longitude };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission is required to prove you are at this skate spot.');
  }
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}

export default function TerritoryControl({ spotId, onUpdate }: TerritoryControlProps) {
  const user = useAuthStore(state => state.user);
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [userCrew, setUserCrew] = useState<UserCrew | null>(null);
  const [trickName, setTrickName] = useState('');
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [territoryResult, crewResult] = await Promise.all([
        crewsService.getTerritoryForSpot(spotId),
        user?.id ? crewsService.getUserCrew(user.id) : Promise.resolve({ data: null, error: null } as any),
      ]);

      if (territoryResult.error) throw territoryResult.error;
      if (crewResult?.error) throw crewResult.error;

      const row = territoryResult.data as any;
      setTerritory(
        row
          ? {
              crew_id: row.crew_id,
              crew_name: row.crews?.name || 'Unknown crew',
              crew_color: row.crews?.color_hex || ACCENT,
              total_points: row.total_points || 0,
            }
          : null
      );

      const crewRow = crewResult?.data as any;
      setUserCrew(
        crewRow
          ? {
              id: crewRow.crew_id,
              name: crewRow.crews?.name || 'Your crew',
              color: crewRow.crews?.color_hex || ACCENT,
            }
          : null
      );
    } catch (error) {
      console.error('Territory data failed', error);
    } finally {
      setLoading(false);
    }
  }, [spotId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async () => {
    if (!userCrew) {
      Alert.alert('Join a crew first', 'You need an active crew before you can score territory.');
      return;
    }
    const trick = trickName.trim();
    if (trick.length < 2) {
      Alert.alert('What did you land?', 'Enter the trick you landed at this spot.');
      return;
    }

    try {
      setCapturing(true);
      const coordinates = await currentCoordinates();
      const { data, error } = await crewsService.claimTerritory({
        spotId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        trickName: trick,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.claimed) throw new Error(result?.error || 'The territory claim was not accepted.');

      setTrickName('');
      Alert.alert(
        territory?.crew_id === userCrew.id ? 'Territory defended' : 'Territory scored',
        `${trick} verified at the spot. +${result.points_awarded ?? 10} territory points for ${userCrew.name}.`
      );
      await load();
      onUpdate?.();
    } catch (error: any) {
      Alert.alert('Claim not verified', error?.message || 'Move close to the spot and try again.');
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <View style={s.card}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.iconBox}><Flag color={ACCENT} size={20} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>REAL-WORLD CREW REP</Text>
          <Text style={s.title}>Territory Control</Text>
        </View>
        <ShieldCheck color="#72E39C" size={20} />
      </View>

      {territory ? (
        <View style={[s.ownerCard, { borderLeftColor: territory.crew_color }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.ownerLabel}>CURRENT LEADER</Text>
            <Text style={s.ownerName}>{territory.crew_name}</Text>
            <Text style={s.points}>{territory.total_points.toLocaleString()} territory points</Text>
          </View>
          <View style={[s.crewDot, { backgroundColor: territory.crew_color }]} />
        </View>
      ) : (
        <View style={s.openCard}>
          <MapPin color="#6FC3FF" size={20} />
          <View style={{ flex: 1 }}>
            <Text style={s.openTitle}>Unclaimed spot</Text>
            <Text style={s.openText}>Land something here and put your crew on the board.</Text>
          </View>
        </View>
      )}

      {userCrew ? (
        <>
          <View style={s.yourCrewRow}>
            <Trophy color="#F7B955" size={16} />
            <Text style={s.yourCrewLabel}>SCORING FOR</Text>
            <Text style={s.yourCrewName}>{userCrew.name}</Text>
          </View>

          <TextInput
            value={trickName}
            onChangeText={setTrickName}
            placeholder="What did you land?"
            placeholderTextColor="#5D6979"
            maxLength={80}
            editable={!capturing}
            style={s.input}
          />

          <View style={s.ruleRow}>
            <Crosshair color="#72E39C" size={15} />
            <Text style={s.ruleText}>Your phone must verify you are within 150 m. One score per spot every 6 hours.</Text>
          </View>

          <Pressable
            disabled={capturing}
            onPress={() => void claim()}
            style={[s.claimButton, territory?.crew_id === userCrew.id && s.defendButton, capturing && { opacity: 0.55 }]}
          >
            {capturing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Swords color="#fff" size={18} />
                <Text style={s.claimText}>{territory?.crew_id === userCrew.id ? 'DEFEND THIS SPOT' : 'SCORE THIS SPOT'}</Text>
              </>
            )}
          </Pressable>
        </>
      ) : (
        <Text style={s.noCrew}>Join or create a crew to score verified territory points.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: 16, marginVertical: 10, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#24140F', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: ACCENT, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#F4F1EC', fontSize: 18, fontWeight: '900', marginTop: 2 },
  ownerCard: { marginTop: 14, borderRadius: 14, backgroundColor: '#0D141E', borderLeftWidth: 4, padding: 13, flexDirection: 'row', alignItems: 'center' },
  ownerLabel: { color: '#68778A', fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  ownerName: { color: '#F1F4F8', fontSize: 16, fontWeight: '900', marginTop: 3 },
  points: { color: '#8995A5', fontSize: 11, marginTop: 3 },
  crewDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#EEF2F7' },
  openCard: { marginTop: 14, borderRadius: 14, backgroundColor: '#0D1822', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  openTitle: { color: '#E6EDF5', fontWeight: '900', fontSize: 13 },
  openText: { color: '#708095', fontSize: 10, lineHeight: 15, marginTop: 2 },
  yourCrewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 15 },
  yourCrewLabel: { color: '#718095', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  yourCrewName: { color: '#F7B955', fontSize: 11, fontWeight: '900', flex: 1, textAlign: 'right' },
  input: { marginTop: 10, minHeight: 46, borderRadius: 13, backgroundColor: '#0C131D', borderWidth: 1, borderColor: '#293648', color: '#fff', paddingHorizontal: 13, fontSize: 13 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 10 },
  ruleText: { color: '#7F8D9E', fontSize: 10, lineHeight: 15, flex: 1 },
  claimButton: { marginTop: 13, minHeight: 48, borderRadius: 13, backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  defendButton: { backgroundColor: '#2F7D50' },
  claimText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  noCrew: { color: '#758397', fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 15 },
});
