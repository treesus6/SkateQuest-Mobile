import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { ChevronLeft, Clock, MapPin, Users, Zap, CalendarDays } from 'lucide-react-native';
import { useNavigation, useRoute } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { streaksService } from '../lib/streaksService';

type RouteParams = { spotId: string; spotName: string; latitude: number; longitude: number };
type CheckInRecord = { id: string; park_id: string; park_name?: string | null; user_id: string; latitude: number; longitude: number; created_at: string; profiles?: { username?: string } | null };

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

  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);

  const fetchCheckIns = useCallback(async () => {
    if (!spotId) { setLoading(false); return; }
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('live_checkins')
        .select('id,park_id,park_name,user_id,latitude,longitude,created_at,profiles(username)')
        .eq('park_id', spotId)
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const next = (data ?? []) as CheckInRecord[];
      setRecords(next);
      if (user?.id) {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        setAlreadyCheckedIn(next.some(row => row.user_id === user.id && new Date(row.created_at) >= start));
      }
    } catch (error) {
      console.error('Check-ins failed to load', error);
    } finally {
      setLoading(false);
    }
  }, [spotId, user?.id]);

  useEffect(() => { void fetchCheckIns(); }, [fetchCheckIns]);

  const hereNow = useMemo(() => {
    const cutoff = Date.now() - 3 * 60 * 60 * 1000;
    return records.filter(row => new Date(row.created_at).getTime() >= cutoff);
  }, [records]);

  const handleCheckIn = async () => {
    if (!user) { navigation.replace('Login'); return; }
    setCheckingIn(true);
    setLocationMessage('Checking your location…');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Location permission is required to check in.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { data, error } = await supabase.rpc('verified_web_check_in', {
        p_spot_id: spotId,
        p_latitude: current.coords.latitude,
        p_longitude: current.coords.longitude,
      });
      if (error) throw error;
      const result = (data ?? {}) as { distance_meters?: number; xp_awarded?: number };
      setAlreadyCheckedIn(true);
      setShowSessionPrompt(true);
      setLocationMessage(`Checked in${result.xp_awarded ? ` — +${result.xp_awarded} XP` : ''} · ${Math.round(result.distance_meters ?? 0)}m away`);
      await fetchCheckIns();
      streaksService.updateOnActivity(user.id).catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not verify your location.';
      setLocationMessage(message);
      Alert.alert('Check-in failed', message);
    } finally {
      setCheckingIn(false);
    }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' }}><Pressable onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 8 }}><ChevronLeft color="#FF6B35" size={24}/></Pressable><View style={{ flex: 1 }}><Text style={{ color: 'white', fontSize: 20, fontWeight: '900' }}>Check In</Text><Text style={{ color: '#888', marginTop: 2 }}>{spotName}</Text></View></View>
    {loading ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#FF6B35"/></View> : <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <View style={{ alignItems: 'center', marginVertical: 18 }}><Pressable disabled={checkingIn || alreadyCheckedIn} onPress={() => void handleCheckIn()} style={{ width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: alreadyCheckedIn ? '#202020' : '#FF6B35', opacity: checkingIn ? 0.65 : 1 }}>{checkingIn ? <ActivityIndicator size="large" color="white"/> : <><MapPin color="white" size={52}/><Text style={{ color: 'white', fontWeight: '900', fontSize: 17, marginTop: 10 }}>{alreadyCheckedIn ? 'Checked In Today' : 'Check In'}</Text></>}</Pressable>{!alreadyCheckedIn ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}><Zap color="#FF6B35" size={16}/><Text style={{ color: '#FF6B35', fontWeight: '800' }}>+25 XP</Text></View> : null}<Text style={{ color: '#AAB1BC', marginTop: 12, textAlign: 'center' }}>{locationMessage ?? 'You must be within 150m of the spot.'}</Text></View>
      {showSessionPrompt ? <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16, marginBottom: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}><CalendarDays size={18} color="#6B4CE6"/><Text style={{ color: 'white', fontWeight: '800' }}>Anyone else skating here?</Text></View><View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={() => navigation.navigate('Sessions', { spotId, spotName, autoCreate: true })} style={{ flex: 1, backgroundColor: '#6B4CE6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: 'white', fontWeight: '700' }}>Start a Session</Text></Pressable><Pressable onPress={() => navigation.navigate('Sessions', { spotId, spotName })} style={{ flex: 1, borderWidth: 1, borderColor: '#6B4CE6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}><Text style={{ color: '#6B4CE6', fontWeight: '700' }}>See Sessions</Text></Pressable></View></View> : null}
      <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16, marginBottom: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Users color="#FF6B35" size={18}/><Text style={{ color: 'white', fontWeight: '800' }}>Who's Here Now ({hereNow.length})</Text></View>{hereNow.length === 0 ? <Text style={{ color: '#777' }}>Nobody checked in recently.</Text> : hereNow.slice(0,20).map(row => <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}><Text style={{ color: '#EEE' }}>{row.profiles?.username ?? 'Skater'}</Text><Text style={{ color: '#777' }}>{timeAgo(row.created_at)}</Text></View>)}</View>
      <View style={{ backgroundColor: '#181818', borderRadius: 16, padding: 16 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Clock color="#888" size={18}/><Text style={{ color: 'white', fontWeight: '800' }}>Recent Check-ins</Text></View>{records.slice(0,20).map(row => <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}><Text style={{ color: '#EEE' }}>{row.profiles?.username ?? 'Skater'}</Text><Text style={{ color: '#777' }}>{timeAgo(row.created_at)}</Text></View>)}</View>
    </ScrollView>}
  </SafeAreaView>;
}
