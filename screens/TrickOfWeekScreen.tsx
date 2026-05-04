import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export default function TrickOfWeekScreen() {
  const { user } = useAuthStore();
  const [current, setCurrent] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: totw } = await supabase
      .from('trick_of_week')
      .select('*')
      .lte('week_start', today)
      .gte('week_end', today)
      .single();
    setCurrent(totw);

    if (totw) {
      const { data: subs } = await supabase
        .from('trick_of_week_submissions')
        .select('*, profiles(username)')
        .eq('totw_id', totw.id)
        .order('votes', { ascending: false });
      setSubmissions(subs || []);

      if (user) {
        const { data: votes } = await supabase
          .from('trick_of_week_votes')
          .select('submission_id')
          .eq('user_id', user.id);
        setUserVotes(new Set(votes?.map(v => v.submission_id) || []));
      }
    }
  };

  const vote = async (subId: string, currentVotes: number) => {
    if (!user || userVotes.has(subId)) return;
    setUserVotes(prev => new Set([...prev, subId]));
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, votes: s.votes + 1 } : s).sort((a,b) => b.votes - a.votes));
    await supabase.from('trick_of_week_votes').insert({ user_id: user.id, submission_id: subId });
    await supabase.from('trick_of_week_submissions').update({ votes: currentVotes + 1 }).eq('id', subId);
  };

  if (!current) return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.bigIcon}>🛹</Text>
        <Text style={s.noTrick}>No trick of the week set yet.</Text>
        <Text style={s.noTrickSub}>Check back Monday!</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View style={s.badge}><Text style={s.badgeTxt}>THIS WEEK</Text></View>
        <Text style={s.trick}>{current.trick_name}</Text>
        {current.description && <Text style={s.desc}>{current.description}</Text>}
        <Text style={s.ends}>Voting ends: {new Date(current.week_end).toLocaleDateString()}</Text>
      </View>

      <Text style={s.sectionTitle}>Submissions — vote for your favorite</Text>

      <FlatList
        data={submissions}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View style={s.rank}>
              <Text style={s.rankNum}>#{index + 1}</Text>
            </View>
            <View style={s.cardMain}>
              <Text style={s.submitter}>@{item.profiles?.username}</Text>
              <Text style={s.voteCount}>{item.votes} votes</Text>
            </View>
            <TouchableOpacity
              style={[s.voteBtn, userVotes.has(item.id) && s.votedBtn]}
              onPress={() => vote(item.id, item.votes)}
              disabled={userVotes.has(item.id)}
            >
              <Text style={s.voteBtnTxt}>{userVotes.has(item.id) ? '✓ Voted' : 'Vote'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No submissions yet. Be the first to land it!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigIcon: { fontSize: 64, marginBottom: 12 },
  noTrick: { color: '#F3F4F6', fontSize: 18, fontWeight: '700' },
  noTrickSub: { color: '#6B7280', fontSize: 14, marginTop: 4 },
  header: { padding: 20, backgroundColor: 'rgba(210,103,61,0.1)', borderBottomWidth: 1, borderColor: 'rgba(210,103,61,0.2)' },
  badge: { backgroundColor: '#d2673d', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  badgeTxt: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  trick: { fontSize: 32, fontWeight: '900', color: '#F3F4F6', marginBottom: 6 },
  desc: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  ends: { color: '#6B7280', fontSize: 12 },
  sectionTitle: { color: '#6B7280', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, padding: 16, paddingBottom: 4 },
  card: { backgroundColor: '#111827', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(210,103,61,0.2)', alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: '#d2673d', fontWeight: '900', fontSize: 13 },
  cardMain: { flex: 1 },
  submitter: { color: '#F3F4F6', fontWeight: '700', fontSize: 14 },
  voteCount: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  voteBtn: { backgroundColor: '#d2673d', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  votedBtn: { backgroundColor: '#1a2030' },
  voteBtnTxt: { color: 'white', fontWeight: '700', fontSize: 13 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyTxt: { color: '#4B5563', fontSize: 14, textAlign: 'center' },
});
