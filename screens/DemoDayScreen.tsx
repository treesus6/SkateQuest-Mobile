import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export default function DemoDayScreen() {
  const { user } = useAuthStore();
  const [demos, setDemos] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('demo_days')
      .select('*, skate_shops(name)')
      .gte('event_date', new Date().toISOString())
      .order('event_date');
    setDemos(data || []);

    if (user) {
      const { data: rv } = await supabase
        .from('demo_day_rsvps')
        .select('demo_id')
        .eq('user_id', user.id);
      setRsvps(new Set(rv?.map(r => r.demo_id) || []));
    }
  };

  const rsvp = async (demoId: string) => {
    if (!user) return;
    if (rsvps.has(demoId)) {
      await supabase.from('demo_day_rsvps').delete().eq('user_id', user.id).eq('demo_id', demoId);
      setRsvps(prev => { const s = new Set(prev); s.delete(demoId); return s; });
    } else {
      await supabase.from('demo_day_rsvps').insert({ user_id: user.id, demo_id: demoId });
      setRsvps(prev => new Set([...prev, demoId]));
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🎪 Demo Days</Text>
        <Text style={s.sub}>Free demos, giveaways, and pro skaters near you.</Text>
      </View>

      <FlatList
        data={demos}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const going = rsvps.has(item.id);
          const date = new Date(item.event_date);
          return (
            <View style={s.card}>
              <View style={s.dateBox}>
                <Text style={s.dateMonth}>{date.toLocaleString('default', { month: 'short' }).toUpperCase()}</Text>
                <Text style={s.dateDay}>{date.getDate()}</Text>
              </View>
              <View style={s.cardMain}>
                <Text style={s.eventTitle}>{item.title}</Text>
                {item.skate_shops && <Text style={s.shopName}>@ {item.skate_shops.name}</Text>}
                <Text style={s.eventTime}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                {item.brands?.length > 0 && (
                  <Text style={s.brands}>Brands: {item.brands.join(', ')}</Text>
                )}
                {item.free_stuff && <Text style={s.freeTag}>🎁 Free giveaways!</Text>}
              </View>
              <TouchableOpacity style={[s.rsvpBtn, going && s.goingBtn]} onPress={() => rsvp(item.id)}>
                <Text style={s.rsvpTxt}>{going ? '✓ Going' : 'RSVP'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎪</Text>
            <Text style={s.emptyText}>No demos scheduled nearby. Check back soon!</Text>
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
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1a2030' },
  dateBox: { width: 48, alignItems: 'center', backgroundColor: 'rgba(210,103,61,0.15)', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: 'rgba(210,103,61,0.3)' },
  dateMonth: { color: '#d2673d', fontSize: 10, fontWeight: '700' },
  dateDay: { color: '#F3F4F6', fontSize: 22, fontWeight: '900' },
  cardMain: { flex: 1 },
  eventTitle: { color: '#F3F4F6', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  shopName: { color: '#d2673d', fontSize: 12, marginBottom: 2 },
  eventTime: { color: '#6B7280', fontSize: 12, marginBottom: 4 },
  brands: { color: '#9CA3AF', fontSize: 11, marginBottom: 2 },
  freeTag: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  rsvpBtn: { backgroundColor: '#d2673d', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  goingBtn: { backgroundColor: '#166534' },
  rsvpTxt: { color: 'white', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
});
