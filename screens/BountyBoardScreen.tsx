import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface Bounty {
  id: string;
  trick_name: string;
  park_name: string;
  description: string;
  xp_reward: number;
  status: string;
  expires_at: string;
  created_at: string;
  crews: { name: string };
}

export default function BountyBoardScreen() {
  const { user } = useAuthStore();
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBounties(); }, []);

  const loadBounties = async () => {
    const { data } = await supabase
      .from('bounties')
      .select('*, crews(name)')
      .eq('status', 'open')
      .order('xp_reward', { ascending: false });
    setBounties(data || []);
    setLoading(false);
  };

  const daysLeft = (expires: string) => {
    const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
    return days <= 0 ? 'Expired' : `${days}d left`;
  };

  const claimBounty = (bounty: Bounty) => {
    Alert.alert(
      'Claim Bounty',
      `Land "${bounty.trick_name}" and upload your clip to claim ${bounty.xp_reward} XP!`,
      [{ text: 'Got it', style: 'default' }, { text: 'Cancel', style: 'cancel' }]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>💰 Bounty Board</Text>
        <Text style={s.sub}>Land the trick. Claim the XP. Rep your crew.</Text>
      </View>

      <FlatList
        data={bounties}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.xpBadge}>
                <Text style={s.xpText}>{item.xp_reward} XP</Text>
              </View>
              <Text style={s.expires}>{daysLeft(item.expires_at)}</Text>
            </View>
            <Text style={s.trick}>{item.trick_name}</Text>
            {item.park_name && <Text style={s.park}>📍 {item.park_name}</Text>}
            {item.description && <Text style={s.desc}>{item.description}</Text>}
            {item.crews && <Text style={s.crew}>Posted by {item.crews.name}</Text>}
            <TouchableOpacity style={s.claimBtn} onPress={() => claimBounty(item)}>
              <Text style={s.claimTxt}>Claim This Bounty →</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💰</Text>
              <Text style={s.emptyText}>No open bounties right now. Check back soon.</Text>
            </View>
          ) : null
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
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1a2030' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  xpBadge: { backgroundColor: 'rgba(210,103,61,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#d2673d' },
  xpText: { color: '#d2673d', fontWeight: '900', fontSize: 14 },
  expires: { color: '#6B7280', fontSize: 12 },
  trick: { color: '#F3F4F6', fontSize: 20, fontWeight: '900', marginBottom: 6 },
  park: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  desc: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  crew: { color: '#4B5563', fontSize: 11, marginBottom: 10 },
  claimBtn: { backgroundColor: '#d2673d', borderRadius: 8, padding: 12, alignItems: 'center' },
  claimTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
});
