import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export default function SkatePassportScreen() {
  const { user } = useAuthStore();
  const [stamps, setStamps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStamps();
  }, []);

  const loadStamps = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('skate_passport_stamps')
      .select('location_code')
      .eq('user_id', user.id);
    setStamps(data?.map(s => s.location_code) || []);
    setLoading(false);
  };

  const stamped = stamps.length;
  const total = US_STATES.length;
  const pct = Math.round((stamped / total) * 100);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.header}>
          <Text style={s.title}>🛹 Skate Passport</Text>
          <Text style={s.sub}>Skate every state. Collect them all.</Text>
          <View style={s.progress}>
            <Text style={s.progText}>{stamped} / {total} States — {pct}%</Text>
            <View style={s.bar}><View style={[s.fill, { width: `${pct}%` as any }]} /></View>
          </View>
        </View>

        <View style={s.grid}>
          {US_STATES.map(state => {
            const done = stamps.includes(state);
            return (
              <View key={state} style={[s.stamp, done && s.stampDone]}>
                <Text style={[s.stateCode, done && s.stateDone]}>{state}</Text>
                {done && <Text style={s.check}>✓</Text>}
              </View>
            );
          })}
        </View>

        <View style={s.tip}>
          <Text style={s.tipText}>🗺 Stamps are earned automatically when you check in at a park in a new state.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#F3F4F6', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  progress: { marginTop: 8 },
  progText: { fontSize: 14, color: '#d2673d', fontWeight: '700', marginBottom: 6 },
  bar: { height: 8, backgroundColor: '#1a1f3a', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#d2673d', borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  stamp: {
    width: 54, height: 54, borderRadius: 8,
    backgroundColor: '#111827', borderWidth: 1, borderColor: '#1a2030',
    alignItems: 'center', justifyContent: 'center',
  },
  stampDone: { backgroundColor: 'rgba(210,103,61,0.2)', borderColor: '#d2673d' },
  stateCode: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  stateDone: { color: '#d2673d' },
  check: { fontSize: 10, color: '#d2673d' },
  tip: { margin: 20, padding: 16, backgroundColor: '#111827', borderRadius: 10 },
  tipText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
