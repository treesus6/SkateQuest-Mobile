import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock3, MapPin, Radio, Send, Sparkles, Users } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface CheckIn {
  id: string;
  user_id: string;
  park_name: string;
  message: string;
  created_at: string;
  profiles: { username: string };
}

export default function LiveCheckInScreen() {
  const { user } = useAuthStore();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [parkName, setParkName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadCheckins();
    const interval = setInterval(() => void loadCheckins(), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCheckins = async () => {
    const { data } = await supabase
      .from('live_checkins')
      .select('*, profiles(username)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50);
    setCheckins(data || []);
    setRefreshing(false);
  };

  const checkIn = async () => {
    if (!parkName.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from('live_checkins').insert({
      user_id: user.id,
      park_name: parkName.trim(),
      message: message.trim(),
    });
    if (error) Alert.alert('Could not check in', error.message);
    else {
      setParkName('');
      setMessage('');
      await loadCheckins();
    }
    setLoading(false);
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const activeParks = useMemo(() => new Set(checkins.map(item => item.park_name.trim().toLowerCase())).size, [checkins]);

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={checkins}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadCheckins(); }} tintColor="#D2673D" />}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.kickerRow}><Radio size={14} color="#4ADE80" /><Text style={s.kicker}>LIVE SCENE</Text></View>
              <Text style={s.title}>Who's skating now</Text>
              <Text style={s.sub}>Real check-ins from skaters who are out right now.</Text>

              <View style={s.statsRow}>
                <View style={s.stat}><Users size={19} color="#D2673D" /><Text style={s.statValue}>{checkins.length}</Text><Text style={s.statLabel}>SKATERS</Text></View>
                <View style={s.stat}><MapPin size={19} color="#D2673D" /><Text style={s.statValue}>{activeParks}</Text><Text style={s.statLabel}>SPOTS</Text></View>
                <View style={s.stat}><Clock3 size={19} color="#D2673D" /><Text style={s.statValue}>4h</Text><Text style={s.statLabel}>WINDOW</Text></View>
              </View>
            </View>

            <View style={s.checkinCard}>
              <View style={s.formHeader}><View><Text style={s.formKicker}>CHECK IN</Text><Text style={s.formTitle}>Put yourself on the scene</Text></View><Sparkles size={20} color="#D2673D" /></View>
              <TextInput style={s.input} placeholder="Park or spot name" placeholderTextColor="#5B6573" value={parkName} onChangeText={setParkName} />
              <TextInput style={[s.input, s.messageInput]} placeholder="What's the session like? (optional)" placeholderTextColor="#5B6573" value={message} onChangeText={setMessage} multiline />
              <TouchableOpacity style={[s.btn, (!parkName.trim() || loading) && s.btnDis]} onPress={() => void checkIn()} disabled={!parkName.trim() || loading}>
                <Send size={17} color="#fff" /><Text style={s.btnTxt}>{loading ? 'Checking in…' : "I'm skating here"}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Live right now</Text><Text style={s.sectionMeta}>refreshes automatically</Text></View>
          </>
        }
        renderItem={({ item, index }) => (
          <View style={[s.card, index === 0 && s.cardFresh]}>
            <View style={s.avatar}><Text style={s.avatarText}>{(item.profiles?.username || 'S').slice(0, 1).toUpperCase()}</Text></View>
            <View style={s.cardBody}>
              <View style={s.cardTop}><Text style={s.username}>@{item.profiles?.username || 'skater'}</Text><View style={s.timeRow}><View style={s.liveDot} /><Text style={s.time}>{timeAgo(item.created_at)}</Text></View></View>
              <View style={s.parkRow}><MapPin size={14} color="#D2673D" /><Text style={s.parkName}>{item.park_name}</Text></View>
              {item.message ? <Text style={s.msg}>{item.message}</Text> : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Radio size={42} color="#D2673D" />
            <Text style={s.emptyTitle}>The scene is quiet</Text>
            <Text style={s.emptyText}>Nobody is checked in right now. Be the first skater to light up the map.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07090D' },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  hero: { backgroundColor: '#0F1623', borderRadius: 24, padding: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { color: '#4ADE80', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#F7F4EF', fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  sub: { color: '#8E97A4', fontSize: 13, lineHeight: 19, marginTop: 5 },
  statsRow: { flexDirection: 'row', marginTop: 18, backgroundColor: '#0A0E16', borderRadius: 16, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 3, borderRightWidth: 1, borderRightColor: '#1C2430' },
  statValue: { color: '#F7F4EF', fontWeight: '900', fontSize: 18 },
  statLabel: { color: '#596273', fontWeight: '900', fontSize: 8, letterSpacing: 1 },
  checkinCard: { backgroundColor: '#0F1623', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(210,103,61,0.26)' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  formKicker: { color: '#D2673D', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  formTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 18, marginTop: 3 },
  input: { backgroundColor: '#0A0E16', color: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 13, fontSize: 14, borderWidth: 1, borderColor: '#202938', marginBottom: 9 },
  messageInput: { minHeight: 58, textAlignVertical: 'top' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D2673D', padding: 14, borderRadius: 13 },
  btnDis: { opacity: 0.45 },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, marginBottom: 1 },
  sectionTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 18 },
  sectionMeta: { color: '#596273', fontSize: 10, fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#0F1623', borderRadius: 17, padding: 14, borderWidth: 1, borderColor: '#1C2430' },
  cardFresh: { borderColor: 'rgba(74,222,128,0.25)' },
  avatar: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(210,103,61,0.14)', borderWidth: 1, borderColor: 'rgba(210,103,61,0.28)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#D2673D', fontWeight: '900', fontSize: 17 },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  username: { color: '#F3F4F6', fontWeight: '900', fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  time: { color: '#697382', fontSize: 10, fontWeight: '700' },
  parkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  parkName: { color: '#D2673D', fontSize: 14, fontWeight: '900', flex: 1 },
  msg: { color: '#9CA3AF', fontSize: 12, lineHeight: 18, marginTop: 6 },
  empty: { alignItems: 'center', backgroundColor: '#0F1623', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#1C2430' },
  emptyTitle: { color: '#F7F4EF', fontWeight: '900', fontSize: 18, marginTop: 12 },
  emptyText: { color: '#7B8493', textAlign: 'center', marginTop: 6, lineHeight: 19 },
});