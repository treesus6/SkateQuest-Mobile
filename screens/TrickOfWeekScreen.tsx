import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Play, Trophy, Upload, Vote } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

type TrickSubmission = {
  id: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  votes: number;
  username: string;
};

export default function TrickOfWeekScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [current, setCurrent] = useState<any>(null);
  const [submissions, setSubmissions] = useState<TrickSubmission[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
      setLoadError('This week’s trick could not be loaded.');
      setLoading(false);
      return;
    }

    setCurrent(totw);
    if (!totw) {
      setSubmissions([]);
      setUserVotes(new Set());
      setLoading(false);
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
      setLoadError('The clip leaderboard could not be loaded.');
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

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingScreen}>
          <View style={s.loadingStamp}><Flame color={INK} size={30} strokeWidth={2.8} /></View>
          <ActivityIndicator color={ORANGE} />
          <Text style={s.loadingText}>LOADING THIS WEEK’S BATTLE</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.emptyHero}>
          <View style={s.emptyOrangeSlash} />
          <View style={s.emptyStamp}><Trophy color={INK} size={30} strokeWidth={2.7} /></View>
          <Text style={s.emptyKicker}>WEEKLY BATTLE</Text>
          <Text style={s.emptyTitle}>NEXT TRICK{`\n`}DROPS SOON.</Text>
          <Text style={s.noTrick}>No trick of the week set yet.</Text>
          <Text style={s.noTrickSub}>Check back Monday!</Text>
          {loadError ? <Text style={s.loadErrorText}>{loadError}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  const leader = submissions[0] ?? null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={submissions}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.heroAcidSlash} />
              <View style={s.heroBlueOrb} />
              <View style={s.heroTopRow}>
                <View style={s.weekBadge}>
                  <Flame color={INK} size={13} strokeWidth={3} />
                  <Text style={s.weekBadgeText}>THIS WEEK</Text>
                </View>
                <Text style={s.ends}>ENDS {new Date(current.week_end).toLocaleDateString()}</Text>
              </View>
              <Text style={s.heroKicker}>LAND IT • FILM IT • WIN THE VOTE</Text>
              <Text style={s.trick}>{String(current.trick_name).toUpperCase()}</Text>
              {current.description ? <Text style={s.desc}>{current.description}</Text> : null}

              <Pressable
                style={s.submitMainBtn}
                onPress={() =>
                  navigation.navigate('UploadMedia', {
                    initialTrickName: current.trick_name,
                    totwId: current.id,
                  })
                }
              >
                <View style={s.submitIcon}>
                  <Upload color={INK} size={20} strokeWidth={3} />
                </View>
                <View style={s.submitCopy}>
                  <Text style={s.submitMainBtnTxt}>Submit Your Clip</Text>
                  <Text style={s.submitSub}>DROP YOUR PROOF INTO THE BATTLE</Text>
                </View>
                <Text style={s.submitArrow}>↗</Text>
              </Pressable>
            </View>

            <View style={s.battleStrip}>
              <View>
                <Text style={s.battleStripKicker}>LIVE LEADERBOARD</Text>
                <Text style={s.battleStripTitle}>{submissions.length} CLIP{submissions.length === 1 ? '' : 'S'} IN</Text>
              </View>
              <View style={s.leaderMini}>
                <Trophy color={INK} size={15} strokeWidth={2.8} />
                <Text style={s.leaderMiniText}>
                  {leader ? `@${leader.username} • ${leader.votes}` : 'NO LEADER YET'}
                </Text>
              </View>
            </View>

            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Submissions — vote for your favorite</Text>
              <Text style={s.sectionMeta}>ONE VOTE PER CLIP</Text>
            </View>

            {loadError ? (
              <View style={s.warningCard}>
                <Text style={s.warningTitle}>LEADERBOARD ISSUE</Text>
                <Text style={s.warningText}>{loadError}</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => {
          const voted = userVotes.has(item.id);
          const isLeader = index === 0;
          return (
            <View style={[s.card, isLeader && s.leaderCard, index % 2 === 1 && s.cardTilt]}>
              <View style={s.mediaFrame}>
                {item.thumbnail_url ? (
                  <Image source={{ uri: item.thumbnail_url }} style={s.thumbnail} resizeMode="cover" />
                ) : (
                  <View style={s.thumbnailFallback}>
                    <Play color={PAPER} size={28} fill={PAPER} />
                    <Text style={s.thumbnailFallbackText}>{item.video_url ? 'CLIP READY' : 'NO PREVIEW'}</Text>
                  </View>
                )}
                <View style={[s.rankBadge, isLeader && s.rankBadgeLeader]}>
                  <Text style={s.rankNum}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                {isLeader ? (
                  <View style={s.leaderFlag}>
                    <Trophy color={INK} size={11} strokeWidth={3} />
                    <Text style={s.leaderFlagText}>LEADER</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.cardFooter}>
                <View style={s.cardMain}>
                  <Text style={s.submitter}>@{item.username}</Text>
                  <View style={s.voteStatRow}>
                    <Vote color={ORANGE} size={13} strokeWidth={2.7} />
                    <Text style={s.voteCount}>{item.votes} VOTE{item.votes === 1 ? '' : 'S'}</Text>
                  </View>
                </View>
                <Pressable
                  style={[s.voteBtn, voted && s.votedBtn, !user && s.disabledVoteBtn]}
                  onPress={() => void vote(item.id)}
                  disabled={!user || voted}
                >
                  <Text style={[s.voteBtnTxt, voted && s.votedBtnTxt]}>
                    {!user ? 'SIGN IN' : voted ? '✓ VOTED' : 'VOTE'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.noSubmissionsCard}>
            <View style={s.noSubStamp}><Play color={INK} size={24} fill={INK} /></View>
            <Text style={s.noSubTitle}>FIRST CLIP OWNS THE BOARD</Text>
            <Text style={s.emptyTxt}>No submissions yet. Be the first to land it!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },

  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 13 },
  loadingStamp: { width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  emptyHero: { flex: 1, justifyContent: 'center', padding: 24, overflow: 'hidden' },
  emptyOrangeSlash: { position: 'absolute', width: 340, height: 105, right: -120, top: '30%', backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  emptyStamp: { width: 68, height: 68, borderRadius: 20, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  emptyKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 25 },
  emptyTitle: { color: PAPER, fontSize: 48, lineHeight: 44, fontWeight: '900', letterSpacing: -2.7, marginTop: 4 },
  noTrick: { color: PAPER, fontSize: 15, fontWeight: '800', marginTop: 22 },
  noTrickSub: { color: '#858D99', fontSize: 12, marginTop: 4 },
  loadErrorText: { color: '#D9A390', fontSize: 11, lineHeight: 16, marginTop: 14, maxWidth: 280 },

  hero: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, backgroundColor: ORANGE, overflow: 'hidden', position: 'relative' },
  heroAcidSlash: { position: 'absolute', width: 270, height: 35, right: -75, bottom: 52, backgroundColor: ACID, transform: [{ rotate: '-12deg' }] },
  heroBlueOrb: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: 12, top: 50, backgroundColor: BLUE, opacity: 0.18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACID, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 6 },
  weekBadgeText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  ends: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroKicker: { color: '#3B241B', fontSize: 8, fontWeight: '900', letterSpacing: 1.35, marginTop: 27 },
  trick: { color: INK, fontSize: 49, lineHeight: 46, fontWeight: '900', letterSpacing: -2.8, marginTop: 3, maxWidth: 330 },
  desc: { color: '#412A22', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 7, maxWidth: 295 },
  submitMainBtn: { minHeight: 72, backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, marginTop: 21, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 4, transform: [{ rotate: '-0.7deg' }] },
  submitIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center' },
  submitCopy: { flex: 1 },
  submitMainBtnTxt: { color: INK, fontWeight: '900', fontSize: 15, letterSpacing: -0.3 },
  submitSub: { color: '#73736D', fontWeight: '900', fontSize: 7, letterSpacing: 0.9, marginTop: 2 },
  submitArrow: { color: INK, fontSize: 24, fontWeight: '900' },

  battleStrip: { minHeight: 84, backgroundColor: ACID, borderBottomWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16 },
  battleStripKicker: { color: '#626A22', fontSize: 7, fontWeight: '900', letterSpacing: 1.15 },
  battleStripTitle: { color: INK, fontSize: 23, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  leaderMini: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 9, paddingVertical: 7 },
  leaderMiniText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },

  sectionRow: { paddingHorizontal: 16, paddingTop: 23, paddingBottom: 10 },
  sectionTitle: { color: PAPER, fontSize: 14, fontWeight: '900' },
  sectionMeta: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1.1, marginTop: 4 },
  warningCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#20110E', borderRadius: 16, borderWidth: 1, borderColor: '#63362A', padding: 13 },
  warningTitle: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  warningText: { color: '#C6A99F', fontSize: 10, lineHeight: 15, marginTop: 3 },

  card: { marginHorizontal: 14, marginBottom: 14, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  leaderCard: { borderColor: ACID, borderWidth: 3 },
  cardTilt: { transform: [{ rotate: '0.45deg' }] },
  mediaFrame: { height: 185, backgroundColor: '#181B21', position: 'relative', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#181B21' },
  thumbnailFallbackText: { color: '#858D99', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  rankBadge: { position: 'absolute', left: 11, top: 11, minWidth: 43, height: 39, borderRadius: 12, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  rankBadgeLeader: { backgroundColor: ACID },
  rankNum: { color: INK, fontWeight: '900', fontSize: 12 },
  leaderFlag: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 8, paddingVertical: 5 },
  leaderFlagText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  cardFooter: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 11 },
  cardMain: { flex: 1 },
  submitter: { color: INK, fontWeight: '900', fontSize: 15 },
  voteStatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  voteCount: { color: '#777A75', fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  voteBtn: { minWidth: 82, minHeight: 43, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  votedBtn: { backgroundColor: ACID },
  disabledVoteBtn: { backgroundColor: '#D0CBC2' },
  voteBtnTxt: { color: INK, fontWeight: '900', fontSize: 9, letterSpacing: 0.7 },
  votedBtnTxt: { color: INK },

  noSubmissionsCard: { marginHorizontal: 14, marginTop: 8, minHeight: 180, backgroundColor: '#13161C', borderRadius: 22, borderWidth: 1.5, borderColor: '#30343D', alignItems: 'center', justifyContent: 'center', padding: 22 },
  noSubStamp: { width: 54, height: 54, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  noSubTitle: { color: PAPER, fontSize: 12, fontWeight: '900', letterSpacing: 0.9, marginTop: 13 },
  emptyTxt: { color: '#7D8591', fontSize: 11, textAlign: 'center', marginTop: 5 },
});
