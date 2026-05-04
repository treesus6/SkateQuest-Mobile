import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export default function HiddenGemsScreen() {
  const { user } = useAuthStore();
  const [gems, setGems] = useState<any[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', user.id)
      .single();
    const xp = profile?.xp || 0;
    setUserXP(xp);

    const { data } = await supabase
      .from('hidden_gems')
      .select('*')
      .order('unlock_xp_required');
    setGems(data || []);
    setLoading(false);
  };

  const unlocked = gems.filter(g => userXP >= g.unlock_xp_required);
  const locked = gems.filter(g => userXP < g.unlock_xp_required);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>💎 Hidden Gems</Text>
        <Text style={s.sub}>Secret spots unlocked by earning XP.</Text>
        <View style={s.xpRow}>
          <Text style={s.xpLabel}>Your XP: </Text>
          <Text style={s.xpValue}>{userXP.toLocaleString()}</Text>
        </View>
        <Text style={s.unlockCount}>{unlocked.length} of {gems.length} spots unlocked</Text>
      </View>

      <FlatList
        data={[...unlocked, ...locked]}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const isUnlocked = userXP >= item.unlock_xp_required;
          return (
            <View style={[s.card, !isUnlocked && s.cardLocked]}>
              <View style={s.cardLeft}>
                <Text style={s.gemIcon}>{isUnlocked ? '💎' : '🔒'}</Text>
              </View>
              <View style={s.cardMain}>
                {isUnlocked ? (
                  <>
                    <Text style={s.gemName}>{item.name}</Text>
                    <Text style={s.gemDesc}>{item.description}</Text>
                    <Text style={s.gemCoords}>📍 {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.lockedName}>???</Text>
                    <Text style={s.lockedReq}>Requires {item.unlock_xp_required.toLocaleString()} XP</Text>
                    <View style={s.progressRow}>
                      <View style={s.progressBar}>
                        <View style={[s.progressFill, { width: `${Math.min(100, (userXP / item.unlock_xp_required) * 100)}%` as any }]} />
                      </View>
                      <Text style={s.progressPct}>{Math.min(100, Math.round((userXP / item.unlock_xp_required) * 100))}%</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💎</Text>
              <Text style={s.emptyText}>No hidden gems added yet. Keep skating to unlock secrets.</Text>
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
  xpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  xpLabel: { color: '#6B7280', fontSize: 14 },
  xpValue: { color: '#d2673d', fontSize: 16, fontWeight: '900' },
  unlockCount: { color: '#4B5563', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#1a2030' },
  cardLocked: { opacity: 0.6 },
  cardLeft: { alignItems: 'center', justifyContent: 'center', width: 40 },
  gemIcon: { fontSize: 28 },
  cardMain: { flex: 1 },
  gemName: { color: '#F3F4F6', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  gemDesc: { color: '#9CA3AF', fontSize: 13, marginBottom: 6 },
  gemCoords: { color: '#6B7280', fontSize: 11 },
  lockedName: { color: '#4B5563', fontSize: 18, fontWeight: '900', letterSpacing: 4, marginBottom: 4 },
  lockedReq: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#1a2030', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d2673d', borderRadius: 2 },
  progressPct: { color: '#d2673d', fontSize: 11, fontWeight: '700', width: 32 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#4B5563', fontSize: 15, textAlign: 'center' },
});
