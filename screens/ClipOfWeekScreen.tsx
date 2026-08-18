import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { ChevronUp, Play, Upload, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

interface ClipSubmission {
  id: string;
  user_id: string;
  week_number: number;
  year: number;
  votes: number;
  created_at: string;
  trick_name: string;
  video_url: string | null;
  username: string;
  has_voted: boolean;
}

function getCurrentWeekAndYear(): { week: number; year: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return { week, year: now.getFullYear() };
}

function getWeekDateRange(week: number, year: number): string {
  const startOfYear = new Date(year, 0, 1);
  const dayOffset = (week - 1) * 7 - startOfYear.getDay() + 1;
  const start = new Date(year, 0, dayOffset);
  const end = new Date(year, 0, dayOffset + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

function UpvoteButton({
  votes,
  hasVoted,
  onPress,
  loading,
  size = 'md',
}: {
  votes: number;
  hasVoted: boolean;
  onPress: () => void;
  loading: boolean;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'sm' ? 16 : 22;
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      className={`flex-row items-center gap-1 px-3 py-2 rounded-full border ${
        hasVoted ? 'bg-orange-500 border-orange-500' : 'bg-transparent border-neutral-600'
      }`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={hasVoted ? '#fff' : '#FF6B35'} />
      ) : (
        <ChevronUp size={iconSize} color={hasVoted ? '#fff' : '#FF6B35'} strokeWidth={2.5} />
      )}
      <Text className={`font-bold ${textSize} ${hasVoted ? 'text-white' : 'text-orange-500'}`}>
        {votes}
      </Text>
    </TouchableOpacity>
  );
}

function VideoThumbnail({ uri }: { uri: string | null }) {
  if (!uri) {
    return (
      <View className="w-full aspect-video bg-neutral-800 rounded-xl items-center justify-center">
        <Play size={48} color="#666" />
        <Text className="text-neutral-500 mt-2 text-sm">No video available</Text>
      </View>
    );
  }

  return (
    <View className="w-full aspect-video rounded-xl overflow-hidden bg-black">
      <Video
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay={false}
      />
    </View>
  );
}

function SmallThumbnail({ uri }: { uri: string | null }) {
  if (!uri) {
    return (
      <View className="w-20 h-16 rounded-lg bg-neutral-800 items-center justify-center">
        <Play size={20} color="#666" />
      </View>
    );
  }

  return (
    <View className="w-20 h-16 rounded-lg overflow-hidden bg-black">
      <Video
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isMuted
      />
    </View>
  );
}

export default function ClipOfWeekScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const currentUserId = user?.id ?? null;
  const { week, year } = getCurrentWeekAndYear();
  const prevWeek = week === 1 ? 52 : week - 1;
  const prevYear = week === 1 ? year - 1 : year;

  const [submissions, setSubmissions] = useState<ClipSubmission[]>([]);
  const [lastWeekWinner, setLastWeekWinner] = useState<ClipSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login' as any);
    }
  }, [authLoading, user, router]);

  const fetchSubmissions = useCallback(async () => {
    if (!currentUserId) return;

    const { data: subs, error } = await supabase
      .from('clip_of_week_submissions')
      .select(
        'id, user_id, media_id, week_number, year, votes, created_at, trick_name, media:media!clip_of_week_submissions_media_id_fkey(url), profile:profiles!clip_of_week_submissions_user_id_fkey(username)'
      )
      .eq('week_number', week)
      .eq('year', year)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('ClipOfWeek fetch error:', error.message);
      setSubmissions([]);
      return;
    }

    const { data: myVotes, error: votesError } = await supabase
      .from('clip_of_week_votes')
      .select('submission_id')
      .eq('user_id', currentUserId);

    if (votesError) {
      console.error('ClipOfWeek vote-state error:', votesError.message);
    }

    const votedIds = new Set((myVotes ?? []).map((vote: any) => vote.submission_id));
    const mapped: ClipSubmission[] = (subs ?? []).map((submission: any) => ({
      id: submission.id,
      user_id: submission.user_id,
      week_number: submission.week_number,
      year: submission.year,
      votes: submission.votes ?? 0,
      created_at: submission.created_at,
      trick_name: submission.trick_name || 'Skate Clip',
      video_url: submission.media?.url ?? null,
      username: submission.profile?.username ?? 'Anonymous',
      has_voted: votedIds.has(submission.id),
    }));

    setSubmissions(mapped);
  }, [currentUserId, week, year]);

  const fetchLastWeekWinner = useCallback(async () => {
    const { data: subs, error } = await supabase
      .from('clip_of_week_submissions')
      .select(
        'id, user_id, week_number, year, votes, created_at, trick_name, media:media!clip_of_week_submissions_media_id_fkey(url), profile:profiles!clip_of_week_submissions_user_id_fkey(username)'
      )
      .eq('week_number', prevWeek)
      .eq('year', prevYear)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('ClipOfWeek previous winner error:', error.message);
      setLastWeekWinner(null);
      return;
    }

    if (!subs?.length) {
      setLastWeekWinner(null);
      return;
    }

    const submission: any = subs[0];
    setLastWeekWinner({
      id: submission.id,
      user_id: submission.user_id,
      week_number: submission.week_number,
      year: submission.year,
      votes: submission.votes ?? 0,
      created_at: submission.created_at,
      trick_name: submission.trick_name || 'Skate Clip',
      video_url: submission.media?.url ?? null,
      username: submission.profile?.username ?? 'Anonymous',
      has_voted: false,
    });
  }, [prevWeek, prevYear]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    Promise.all([fetchSubmissions(), fetchLastWeekWinner()]).finally(() => setLoading(false));
  }, [currentUserId, fetchSubmissions, fetchLastWeekWinner]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSubmissions(), fetchLastWeekWinner()]);
    setRefreshing(false);
  }, [fetchSubmissions, fetchLastWeekWinner]);

  const handleVote = useCallback(
    async (submissionId: string, currentlyVoted: boolean) => {
      if (!currentUserId || votingId) return;
      setVotingId(submissionId);

      const previous = submissions;
      setSubmissions(items =>
        items.map(item =>
          item.id === submissionId
            ? {
                ...item,
                has_voted: !currentlyVoted,
                votes: Math.max(0, item.votes + (currentlyVoted ? -1 : 1)),
              }
            : item
        )
      );

      const { data, error } = await supabase.rpc('set_clip_of_week_vote', {
        p_submission_id: submissionId,
        p_voted: !currentlyVoted,
      });

      if (error) {
        setSubmissions(previous);
        Alert.alert('Vote failed', error.message || 'Please try again.');
        setVotingId(null);
        return;
      }

      const result = data as { votes?: number; voted?: boolean } | null;
      setSubmissions(items =>
        items
          .map(item =>
            item.id === submissionId
              ? {
                  ...item,
                  has_voted: result?.voted ?? !currentlyVoted,
                  votes: Number(result?.votes ?? item.votes),
                }
              : item
          )
          .sort((a, b) => b.votes - a.votes)
      );
      setVotingId(null);
    },
    [currentUserId, votingId, submissions]
  );

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text className="text-neutral-400 mt-3 text-base">Loading clips...</Text>
      </View>
    );
  }

  const topClip = submissions[0] ?? null;
  const restClips = submissions.slice(1);

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
      }
    >
      <View className="px-4 pt-6 pb-4 border-b border-neutral-800">
        <Text className="text-orange-500 text-xs font-bold tracking-widest uppercase">
          Community Vote
        </Text>
        <Text className="text-white text-3xl font-black mt-1">CLIP OF THE WEEK</Text>
        <Text className="text-neutral-400 text-sm mt-1">{getWeekDateRange(week, year)}</Text>
      </View>

      {topClip ? (
        <View className="mx-4 mt-5 bg-[#1a1a1a] rounded-2xl overflow-hidden border border-orange-500/30">
          <View className="bg-orange-500/10 px-4 py-2 border-b border-orange-500/20">
            <Text className="text-orange-400 text-xs font-bold tracking-widest uppercase">
              Top Submission
            </Text>
          </View>
          <View className="p-4">
            <VideoThumbnail uri={topClip.video_url} />
            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 mr-3">
                <Text className="text-white text-xl font-bold">{topClip.trick_name}</Text>
                <Text className="text-neutral-400 text-sm mt-0.5">by @{topClip.username}</Text>
              </View>
              <UpvoteButton
                votes={topClip.votes}
                hasVoted={topClip.has_voted}
                onPress={() => void handleVote(topClip.id, topClip.has_voted)}
                loading={votingId === topClip.id}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="mx-4 mt-5 bg-[#1a1a1a] rounded-2xl p-8 items-center border border-neutral-800">
          <Play size={40} color="#444" />
          <Text className="text-neutral-500 text-base mt-3 text-center">
            No submissions yet this week.{`\n`}Be the first to submit!
          </Text>
        </View>
      )}

      {restClips.length > 0 && (
        <View className="mx-4 mt-6">
          <Text className="text-white text-lg font-bold mb-3">All Submissions</Text>
          {restClips.map(clip => (
            <View
              key={clip.id}
              className="flex-row items-center bg-[#1a1a1a] rounded-xl p-3 mb-2 border border-neutral-800"
            >
              <SmallThumbnail uri={clip.video_url} />
              <View className="flex-1 mx-3">
                <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                  {clip.trick_name}
                </Text>
                <Text className="text-neutral-500 text-xs mt-0.5">@{clip.username}</Text>
              </View>
              <UpvoteButton
                votes={clip.votes}
                hasVoted={clip.has_voted}
                onPress={() => void handleVote(clip.id, clip.has_voted)}
                loading={votingId === clip.id}
                size="sm"
              />
            </View>
          ))}
        </View>
      )}

      {lastWeekWinner && (
        <View className="mx-4 mt-6 bg-[#1a1a1a] rounded-2xl overflow-hidden border border-yellow-500/40">
          <View className="bg-yellow-500/10 px-4 py-2 flex-row items-center gap-2 border-b border-yellow-500/20">
            <Trophy size={16} color="#FFD700" />
            <Text className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
              Last Week's Champion
            </Text>
          </View>
          <View className="p-4 flex-row items-center">
            <SmallThumbnail uri={lastWeekWinner.video_url} />
            <View className="flex-1 ml-3">
              <Text className="text-white font-bold text-base">{lastWeekWinner.trick_name}</Text>
              <Text className="text-neutral-400 text-sm">@{lastWeekWinner.username}</Text>
              <Text className="text-yellow-400 text-sm font-bold mt-1">
                {lastWeekWinner.votes} votes · Champion
              </Text>
            </View>
          </View>
        </View>
      )}

      <View className="mx-4 mt-6">
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(screens)/upload-media' as any,
              params: { clipWeek: String(week), clipYear: String(year) },
            })
          }
          className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center gap-3"
        >
          <Upload size={22} color="#fff" />
          <Text className="text-white text-base font-bold">Submit Your Clip</Text>
        </TouchableOpacity>
        <Text className="text-neutral-500 text-xs text-center mt-2">
          Best clip wins the weekly community spotlight
        </Text>
      </View>
    </ScrollView>
  );
}
