import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { challengesService } from '../lib/challengesService';
import { useAuthStore } from '../stores/useAuthStore';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Submission {
  id: string;
  challenge_id: string | null;
  user_id: string;
  video_url: string;
  username?: string;
  challenge_description?: string;
  stomped_votes: number;
  bail_votes: number;
}

interface JudgeResult {
  success?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  stomped_votes?: number;
  bail_votes?: number;
  xp_earned?: number;
  bonus_xp?: number;
  judge_vote_count?: number;
}

export default function JudgesBoothScreen() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(
          `*, profiles!challenge_submissions_user_id_fkey(username), challenges!challenge_submissions_challenge_id_fkey(description)`
        )
        .eq('status', 'PENDING')
        .neq('user_id', user.id)
        .order('submitted_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const pending = data ?? [];
      const ids = pending.map((item: any) => item.id);
      let votedIds = new Set<string>();

      if (ids.length) {
        const { data: votes, error: votesError } = await supabase
          .from('submission_votes')
          .select('submission_id')
          .eq('user_id', user.id)
          .in('submission_id', ids);
        if (votesError) throw votesError;
        votedIds = new Set((votes ?? []).map((vote: any) => vote.submission_id));
      }

      const formatted: Submission[] = pending
        .filter((item: any) => !votedIds.has(item.id))
        .slice(0, 20)
        .map((item: any) => ({
          id: item.id,
          challenge_id: item.challenge_id,
          user_id: item.user_id,
          video_url: item.video_url,
          username: item.profiles?.username || 'Unknown',
          challenge_description: item.challenges?.description || 'Skate challenge submission',
          stomped_votes: item.stomped_votes ?? 0,
          bail_votes: item.bail_votes ?? 0,
        }));

      setCurrentIndex(0);
      setSubmissions(formatted);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Alert.alert('Could not load judging queue', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote: 'stomped' | 'bail') => {
    if (voting || !user?.id || submissions.length === 0) return;

    const submission = submissions[currentIndex];
    setVoting(true);
    try {
      const { data, error: voteError } = await challengesService.vote(submission.id, user.id, vote);
      if (voteError) throw voteError;

      const result = (data ?? {}) as JudgeResult;
      const earned = result.xp_earned ?? 10;
      const bonus = result.bonus_xp ?? 0;

      const newVoteCount = votesThisSession + 1;
      const newXpEarned = xpEarned + earned;
      setVotesThisSession(newVoteCount);
      setXpEarned(newXpEarned);

      if (bonus > 0) {
        Alert.alert('Bonus!', `+${bonus} XP bonus for your 5th judging vote!`);
      }

      setSubmissions(current => current.filter(item => item.id !== submission.id));
      setCurrentIndex(0);

      if (submissions.length === 1) {
        Alert.alert(
          'All Done!',
          `You've reviewed everything currently available.\n\nXP earned this session: ${newXpEarned}`,
          [{ text: 'Awesome!', onPress: () => void fetchPendingSubmissions() }]
        );
      }
    } catch (error: any) {
      const message = String(error?.message ?? error ?? '');
      if (message.toLowerCase().includes('already voted')) {
        Alert.alert('Already Voted', "You've already judged this submission.");
        setSubmissions(current => current.filter(item => item.id !== submission.id));
        setCurrentIndex(0);
      } else if (message.toLowerCase().includes('own submission')) {
        Alert.alert('Cannot Vote', "You can't vote on your own submission.");
        setSubmissions(current => current.filter(item => item.id !== submission.id));
        setCurrentIndex(0);
      } else if (message.toLowerCase().includes('no longer pending')) {
        setSubmissions(current => current.filter(item => item.id !== submission.id));
        setCurrentIndex(0);
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
        <Text className="text-lg font-bold text-white mb-2">No submissions to review!</Text>
        <Text className="text-sm text-gray-500 text-center">
          You're caught up. New real clip submissions will appear here when they're ready for judging.
        </Text>
      </View>
    );
  }

  const currentSubmission = submissions[Math.min(currentIndex, submissions.length - 1)];

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
          <Text className="text-base text-white font-semibold">
            {currentIndex + 1} / {submissions.length}
          </Text>
        </View>

        <View className="bg-black/60 p-4 rounded-xl">
          <Text className="text-lg font-bold text-brand-terracotta mb-2">
            @{currentSubmission.username}
          </Text>
          <Text className="text-base text-white font-semibold mb-3">
            {currentSubmission.challenge_description}
          </Text>
          <View className="flex-row gap-5">
            <View className="flex-row items-center gap-1">
              <ThumbsUp color="#4ade80" size={16} />
              <Text className="text-sm text-white font-semibold">
                {currentSubmission.stomped_votes}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <ThumbsDown color="#ef4444" size={16} />
              <Text className="text-sm text-white font-semibold">
                {currentSubmission.bail_votes}
              </Text>
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
            Votes: {votesThisSession} | XP: +{xpEarned}
          </Text>
        </View>
      </View>

      {voting && (
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
      )}
    </View>
  );
}
