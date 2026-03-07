import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { ChevronUp, Play, Upload, Trophy } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        hasVoted
          ? 'bg-orange-500 border-orange-500'
          : 'bg-transparent border-neutral-600'
      }`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={hasVoted ? '#fff' : '#FF6B35'} />
      ) : (
        <ChevronUp
          size={iconSize}
          color={hasVoted ? '#fff' : '#FF6B35'}
          strokeWidth={2.5}
        />
      )}
      <Text
        className={`font-bold ${textSize} ${hasVoted ? 'text-white' : 'text-orange-500'}`}
      >
        {votes}
      </Text>
    </TouchableOpacity>
  );
}

function VideoThumbnail({ uri }: { uri: string | null }) {
  const videoRef = useRef<any>(null);

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
        ref={videoRef}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClipOfWeekScreen({ navigation }: any) {
  const { week, year } = getCurrentWeekAndYear();
  const prevWeek = week === 1 ? 52 : week - 1;
  const prevYear = week === 1 ? year - 1 : year;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ClipSubmission[]>([]);
  const [lastWeekWinner, setLastWeekWinner] = useState<ClipSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchSubmissions = useCallback(async () => {
    if (!currentUserId) return;

    const { data: subs, error } = await supabase
      .from('clip_submissions')
      .select(
        `
        id,
        user_id,
        week_number,
        year,
        votes,
        created_at,
        trick_name,
        media:media_id ( url ),
        profile:user_id ( username )
      `
      )
      .eq('week_number', week)
      .eq('year', year)
      .order('votes', { ascending: false });

    if (error) {
      console.error('ClipOfWeek fetch error:', error.message);
      return;
    }

    const { data: myVotes } = await supabase
      .from('clip_votes')
      .select('submission_id')
      .eq('user_id', currentUserId);

    const votedIds = new Set((myVotes ?? []).map((v: any) => v.submission_id));

    const mapped: ClipSubmission[] = (subs ?? []).map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      week_number: s.week_number,
      year: s.year,
      votes: s.votes ?? 0,
      created_at: s.created_at,
      trick_name: s.trick_name ?? 'Unknown Trick',
      video_url: s.media?.url ?? null,
      username: s.profile?.username ?? 'Anonymous',
      has_voted: votedIds.has(s.id),
    }));

    setSubmissions(mapped);
  }, [currentUserId, week, year]);

  const fetchLastWeekWinner = useCallback(async () => {
    const { data: subs } = await supabase
      .from('clip_submissions')
      .select(
        `
        id,
        user_id,
        week_number,
        year,
        votes,
        created_at,
        trick_name,
        media:media_id ( url ),
        profile:user_id ( username )
      `
      )
      .eq('week_number', prevWeek)
      .eq('year', prevYear)
      .order('votes', { ascending: false })
      .limit(1);

    if (subs && subs.length > 0) {
      const s: any = subs[0];
      setLastWeekWinner({
        id: s.id,
        user_id: s.user_id,
        week_number: s.week_number,
        year: s.year,
        votes: s.votes ?? 0,
        created_at: s.created_at,
        trick_name: s.trick_name ?? 'Unknown Trick',
        video_url: s.media?.url ?? null,
        username: s.profile?.username ?? 'Anonymous',
        has_voted: false,
      });
    }
  }, [prevWeek, prevYear]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    Promise.all([fetchSubmissions(), fetchLastWeekWinner()]).finally(() =>
      setLoading(false)
    );
  }, [currentUserId, fetchSubmissions, fetchLastWeekWinner]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSubmissions(), fetchLastWeekWinner()]);
    setRefreshing(false);
  }, [fetchSubmissions, fetchLastWeekWinner]);

  // ── Voting ────────────────────────────────────────────────────────────────

  const handleVote = useCallback(
    async (submissionId: string, currentlyVoted: boolean) => {
      if (!currentUserId || votingId) return;
      setVotingId(submissionId);

      try {
        if (currentlyVoted) {
          await supabase
            .from('clip_votes')
            .delete()
            .eq('user_id', currentUserId)
            .eq('submission_id', submissionId);

          await supabase.rpc('decrement_clip_votes', { submission_id: submissionId });
        } else {
          await supabase
            .from('clip_votes')
            .upsert(
              { user_id: currentUserId, submission_id: submissionId },
              { onConflict: 'user_id,submission_id' }
            );

          await supabase.rpc('increment_clip_votes', { submission_id: submissionId });
        }

        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? {
                  ...s,
                  has_voted: !currentlyVoted,
                  votes: currentlyVoted ? s.votes - 1 : s.votes + 1,
                }
              : s
          )
        );
      } catch (err) {
        console.error('Vote error:', err);
      } finally {
        setVotingId(null);
      }
    },
    [currentUserId, votingId]
  );

  // ── Render ────────────────────────────────────────────────────────────────

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
      contentContainerClassName="pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6B35"
        />
      }
    >
      {/* ── Header ── */}
      <View className="px-4 pt-6 pb-4 border-b border-neutral-800">
        <Text className="text-orange-500 text-xs font-bold tracking-widest uppercase">
          Community Vote
        </Text>
        <Text className="text-white text-3xl font-black mt-1">
          CLIP OF THE WEEK
        </Text>
        <Text className="text-neutral-400 text-sm mt-1">
          {getWeekDateRange(week, year)}
        </Text>
      </View>

      {/* ── Top Submission ── */}
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
                <Text className="text-white text-xl font-bold">
                  {topClip.trick_name}
                </Text>
                <Text className="text-neutral-400 text-sm mt-0.5">
                  by @{topClip.username}
                </Text>
              </View>
              <UpvoteButton
                votes={topClip.votes}
                hasVoted={topClip.has_voted}
                onPress={() => handleVote(topClip.id, topClip.has_voted)}
                loading={votingId === topClip.id}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="mx-4 mt-5 bg-[#1a1a1a] rounded-2xl p-8 items-center border border-neutral-800">
          <Play size={40} color="#444" />
          <Text className="text-neutral-500 text-base mt-3 text-center">
            No submissions yet this week.{'\n'}Be the first to submit!
          </Text>
        </View>
      )}

      {/* ── All Submissions ── */}
      {restClips.length > 0 && (
        <View className="mx-4 mt-6">
          <Text className="text-white text-lg font-bold mb-3">
            All Submissions
          </Text>
          {restClips.map((clip) => (
            <View
              key={clip.id}
              className="flex-row items-center bg-[#1a1a1a] rounded-xl p-3 mb-2 border border-neutral-800"
            >
              <SmallThumbnail uri={clip.video_url} />
              <View className="flex-1 mx-3">
                <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                  {clip.trick_name}
                </Text>
                <Text className="text-neutral-500 text-xs mt-0.5">
                  @{clip.username}
                </Text>
              </View>
              <UpvoteButton
                votes={clip.votes}
                hasVoted={clip.has_voted}
                onPress={() => handleVote(clip.id, clip.has_voted)}
                loading={votingId === clip.id}
                size="sm"
              />
            </View>
          ))}
        </View>
      )}

      {/* ── Last Week Winner ── */}
      {lastWeekWinner && (
        <View className="mx-4 mt-6 bg-[#1a1a1a] rounded-2xl overflow-hidden border border-yellow-500/40">
          <View className="bg-yellow-500/10 px-4 py-2 flex-row items-center gap-2 border-b border-yellow-500/20">
            <Trophy size={16} color="#FFD700" />
            <Text className="text-yellow-400 text-xs font-bold tracking-widest uppercase">
              Last Week's Champion
            </Text>
          </View>

          <View className="p-4">
            <SmallThumbnail uri={lastWeekWinner.video_url} />

            <View className="flex-row items-center justify-between mt-3">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center gap-2 mb-1">
                  <View className="bg-yellow-500 px-2 py-0.5 rounded-full">
                    <Text className="text-black text-xs font-black">CHAMPION</Text>
                  </View>
                </View>
                <Text className="text-white font-bold text-base">
                  {lastWeekWinner.trick_name}
                </Text>
                <Text className="text-neutral-400 text-sm">
                  @{lastWeekWinner.username}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-yellow-400 text-xl font-black">+200</Text>
                <Text className="text-yellow-600 text-xs font-bold">XP</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Submit CTA ── */}
      <View className="mx-4 mt-6">
        <TouchableOpacity
          onPress={() => navigation.navigate('UploadMedia')}
          className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center gap-3"
        >
          <Upload size={22} color="#fff" />
          <Text className="text-white text-base font-bold">Submit Your Clip</Text>
        </TouchableOpacity>
        <Text className="text-neutral-500 text-xs text-center mt-2">
          Best clip wins 200 XP + community glory
        </Text>
      </View>
    </ScrollView>
  );
}
