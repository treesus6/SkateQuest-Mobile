import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/useAuthStore';
import { spotsService } from '../lib/spotsService';
import {
  MissionSpot,
  MissionStop,
  spotMissionService,
  SpotMissionRoute,
} from '../lib/spotMissionService';

type NearbySpot = MissionSpot & { distance_meters?: number };

export default function SpotMissionRoutesScreen() {
  const { user } = useAuthStore();
  const [route, setRoute] = useState<SpotMissionRoute | null>(null);
  const [nearby, setNearby] = useState<NearbySpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const active = await spotMissionService.getActiveRoute(user.id);
      setRoute(active);
      if (!active) await loadNearby();
    } catch (err: any) {
      setError(err.message || 'Could not load your mission route.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadNearby = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') throw new Error('Location permission is required.');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { data, error: nearbyError } = await spotsService.getNearby(
      location.coords.latitude,
      location.coords.longitude,
      25000
    );
    if (nearbyError) throw nearbyError;
    const unique = Array.from(
      new Map(((data ?? []) as NearbySpot[]).map(spot => [spot.id, spot])).values()
    ).slice(0, 4);
    setNearby(unique);
  };

  useEffect(() => {
    load();
  }, [load]);

  const createRoute = async () => {
    if (nearby.length < 2) {
      Alert.alert('Not enough spots', 'At least two skate spots are needed within 25 km.');
      return;
    }
    setWorking(true);
    try {
      const selected = nearby.slice(0, Math.min(3, nearby.length));
      await spotMissionService.createRoute(
        selected.map(spot => spot.id),
        `${selected[0].city || 'Local'} Spot Run`
      );
      await load();
    } catch (err: any) {
      Alert.alert('Could not start route', err.message);
    } finally {
      setWorking(false);
    }
  };

  const verify = async (stop: MissionStop) => {
    setWorking(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required.');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const result = await spotMissionService.verifyStop(
        stop.id,
        location.coords.latitude,
        location.coords.longitude
      );
      if (result.route_completed) {
        Alert.alert('Route complete! 🏆', `You earned ${result.xp_awarded} XP.`);
      } else {
        Alert.alert('Stop verified ✓', `You were ${result.distance_meters} m from the spot.`);
      }
      await load();
    } catch (err: any) {
      Alert.alert('Could not verify stop', err.message);
    } finally {
      setWorking(false);
    }
  };

  const abandon = () => {
    if (!route) return;
    Alert.alert('Abandon route?', 'Verified stops stay in history, but no XP will be awarded.', [
      { text: 'Keep route', style: 'cancel' },
      {
        text: 'Abandon',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            await spotMissionService.abandonRoute(route.id);
            await load();
          } catch (err: any) {
            Alert.alert('Could not abandon route', err.message);
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#d2673d" />
        <Text style={s.muted}>Finding your next run…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>REAL-WORLD CHALLENGE</Text>
        <Text style={s.title}>Spot Mission Route</Text>
        <Text style={s.subtitle}>
          Hit each spot in order. GPS verification unlocks the next stop and awards XP.
        </Text>

        {error && (
          <TouchableOpacity style={s.errorCard} onPress={load}>
            <Text style={s.errorText}>{error}</Text>
            <Text style={s.retry}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {route ? (
          <>
            <View style={s.routeHeader}>
              <View>
                <Text style={s.routeTitle}>{route.title}</Text>
                <Text style={s.reward}>{route.xp_reward} XP on completion</Text>
              </View>
              <Text style={s.routeProgress}>
                {route.spot_mission_stops.filter(stop => stop.verified_at).length}/
                {route.spot_mission_stops.length}
              </Text>
            </View>
            {route.spot_mission_stops.map((stop, index) => {
              const done = !!stop.verified_at;
              const unlocked =
                done || index === 0 || !!route.spot_mission_stops[index - 1]?.verified_at;
              return (
                <View key={stop.id} style={[s.stopCard, done && s.stopDone]}>
                  <View style={[s.stopNumber, done && s.stopNumberDone]}>
                    <Text style={s.stopNumberText}>{done ? '✓' : stop.position}</Text>
                  </View>
                  <View style={s.stopInfo}>
                    <Text style={s.stopName}>{stop.skate_spots.name}</Text>
                    <Text style={s.stopMeta}>
                      {done
                        ? `Verified ${Math.round(stop.verified_distance_meters || 0)} m away`
                        : unlocked
                          ? `Get within ${stop.verification_radius_meters} m`
                          : 'Complete the previous stop first'}
                    </Text>
                  </View>
                  {!done && unlocked && (
                    <TouchableOpacity
                      style={s.verifyButton}
                      disabled={working}
                      onPress={() => verify(stop)}
                    >
                      <Text style={s.verifyText}>Verify</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${stop.skate_spots.latitude},${stop.skate_spots.longitude}`
                      )
                    }
                  >
                    <Text style={s.directions}>↗</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity onPress={abandon} disabled={working} style={s.abandonButton}>
              <Text style={s.abandonText}>Abandon route</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.readyCard}>
              <Text style={s.readyIcon}>🗺️</Text>
              <Text style={s.readyTitle}>Your nearest spots are ready</Text>
              <Text style={s.readyBody}>
                SkateQuest found {nearby.length} real spots nearby and will build a route from the
                closest three.
              </Text>
              {nearby.slice(0, 3).map((spot, index) => (
                <View key={spot.id} style={s.previewStop}>
                  <Text style={s.previewNumber}>{index + 1}</Text>
                  <Text style={s.previewName}>{spot.name}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.startButton} disabled={working} onPress={createRoute}>
              {working ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.startText}>Start GPS mission</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  content: { padding: 20, paddingBottom: 48 },
  eyebrow: { color: '#d2673d', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#8A96A8', fontSize: 14, lineHeight: 20, marginTop: 7, marginBottom: 22 },
  errorCard: { backgroundColor: '#321818', borderRadius: 14, padding: 14, marginBottom: 16 },
  errorText: { color: '#FCA5A5', fontWeight: '700' },
  retry: { color: '#fff', marginTop: 4, fontSize: 12 },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  routeTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  reward: { color: '#ff8c42', fontSize: 12, fontWeight: '700', marginTop: 3 },
  routeProgress: { color: '#fff', fontSize: 22, fontWeight: '900' },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#111925',
    borderRadius: 15,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#202B3A',
  },
  stopDone: { borderColor: 'rgba(74,222,128,0.35)' },
  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#273142',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberDone: { backgroundColor: '#22C55E' },
  stopNumberText: { color: '#fff', fontWeight: '900' },
  stopInfo: { flex: 1 },
  stopName: { color: '#fff', fontWeight: '800', fontSize: 14 },
  stopMeta: { color: '#718096', fontSize: 11, marginTop: 2 },
  verifyButton: {
    backgroundColor: '#d2673d',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  verifyText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  directions: { color: '#ff8c42', fontSize: 24, paddingLeft: 2 },
  abandonButton: { alignItems: 'center', padding: 14 },
  abandonText: { color: '#667085', fontWeight: '700' },
  readyCard: {
    backgroundColor: '#111925',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#283446',
  },
  readyIcon: { fontSize: 40 },
  readyTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 8 },
  readyBody: { color: '#8A96A8', lineHeight: 19, marginTop: 6, marginBottom: 16 },
  previewStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#202B3A',
  },
  previewNumber: { color: '#d2673d', fontWeight: '900', width: 20 },
  previewName: { color: '#E2E8F0', fontWeight: '700', flex: 1 },
  startButton: {
    backgroundColor: '#d2673d',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 14,
  },
  startText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
