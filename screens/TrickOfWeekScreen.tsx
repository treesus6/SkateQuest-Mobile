import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

export default function TrickOfWeekScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [current, setCurrent] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: totw, error: totwError } = await supabase
      .from('trick_of_week')
      .select('*')
      .lte('week_start', today)
      .gte('week_end', today)
      .maybeSingle();

    if (totwError) {
      console.error('Trick of the Week load failed:', totwError);
      setCurrent(null);
      setSubmissions([]);
      return;
    }

    setCurrent(totw);
    if (!totw) {
      setSubmissions([]);
      setUserVotes(new Set());
      return;
    }

    const { data: subs, error: subsError } = await supabase
      .from('trick_of_week_submissions')
      .select('id, user_id, video_url, thumbnail_url, votes, created_at, profile:profiles!trick_of_week_submissions_user_id_fkey(username)')
      .eq('totw_id', totw.id)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true });

    if (subsError) {
      console.error('Trick of the Week submissions failed:', subsError);
      setSubmissions([]);
    } else {
      setSubmissions(
        (subs || []).map((submission: any) => ({
          id: submission.id,
          video_url: submission.video_url,
          thumbnail_url: submission.thumbnail_url,
          votes: submission.votes ?? 0,
          username: submission.profile?.username || 'Skater',
        }))
      );
    }

    if (user) {
      const { data: votes, error: votesError } = await supabase
        .from('trick_of_week_votes')
        .select('submission_id')
        .eq('user_id', user.id);

      if (votesError) {
        console.error('Trick of the Week votes failed:', votesError);
        setUserVotes(new Set());
      } else {
        setUserVotes(new Set(votes?.map(vote => vote.submission_id).filter(Boolean) || []));
      }
    } else {
      setUserVotes(new Set());
    }
  };

  const vote = async (subId: string) => {
    if (!user || userVotes.has(subId)) return;

    const previousVotes = new Set(userVotes);
    const previousSubmissions = submissions;

    setUserVotes(prev => new Set([...prev, subId]));
    setSubmissions(prev =>
      prev
        .map(submission =>
          submission.id === subId
            ? { ...submission, votes: (submission.votes ?? 0) + 1 }
            : submission
        )
        .sort((a, b) => b.votes - a.votes)
    );

    const { data, error } = await supabase.rpc('vote_trick_of_week', {
      p_submission_id: subId,
    });

    if (error) {
      setUserVotes(previousVotes);
      setSubmissions(previousSubmissions);
      Alert.alert('Vote failed', error.message || 'Please try again.');
      return;
    }

    const voteCount = Number((data as { votes?: number } | null)?.votes ?? 0);
    setSubmissions(prev =>
      prev
        .map(submission =>
          submission.id === subId ? { ...submission, votes: voteCount } : submission
        )
        .sort((a, b) => b.votes - a.votes)
    );
  };

  if (!current)
    return (
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
        <View style={s.badge}>
          <Text style={s.badgeTxt}>THIS WEEK</Text>
        </View>
        <Text style={s.trick}>{current.trick_name}</Text>
        {current.description && <Text style={s.desc}>{current.description}</Text>}
        <Text style={s.ends}>Voting ends: {new Date(current.week_end).toLocaleDateString()}</Text>

        <TouchableOpacity
          style={s.submitMainBtn}
          onPress={() =>
            navigation.navigate('UploadMedia', {
              initialTrickName: current.trick_name,
              totwId: current.id,
            })
          }
        >
          <Text style={s.submitMainBtnTxt}>Submit Your Clip</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Submissions — vote for your favorite</Text>

      <FlatList
        data={submissions}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <View style={s.rank}>
              <Text style={s.rankNum}>#{index + 1}</Text>
            </View>
            <View style={s.cardMain}>
              <Text style={s.submitter}>@{item.username}</Text>
              <Text style={s.voteCount}>{item.votes} votes</Text>
            </View>
            <TouchableOpacity
              style={[s.voteBtn, userVotes.has(item.id) && s.votedBtn]}
              onPress={() => void vote(item.id)}
              disabled={!user || userVotes.has(item.id)}
            >
              <Text style={s.voteBtnTxt}>
                {!user ? 'Sign in' : userVotes.has(item.id) ? '✓ Voted' : 'Vote'}
              </Text>
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
  header: {
    padding: 20,
    backgroundColor: 'rgba(210,103,61,0.1)',
    borderBottomWidth: 1,
    borderColor: 'rgba(210,103,61,0.2)',
  },
  badge: {
    backgroundColor: '#d2673d',
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeTxt: { color: 'white', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  trick: { fontSize: 32, fontWeight: '900', color: '#F3F4F6', marginBottom: 6 },
  desc: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  ends: { color: '#6B7280', fontSize: 12 },
  sectionTitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    padding: 16,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(210,103,61,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { color: '#d2673d', fontWeight: '900', fontSize: 13 },
  cardMain: { flex: 1 },
  submitter: { color: '#F3F4F6', fontWeight: '700', fontSize: 14 },
  voteCount: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  voteBtn: {
    backgroundColor: '#d2673d',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  votedBtn: { backgroundColor: '#1a2030' },
  voteBtnTxt: { color: 'white', fontWeight: '700', fontSize: 13 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyTxt: { color: '#4B5563', fontSize: 14, textAlign: 'center' },
  submitMainBtn: {
    backgroundColor: '#FF5A3C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#FF5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitMainBtnTxt: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
