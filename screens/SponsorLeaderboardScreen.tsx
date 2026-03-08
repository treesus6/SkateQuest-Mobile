import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Trophy, Heart, Award, Star } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface Donor {
  user_id: string;
  username: string;
  total_xp: number;
  boards_funded: number;
}

interface Totals {
  total_boards: number;
  total_xp: number;
  total_usd: number;
}

const MILESTONE = 100; // boards milestone goal

const rankBadgeColor = (rank: number) => {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#333';
};

export default function SponsorLeaderboardScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<'monthly' | 'alltime'>('monthly');
  const [donors, setDonors] = useState<Donor[]>([]);
  const [totals, setTotals] = useState<Totals>({ total_boards: 0, total_xp: 0, total_usd: 0 });
  const [loading, setLoading] = useState(true);
  const realtimeSub = useRef<any>(null);

  useEffect(() => {
    fetchData();
    // Realtime subscription on xp_donations
    realtimeSub.current = supabase
      .channel('sponsor_lb')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'xp_donations' }, () => fetchData())
      .subscribe();
    return () => { realtimeSub.current?.unsubscribe(); };
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const query = supabase
        .from('xp_donations')
        .select('user_id, xp_amount, usd_value, profiles:user_id(username)');

      const { data } = tab === 'monthly'
        ? await query.gte('created_at', monthStart)
        : await query;

      if (data) {
        // Aggregate by user
        const map: Record<string, Donor> = {};
        for (const row of data as any[]) {
          const uid = row.user_id;
          if (!map[uid]) {
            map[uid] = { user_id: uid, username: row.profiles?.username || 'Skater', total_xp: 0, boards_funded: 0 };
          }
          map[uid].total_xp += row.xp_amount;
          map[uid].boards_funded += Math.floor(row.usd_value ?? 0);
        }
        const sorted = Object.values(map).sort((a, b) => b.total_xp - a.total_xp);
        setDonors(sorted);

        const totalBoards = sorted.reduce((s, d) => s + d.boards_funded, 0);
        const totalXp = sorted.reduce((s, d) => s + d.total_xp, 0);
        setTotals({ total_boards: totalBoards, total_xp: totalXp, total_usd: Math.floor(totalXp / 1000) });
      }
    } catch (_) {}
    setLoading(false);
  };

  const progressPct = Math.min((totals.total_boards / MILESTONE) * 100, 100);
  const boardsLeft = Math.max(MILESTONE - totals.total_boards, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <ChevronLeft color="#666" size={24} />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', flex: 1 }}>Sponsor a Kid</Text>
        <Heart color="#e74c3c" size={22} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero counter */}
        <View style={{ backgroundColor: '#111', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' }}>
          <Text style={{ color: '#FFD700', fontSize: 56, fontWeight: '900' }}>{totals.total_boards}</Text>
          <Text style={{ color: '#888', fontSize: 13, letterSpacing: 2, marginTop: -4 }}>BOARDS DONATED</Text>
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#FF6B35', fontSize: 20, fontWeight: '800' }}>{totals.total_xp.toLocaleString()}</Text>
              <Text style={{ color: '#555', fontSize: 10, letterSpacing: 1 }}>XP DONATED</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#222' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#4CAF50', fontSize: 20, fontWeight: '800' }}>${totals.total_usd}</Text>
              <Text style={{ color: '#555', fontSize: 10, letterSpacing: 1 }}>USD VALUE</Text>
            </View>
          </View>
        </View>

        {/* Milestone progress bar */}
        <View style={{ margin: 16, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Next Milestone</Text>
            <Text style={{ color: '#FFD700', fontWeight: '800' }}>{MILESTONE} boards</Text>
          </View>
          <View style={{ height: 10, backgroundColor: '#2a2a2a', borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#4CAF50', borderRadius: 5 }} />
          </View>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 6 }}>
            {boardsLeft > 0 ? `${boardsLeft} more boards until we hit ${MILESTONE}!` : `🎉 Milestone reached!`}
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 10, padding: 4 }}>
          {(['monthly', 'alltime'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: tab === t ? '#FF6B35' : 'transparent', alignItems: 'center' }}
            >
              <Text style={{ color: tab === t ? '#fff' : '#666', fontWeight: '700', fontSize: 13 }}>
                {t === 'monthly' ? 'This Month' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: '#444', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>TOP DONORS</Text>
          {loading ? (
            <ActivityIndicator color="#FF6B35" style={{ marginTop: 20 }} />
          ) : donors.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 30 }}>
              <Heart color="#333" size={36} />
              <Text style={{ color: '#444', marginTop: 10 }}>No donations yet this period</Text>
              <Text style={{ color: '#333', fontSize: 12, marginTop: 4 }}>Be the first to donate your XP!</Text>
            </View>
          ) : (
            donors.map((donor, i) => (
              <View key={donor.user_id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: i < 3 ? rankBadgeColor(i + 1) + '33' : '#2a2a2a' }}>
                {/* Rank badge */}
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: rankBadgeColor(i + 1), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  {i < 3 ? <Trophy color="#000" size={18} /> : <Text style={{ color: '#fff', fontWeight: '800' }}>#{i + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{donor.username}</Text>
                  <Text style={{ color: '#666', fontSize: 12 }}>{donor.total_xp.toLocaleString()} XP donated</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#4CAF50', fontWeight: '800', fontSize: 16 }}>{donor.boards_funded}</Text>
                  <Text style={{ color: '#555', fontSize: 10 }}>boards</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('DonateXP')}
          style={{ margin: 16, backgroundColor: '#e74c3c', borderRadius: 14, padding: 16, alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Heart color="#fff" size={18} />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Donate Your XP</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>
            1000 XP = $1 toward a skateboard for a kid
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
