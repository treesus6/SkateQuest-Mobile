import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => {
    loadCheckins();
    const interval = setInterval(loadCheckins, 30000);
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
  };

  const checkIn = async () => {
    if (!parkName.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from('live_checkins').insert({
      user_id: user.id,
      park_name: parkName.trim(),
      message: message.trim(),
    });
    if (error) Alert.alert('Error', error.message);
    else { setParkName(''); setMessage(''); loadCheckins(); }
    setLoading(false);
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ago`;
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>📍 Who's Skating Now</Text>
        <Text style={s.sub}>See who's out right now. Check ins expire in 4 hours.</Text>
      </View>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="Park or spot name..."
          placeholderTextColor="#4B5563"
          value={parkName}
          onChangeText={setParkName}
        />
        <TextInput
          style={s.input}
          placeholder="Add a message... (optional)"
          placeholderTextColor="#4B5563"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={[s.btn, loading && s.btnDis]} onPress={checkIn} disabled={loading}>
          <Text style={s.btnTxt}>{loading ? 'Checking in...' : "I'm Skating Here 🛹"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={checkins}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.username}>@{item.profiles?.username || 'skater'}</Text>
              <Text style={s.time}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={s.parkName}>📍 {item.park_name}</Text>
            {item.message ? <Text style={s.msg}>{item.message}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛹</Text>
            <Text style={s.emptyText}>No one's checked in yet. Be the first!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#F3F4F6' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  form: { padding: 16, gap: 8 },
  input: { backgroundColor: '#111827', color: '#F3F4F6', padding: 12, borderRadius: 10, fontSize: 15 },
  btn: { backgroundColor: '#d2673d', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnDis: { opacity: 0.5 },
  btnTxt: { color: 'white', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a2030' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  username: { color: '#d2673d', fontWeight: '700', fontSize: 13 },
  time: { color: '#4B5563', fontSize: 12 },
  parkName: { color: '#F3F4F6', fontSize: 15, fontWeight: '700' },
  msg: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
});
