import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { challengesService } from '../lib/challengesService';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const { width, height } = Dimensions.get('window');

type SubmissionSource = 'challenge' | 'bounty' | 'spot_claim' | 'bingo';

interface Submission {
  id: string;
  source: SubmissionSource;
  user_id: string;
  video_url: string;
  username: string;
  title: string;
  subtitle?: string;
  submitted_at: string;
  stomped_votes: number;
  bail_votes: number;
}

interface JudgeResult {
  success?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  xp_earned?: number;
  judge_xp?: number;
  bonus_xp?: number;
}

function sourceLabel(source: SubmissionSource) {
  if (source === 'bounty') return 'BOUNTY PROOF';
  if (source === 'spot_claim') return 'KING OF THE HILL';
  if (source === 'bingo') return 'TRICK BINGO';
  return 'CHALLENGE PROOF';
}

export default function JudgesBoothScreen() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [votesThisSession, setVotesThisSession] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  useEffect(() => {
    void fetchPendingSubmissions();
  }, [user?.id]);

  const fetchPendingSubmissions = async () => {
    if (!user?.id) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [challengeResponse, bountyResponse, spotClaimResponse, bingoResponse] = await Promise.all([
        supabase
          .from('challenge_submissions')
          .select(
            `id,user_id,video_url,submitted_at,stomped_votes,bail_votes,profiles!challenge_submissions_user_id_fkey(username),challenges!challenge_submissions_challenge_id_fkey(description)`
          )
          .eq('status', 'PENDING')
          .neq('user_id', user.id)
          .order('submitted_at', { ascending: true })
          .limit(50),
        supabase
          .from('bounty_submissions')
          .select(
            `id,user_id,video_url,trick_name,submitted_at,stomped_votes,bail_votes,profiles!bounty_submissions_user_id_fkey(username),bounties!bounty_submissions_bounty_id_fkey(park_name,xp_reward)`
          )
          .eq('status', 'PENDING')
          .neq('user_id', user.id)
          .order('submitted_at', { ascending: true })
          .limit(50),
        supabase
          .from('spot_claim_submissions')
          .select(
            `id,user_id,video_url,trick_description,submitted_at,stomped_votes,bail_votes,profiles!spot_claim_submissions_user_id_fkey(username),skate_spots!spot_claim_submissions_spot_id_fkey(name)`
          )
          .eq('status', 'PENDING')
          .neq('user_id', user.id)
          .order('submitted_at', { ascending: true })
          .limit(50),
        supabase
          .from('bingo_cell_submissions')
          .select(
            `id,user_id,video_url,trick_name,cell_index,submitted_at,stomped_votes,bail_votes,profiles!bingo_cell_submissions_user_id_fkey(username)`
          )
          .eq('status', 'PENDING')
          .neq('user_id', user.id)
          .order('submitted_at', { ascending: true })
          .limit(50),
      ]);

      if (challengeResponse.error) throw challengeResponse.error;
      if (bountyResponse.error) throw bountyResponse.error;
      if (spotClaimResponse.error) throw spotClaimResponse.error;
      if (bingoResponse.error) throw bingoResponse.error;

      const challengeRows = challengeResponse.data ?? [];
      const bountyRows = bountyResponse.data ?? [];
      const spotClaimRows = spotClaimResponse.data ?? [];
      const bingoRows = bingoResponse.data ?? [];
      const challengeIds = challengeRows.map((row: any) => row.id);
      const bountyIds = bountyRows.map((row: any) => row.id);
      const spotClaimIds = spotClaimRows.map((row: any) => row.id);
      const bingoIds = bingoRows.map((row: any) => row.id);

      const [challengeVotesResponse, bountyVotesResponse, spotClaimVotesResponse, bingoVotesResponse] = await Promise.all([
        challengeIds.length
          ? supabase
              .from('submission_votes')
              .select('submission_id')
              .eq('user_id', user.id)
              .in('submission_id', challengeIds)
          : Promise.resolve({ data: [], error: null }),
        bountyIds.length
          ? supabase
              .from('bounty_submission_votes')
              .select('submission_id')
              .eq('user_id', user.id)
              .in('submission_id', bountyIds)
          : Promise.resolve({ data: [], error: null }),
        spotClaimIds.length
          ? supabase
              .from('spot_claim_submission_votes')
              .select('submission_id')
              .eq('user_id', user.id)
              .in('submission_id', spotClaimIds)
          : Promise.resolve({ data: [], error: null }),
        bingoIds.length
          ? supabase
              .from('bingo_cell_submission_votes')
              .select('submission_id')
              .eq('user_id', user.id)
              .in('submission_id', bingoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (challengeVotesResponse.error) throw challengeVotesResponse.error;
      if (bountyVotesResponse.error) throw bountyVotesResponse.error;
      if (spotClaimVotesResponse.error) throw spotClaimVotesResponse.error;
      if (bingoVotesResponse.error) throw bingoVotesResponse.error;

      const judgedChallenges = new Set((challengeVotesResponse.data ?? []).map((vote: any) => vote.submission_id));
      const judgedBounties = new Set((bountyVotesResponse.data ?? []).map((vote: any) => vote.submission_id));
      const judgedSpotClaims = new Set((spotClaimVotesResponse.data ?? []).map((vote: any) => vote.submission_id));
      const judgedBingo = new Set((bingoVotesResponse.data ?? []).map((vote: any) => vote.submission_id));

      const challengeQueue: Submission[] = challengeRows
        .filter((row: any) => !judgedChallenges.has(row.id))
        .map((row: any) => ({
          id: row.id,
          source: 'challenge',
          user_id: row.user_id,
          video_url: row.video_url,
          username: row.profiles?.username || 'Unknown',
          title: row.challenges?.description || 'Skate challenge submission',
          subtitle: 'Challenge proof',
          submitted_at: row.submitted_at,
          stomped_votes: row.stomped_votes ?? 0,
          bail_votes: row.bail_votes ?? 0,
        }));

      const bountyQueue: Submission[] = bountyRows
        .filter((row: any) => !judgedBounties.has(row.id))
        .map((row: any) => ({
          id: row.id,
          source: 'bounty',
          user_id: row.user_id,
          video_url: row.video_url,
          username: row.profiles?.username || 'Unknown',
          title: row.trick_name,
          subtitle: `Bounty proof${row.bounties?.park_name ? ` · ${row.bounties.park_name}` : ''}${row.bounties?.xp_reward ? ` · ${row.bounties.xp_reward} XP` : ''}`,
          submitted_at: row.submitted_at,
          stomped_votes: row.stomped_votes ?? 0,
          bail_votes: row.bail_votes ?? 0,
        }));

      const spotClaimQueue: Submission[] = spotClaimRows
        .filter((row: any) => !judgedSpotClaims.has(row.id))
        .map((row: any) => ({
          id: row.id,
          source: 'spot_claim',
          user_id: row.user_id,
          video_url: row.video_url,
          username: row.profiles?.username || 'Unknown',
          title: row.trick_description,
          subtitle: `King of the Hill${row.skate_spots?.name ? ` · ${row.skate_spots.name}` : ''}`,
          submitted_at: row.submitted_at,
          stomped_votes: row.stomped_votes ?? 0,
          bail_votes: row.bail_votes ?? 0,
        }));

      const bingoQueue: Submission[] = bingoRows
        .filter((row: any) => !judgedBingo.has(row.id))
        .map((row: any) => ({
          id: row.id,
          source: 'bingo',
          user_id: row.user_id,
          video_url: row.video_url,
          username: row.profiles?.username || 'Unknown',
          title: row.trick_name,
          subtitle: `Trick Bingo square ${Number(row.cell_index) + 1}`,
          submitted_at: row.submitted_at,
          stomped_votes: row.stomped_votes ?? 0,
          bail_votes: row.bail_votes ?? 0,
        }));

      setSubmissions(
        [...challengeQueue, ...bountyQueue, ...spotClaimQueue, ...bingoQueue]
          .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
          .slice(0, 20)
      );
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Could not load judging queue', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeCurrentSubmission = (submissionId: string) => {
    setSubmissions(current => current.filter(item => item.id !== submissionId));
  };

  const handleVote = async (vote: 'stomped' | 'bail') => {
    if (voting || !user?.id || submissions.length === 0) return;

    const submission = submissions[0];
    setVoting(true);
    try {
      const response =
        submission.source === 'bounty'
          ? await supabase.rpc('judge_bounty_submission', {
              p_submission_id: submission.id,
              p_vote: vote,
            })
          : submission.source === 'spot_claim'
            ? await supabase.rpc('judge_spot_claim_submission', {
                p_submission_id: submission.id,
                p_vote: vote,
              })
            : submission.source === 'bingo'
              ? await supabase.rpc('judge_bingo_cell_submission', {
                  p_submission_id: submission.id,
                  p_vote: vote,
                })
              : await challengesService.vote(submission.id, user.id, vote);

      if (response.error) throw response.error;

      const result = (response.data ?? {}) as JudgeResult;
      const earned = Number(result.judge_xp ?? result.xp_earned ?? 10);
      const bonus = Number(result.bonus_xp ?? 0);
      const nextVotes = votesThisSession + 1;
      const nextXp = xpEarned + earned + bonus;

      setVotesThisSession(nextVotes);
      setXpEarned(nextXp);
      removeCurrentSubmission(submission.id);

      if (bonus > 0) {
        Alert.alert('Judging Bonus!', `+${bonus} bonus XP earned.`);
      }

      if (submissions.length === 1) {
        Alert.alert(
          'All Caught Up!',
          `You reviewed everything currently available.\n\nXP earned this session: ${nextXp}`,
          [{ text: 'Nice', onPress: () => void fetchPendingSubmissions() }]
        );
      }
    } catch (error: any) {
      const message = String(error?.message ?? error ?? '').toLowerCase();
      if (message.includes('already voted')) {
        Alert.alert('Already Voted', "You've already judged this clip.");
        removeCurrentSubmission(submission.id);
      } else if (message.includes('own submission')) {
        Alert.alert('Cannot Vote', "You can't judge your own clip.");
        removeCurrentSubmission(submission.id);
      } else if (message.includes('no longer pending')) {
        removeCurrentSubmission(submission.id);
      } else {
        Alert.alert('Error', 'Failed to submit vote. Please try again.');
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <LoadingSkeleton height={400} className="mx-4" />
      </View>
    );
  }

  if (submissions.length === 0) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center px-6">
        <Text className="text-lg font-bold text-white mb-2">No clips to judge!</Text>
        <Text className="text-sm text-gray-500 text-center">
          You're caught up. New challenge, bounty, King of the Hill, and Trick Bingo proof clips will show here when skaters submit them.
        </Text>
      </View>
    );
  }

  const currentSubmission = submissions[0];

  return (
    <View className="flex-1 bg-black">
      <Video
        source={{ uri: currentSubmission.video_url }}
        style={{ width, height }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        useNativeControls={false}
      />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'space-between',
          paddingTop: 60,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text
              className="text-2xl font-bold text-white"
              style={{
                textShadowColor: 'rgba(0,0,0,0.75)',
                textShadowOffset: { width: -1, height: 1 },
                textShadowRadius: 10,
              }}
            >
              Judge's Booth
            </Text>
            <Text className="text-xs font-bold text-brand-terracotta mt-1">
              {sourceLabel(currentSubmission.source)}
            </Text>
          </View>
          <Text className="text-base text-white font-semibold">{submissions.length} left</Text>
        </View>

        <View className="bg-black/60 p-4 rounded-xl">
          <Text className="text-lg font-bold text-brand-terracotta mb-2">
            @{currentSubmission.username}
          </Text>
          <Text className="text-base text-white font-semibold mb-1">{currentSubmission.title}</Text>
          {currentSubmission.subtitle ? (
            <Text className="text-sm text-gray-300 mb-3">{currentSubmission.subtitle}</Text>
          ) : null}
          <View className="flex-row gap-5">
            <View className="flex-row items-center gap-1">
              <ThumbsUp color="#4ade80" size={16} />
              <Text className="text-sm text-white font-semibold">{currentSubmission.stomped_votes}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <ThumbsDown color="#ef4444" size={16} />
              <Text className="text-sm text-white font-semibold">{currentSubmission.bail_votes}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row justify-around gap-4">
          <TouchableOpacity
            className="flex-1 bg-red-500 py-5 rounded-xl items-center justify-center"
            onPress={() => handleVote('bail')}
            disabled={voting}
          >
            <Text className="text-xl font-bold text-white">BAIL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-emerald-500 py-5 rounded-xl items-center justify-center"
            onPress={() => handleVote('stomped')}
            disabled={voting}
          >
            <Text className="text-xl font-bold text-white">STOMPED</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-black/70 py-2 px-4 rounded-full self-center">
          <Text className="text-sm font-bold text-green-400">
            Votes this session: {votesThisSession} | XP: +{xpEarned}
          </Text>
        </View>
      </View>

      {voting ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
