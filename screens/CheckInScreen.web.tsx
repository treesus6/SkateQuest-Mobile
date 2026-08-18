import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, Clock, MapPin, Users, Zap } from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { streaksService } from '../lib/streaksService';
import { getBrowserLocation } from '../lib/browserLocation';

const XP_PER_CHECKIN = 25;
const MAX_CHECKIN_DISTANCE_METERS = 150;

type RouteParams = {
  spotId: string;
  spotName: string;
  latitude: string | number;
  longitude: string | number;
};

type CheckInRecord = {
  id: string;
  spot_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  profiles?: { username?: string } | null;
};

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CheckInScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RouteParams;
  const { user } = useAuthStore();

  const spotId = String(params?.spotId ?? '');
  const spotName = String(params?.spotName ?? 'Skate spot');
  const latitude = Number(params?.latitude);
  const longitude = Number(params?.longitude);

  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const validSpotCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const fetchCheckIns = useCallback(async () => {
    if (!spotId) {
      setLoading(false);
      return;
    }
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('check_ins')
        .select('*, profiles(username)')
        .eq('spot_id', spotId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const next = (data ?? []) as CheckInRecord[];
      setRecords(next);
      if (user?.id) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        setAlreadyCheckedIn(
          next.some(row => row.user_id === user.id && new Date(row.created_at) >= start)
        );
      }
    } catch (error) {
      console.error('Web check-ins failed to load', error);
    } finally {
      setLoading(false);
    }
  }, [spotId, user?.id]);

  useEffect(() => {
    void fetchCheckIns();
  }, [fetchCheckIns]);

  const hereNow = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    return records.filter(row => new Date(row.created_at).getTime() >= cutoff);
  }, [records]);

  const handleCheckIn = async () => {
    if (!user) {
      navigation.replace('Login');
      return;
    }
    if (!validSpotCoordinates) {
      Alert.alert('Check-in unavailable', 'This spot is missing valid map coordinates.');
      return;
    }

    setCheckingIn(true);
    setLocationMessage('Checking your location…');
    try {
      const current = await getBrowserLocation();
      const distance = distanceMeters(
        current.latitude,
        current.longitude,
        latitude,
        longitude
      );

      if (distance > MAX_CHECKIN_DISTANCE_METERS) {
        setLocationMessage(`You are about ${Math.round(distance)}m from this spot.`);
        Alert.alert(
          'Too far from the spot',
          `Move within ${MAX_CHECKIN_DISTANCE_METERS}m of ${spotName} to check in.`
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const { error: checkInError } = await supabase.from('check_ins').insert({
        spot_id: spotId,
        user_id: user.id,
        latitude: current.latitude,
        longitude: current.longitude,
        created_at: nowIso,
      });
      if (checkInError) throw checkInError;

      await supabase
        .from('park_visits')
        .insert({ user_id: user.id, park_id: spotId, session_start: nowIso })
        .then(() => undefined)
        .catch(() => undefined);

      const { error: xpError } = await supabase.rpc('increment_xp', {
        user_id: user.id,
        amount: XP_PER_CHECKIN,
      });

      setAlreadyCheckedIn(true);
      setLocationMessage(
        xpError ? 'Checked in. XP could not be updated.' : `Checked in — +${XP_PER_CHECKIN} XP`
      );
      void fetchCheckIns();
      streaksService.updateOnActivity(user.id).catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not verify your location.';
      setLocationMessage(message);
      Alert.alert('Check-in failed', message);
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' }}>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 8 }}>
          <ChevronLeft color="#FF6B35" size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>Check In</Text>
          <Text style={{ color: '#888', marginTop: 2 }}>{spotName}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <View style={{ alignItems: 'center', marginVertical: 18 }}>
            <Pressable
              disabled={checkingIn || alreadyCheckedIn}
              onPress={handleCheckIn}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: alreadyCheckedIn ? '#202020' : '#FF6B35',
                opacity: checkingIn ? 0.65 : 1,
              }}
            >
              {checkingIn ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <>
                  <MapPin color="white" size={52} />
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 17, marginTop: 10 }}>
                    {alreadyCheckedIn ? 'Checked In Today' : 'Check In'}
                  </Text>
                </>
              )}
            </Pressable>
            {!alreadyCheckedIn ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <Zap color="#FF6B35" size={16} />
                <Text style={{ color: '#FF6B35', fontWeight: '800' }}>+{XP_PER_CHECKIN} XP</Text>
              </View>
            ) : null}
            <Text style={{ color: '#AAB1BC', marginTop: 12, textAlign: 'center' }}>
              {locationMessage ?? `You must be within ${MAX_CHECKIN_DISTANCE_METERS}m of the spot.`}
            </Text>
          </View>

          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Users color="#FF6B35" size={18} />
              <Text style={{ color: 'white', fontWeight: '800' }}>Who's Here Now ({hereNow.length})</Text>
            </View>
            {hereNow.length === 0 ? (
              <Text style={{ color: '#777' }}>Nobody checked in recently.</Text>
            ) : (
              hereNow.slice(0, 20).map(row => (
                <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                  <Text style={{ color: '#EEE' }}>{row.profiles?.username ?? 'Skater'}</Text>
                  <Text style={{ color: '#777' }}>{timeAgo(row.created_at)}</Text>
                </View>
              ))
            )}
          </View>

          <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Clock color="#888" size={18} />
              <Text style={{ color: 'white', fontWeight: '800' }}>Recent Check-ins</Text>
            </View>
            {records.slice(0, 20).map(row => (
              <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                <Text style={{ color: '#EEE' }}>{row.profiles?.username ?? 'Skater'}</Text>
                <Text style={{ color: '#777' }}>{timeAgo(row.created_at)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
