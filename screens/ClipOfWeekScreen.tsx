import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronUp, Crown, Flame, Play, Trophy, Upload, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from '../components/VideoPlayer';
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

function getCurrentWeekAndYear() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
}

function getWeekDateRange(week: number, year: number) {
  const startOfYear = new Date(year, 0, 1);
  const dayOffset = (week - 1) * 7 - startOfYear.getDay() + 1;
  const start = new Date(year, 0, dayOffset);
  const end = new Date(year, 0, dayOffset + 6);
  const fmt = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

function VoteButton({ votes, hasVoted, loading, onPress, compact = false }: { votes: number; hasVoted: boolean; loading: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      className={`flex-row items-center justify-center rounded-full border ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${
        hasVoted ? 'bg-[#D2673D] border-[#D2673D]' : 'bg-[#171D27] border-[#343D4A]'
      }`}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : <ChevronUp size={compact ? 16 : 20} color={hasVoted ? '#fff' : '#D2673D'} strokeWidth={3} />}
      <Text className={`ml-1 font-black ${compact ? 'text-sm' : 'text-base'} ${hasVoted ? 'text-white' : 'text-[#F5F1EA]'}`}>{votes}</Text>
    </TouchableOpacity>
  );
}

function ClipVideo({ uri, compact = false }: { uri: string | null; compact?: boolean }) {
  if (!uri) {
    return (
      <View className={`${compact ? 'w-24 h-20' : 'w-full aspect-video'} rounded-2xl bg-[#111721] border border-[#252D39] items-center justify-center`}>
        <Play size={compact ? 20 : 38} color="#596273" />
        {!compact && <Text className="text-[#697384] text-xs mt-2">Video unavailable</Text>}
      </View>
    );
  }
  return (
    <View className={`${compact ? 'w-24 h-20' : 'w-full aspect-video'} rounded-2xl overflow-hidden bg-black border border-[#252D39]`}>
      <Video source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode={compact ? ResizeMode.COVER : ResizeMode.CONTAIN} useNativeControls={!compact} shouldPlay={false} isMuted={compact} />
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
    if (!authLoading && !user) router.replace('/login' as any);
  }, [authLoading, user, router]);

  const fetchSubmissions = useCallback(async () => {
    if (!currentUserId) return;
    const { data: subs, error } = await supabase
      .from('clip_of_week_submissions')
      .select('id, user_id, media_id, week_number, year, votes, created_at, trick_name, media:media!clip_of_week_submissions_media_id_fkey(url), profile:profiles!clip_of_week_submissions_user_id_fkey(username)')
      .eq('week_number', week)
      .eq('year', year)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('ClipOfWeek fetch error:', error.message);
      setSubmissions([]);
      return;
    }
    const { data: myVotes, error: votesError } = await supabase.from('clip_of_week_votes').select('submission_id').eq('user_id', currentUserId);
    if (votesError) console.error('ClipOfWeek vote-state error:', votesError.message);
    const votedIds = new Set((myVotes ?? []).map((vote: any) => vote.submission_id));
    setSubmissions((subs ?? []).map((submission: any) => ({
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
    })));
  }, [currentUserId, week, year]);

  const fetchLastWeekWinner = useCallback(async () => {
    const { data: subs, error } = await supabase
      .from('clip_of_week_submissions')
      .select('id, user_id, week_number, year, votes, created_at, trick_name, media:media!clip_of_week_submissions_media_id_fkey(url), profile:profiles!clip_of_week_submissions_user_id_fkey(username)')
      .eq('week_number', prevWeek)
      .eq('year', prevYear)
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    if (error || !subs?.length) {
      if (error) console.error('ClipOfWeek previous winner error:', error.message);
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

  const handleVote = useCallback(async (submissionId: string, currentlyVoted: boolean) => {
    if (!currentUserId || votingId) return;
    setVotingId(submissionId);
    const previous = submissions;
    setSubmissions(items => items.map(item => item.id === submissionId ? { ...item, has_voted: !currentlyVoted, votes: Math.max(0, item.votes + (currentlyVoted ? -1 : 1)) } : item));
    const { data, error } = await supabase.rpc('set_clip_of_week_vote', { p_submission_id: submissionId, p_voted: !currentlyVoted });
    if (error) {
      setSubmissions(previous);
      Alert.alert('Vote failed', error.message || 'Please try again.');
      setVotingId(null);
      return;
    }
    const result = data as { votes?: number; voted?: boolean } | null;
    setSubmissions(items => items.map(item => item.id === submissionId ? { ...item, has_voted: result?.voted ?? !currentlyVoted, votes: Number(result?.votes ?? item.votes) } : item).sort((a, b) => b.votes - a.votes));
    setVotingId(null);
  }, [currentUserId, votingId, submissions]);

  const totalVotes = useMemo(() => submissions.reduce((sum, item) => sum + item.votes, 0), [submissions]);
  const topClip = submissions[0] ?? null;
  const restClips = submissions.slice(1);

  if (loading) {
    return (
      <View className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
        <Text className="text-[#8E97A4] mt-3 font-semibold">Loading this week's clips…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#07090D]"
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D2673D" />}
    >
      <View className="px-5 pt-7 pb-5 border-b border-[#1D2530] bg-[#0A0E14]">
        <View className="flex-row items-center gap-2 mb-2"><Flame size={16} color="#D2673D" /><Text className="text-[#D2673D] text-xs font-black tracking-[2px]">COMMUNITY COMPETITION</Text></View>
        <Text className="text-[#F7F4EF] text-4xl font-black leading-[42px]">CLIP OF THE WEEK</Text>
        <Text className="text-[#8E97A4] mt-2">{getWeekDateRange(week, year)}</Text>
        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-[#111721] border border-[#252D39] rounded-2xl p-4"><Users size={18} color="#D2673D" /><Text className="text-[#F7F4EF] text-2xl font-black mt-2">{submissions.length}</Text><Text className="text-[#7E8897] text-xs">entries</Text></View>
          <View className="flex-1 bg-[#111721] border border-[#252D39] rounded-2xl p-4"><ChevronUp size={18} color="#D2673D" /><Text className="text-[#F7F4EF] text-2xl font-black mt-2">{totalVotes}</Text><Text className="text-[#7E8897] text-xs">community votes</Text></View>
        </View>
      </View>

      {topClip ? (
        <View className="mx-4 mt-5 bg-[#10151D] rounded-3xl overflow-hidden border border-[#7B3C28]">
          <View className="px-4 py-3 bg-[#2A1711] border-b border-[#6A3325] flex-row items-center justify-between">
            <View className="flex-row items-center gap-2"><Crown size={16} color="#F2B84B" /><Text className="text-[#F2B84B] text-xs font-black tracking-widest">CURRENT LEADER</Text></View>
            <Text className="text-[#8E97A4] text-xs">#{1}</Text>
          </View>
          <View className="p-4">
            <ClipVideo uri={topClip.video_url} />
            <View className="flex-row items-center justify-between mt-4">
              <View className="flex-1 mr-3"><Text className="text-[#F7F4EF] text-2xl font-black">{topClip.trick_name}</Text><Text className="text-[#9DA6B3] mt-1">@{topClip.username}</Text></View>
              <VoteButton votes={topClip.votes} hasVoted={topClip.has_voted} onPress={() => void handleVote(topClip.id, topClip.has_voted)} loading={votingId === topClip.id} />
            </View>
          </View>
        </View>
      ) : (
        <View className="mx-4 mt-5 bg-[#10151D] rounded-3xl p-8 items-center border border-[#252D39]"><Play size={40} color="#56606E" /><Text className="text-[#F7F4EF] text-lg font-black mt-4">No entries yet</Text><Text className="text-[#7E8897] text-center mt-2">Drop the first real clip of the week and set the bar.</Text></View>
      )}

      {restClips.length > 0 && (
        <View className="mx-4 mt-7">
          <Text className="text-[#F7F4EF] text-xl font-black mb-3">Chasing the lead</Text>
          {restClips.map((clip, index) => (
            <View key={clip.id} className="flex-row items-center bg-[#10151D] rounded-2xl p-3 mb-3 border border-[#252D39]">
              <View className="w-8 items-center mr-2"><Text className="text-[#6F7885] font-black">#{index + 2}</Text></View>
              <ClipVideo uri={clip.video_url} compact />
              <View className="flex-1 mx-3"><Text className="text-[#F7F4EF] font-black text-base" numberOfLines={1}>{clip.trick_name}</Text><Text className="text-[#7E8897] text-xs mt-1">@{clip.username}</Text></View>
              <VoteButton compact votes={clip.votes} hasVoted={clip.has_voted} onPress={() => void handleVote(clip.id, clip.has_voted)} loading={votingId === clip.id} />
            </View>
          ))}
        </View>
      )}

      {lastWeekWinner && (
        <View className="mx-4 mt-6 bg-[#12161C] rounded-3xl overflow-hidden border border-[#55451D]">
          <View className="bg-[#241F10] px-4 py-3 flex-row items-center gap-2 border-b border-[#55451D]"><Trophy size={17} color="#F2C94C" /><Text className="text-[#F2C94C] text-xs font-black tracking-widest">LAST WEEK'S CHAMPION</Text></View>
          <View className="p-4 flex-row items-center"><ClipVideo uri={lastWeekWinner.video_url} compact /><View className="flex-1 ml-3"><Text className="text-[#F7F4EF] font-black text-base">{lastWeekWinner.trick_name}</Text><Text className="text-[#9DA6B3] mt-1">@{lastWeekWinner.username}</Text><Text className="text-[#F2C94C] text-sm font-black mt-2">{lastWeekWinner.votes} votes</Text></View></View>
        </View>
      )}

      <View className="mx-4 mt-7">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/upload-media' as any, params: { clipWeek: String(week), clipYear: String(year) } })}
          className="bg-[#D2673D] rounded-2xl py-5 flex-row items-center justify-center gap-3"
        >
          <Upload size={22} color="#fff" />
          <Text className="text-white text-base font-black">ENTER THIS WEEK</Text>
        </TouchableOpacity>
        <Text className="text-[#6F7885] text-xs text-center mt-3">Real clip. Real community vote. Weekly spotlight.</Text>
      </View>
    </ScrollView>
  );
}