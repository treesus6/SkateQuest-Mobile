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
import { CheckCircle, Clock3, Video } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

interface BingoCardRow {
  id: string;
  user_id: string;
  card_data: { tricks?: string[]; week_start?: string } | null;
  completed_cells: number[] | null;
  completed: boolean | null;
  week_start: string | null;
}

interface BingoSubmission {
  id: string;
  cell_index: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface BingoReward {
  reward_key: string;
  xp_awarded: number;
}

function getWinningLines(): number[][] {
  const lines: number[][] = [];
  for (let row = 0; row < 5; row += 1) {
    lines.push([row * 5, row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4]);
  }
  for (let column = 0; column < 5; column += 1) {
    lines.push([column, column + 5, column + 10, column + 15, column + 20]);
  }
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
}

function getCompletedLines(completedCells: number[]): number[][] {
  const completed = new Set(completedCells);
  return getWinningLines().filter(line => line.every(cell => completed.has(cell)));
}

function getMsUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function TrickBingoScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const [card, setCard] = useState<BingoCardRow | null>(null);
  const [submissions, setSubmissions] = useState<BingoSubmission[]>([]);
  const [rewards, setRewards] = useState<BingoReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(getMsUntilNextMonday());

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getMsUntilNextMonday()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const loadCard = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data: cardResult, error: cardError } = await supabase.rpc('get_or_create_weekly_bingo_card');
      if (cardError) throw cardError;

      const resolvedCard = (Array.isArray(cardResult) ? cardResult[0] : cardResult) as BingoCardRow | null;
      if (!resolvedCard?.id) throw new Error('Weekly Bingo card was not created.');

      const [submissionResult, rewardResult] = await Promise.all([
        supabase
          .from('bingo_cell_submissions')
          .select('id,cell_index,status')
          .eq('bingo_card_id', resolvedCard.id)
          .eq('user_id', user.id),
        supabase
          .from('bingo_rewards')
          .select('reward_key,xp_awarded')
          .eq('bingo_card_id', resolvedCard.id)
          .eq('user_id', user.id),
      ]);

      if (submissionResult.error) throw submissionResult.error;
      if (rewardResult.error) throw rewardResult.error;

      setCard(resolvedCard);
      setSubmissions((submissionResult.data ?? []) as BingoSubmission[]);
      setRewards((rewardResult.data ?? []) as BingoReward[]);
    } catch (error: any) {
      console.error('Failed to load Trick Bingo:', error);
      Alert.alert('Could not load Trick Bingo', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  useEffect(() => {
    if (!card?.id || !user?.id) return;

    const channel = supabase
      .channel(`bingo-live:${card.id}:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_cards', filter: `id=eq.${card.id}` },
        () => void loadCard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bingo_cell_submissions', filter: `bingo_card_id=eq.${card.id}` },
        () => void loadCard()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bingo_rewards', filter: `bingo_card_id=eq.${card.id}` },
        () => void loadCard()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [card?.id, user?.id, loadCard]);

  const tricks = card?.card_data?.tricks ?? [];
  const completedCells = card?.completed_cells ?? [];
  const completedSet = useMemo(() => new Set(completedCells), [completedCells]);
  const pendingSet = useMemo(
    () => new Set(submissions.filter(item => item.status === 'PENDING').map(item => item.cell_index)),
    [submissions]
  );
  const completedLines = useMemo(() => getCompletedLines(completedCells), [completedCells]);
  const highlightedCells = useMemo(() => new Set(completedLines.flat()), [completedLines]);
  const earnedXp = rewards.reduce((sum, reward) => sum + Number(reward.xp_awarded || 0), 0);

  const openProofUpload = (cellIndex: number) => {
    if (!card) return;
    if (completedSet.has(cellIndex)) {
      Alert.alert('Already verified', 'This square already passed the Judge’s Booth.');
      return;
    }
    if (pendingSet.has(cellIndex)) {
      Alert.alert('Proof pending', 'Your video is already in the Judge’s Booth for this square.');
      return;
    }

    const trickName = tricks[cellIndex];
    if (!trickName) return;
    navigation.navigate('UploadMedia', {
      bingoCardId: card.id,
      bingoCellIndex: cellIndex,
      initialTrickName: trickName,
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
        <Text className="text-gray-500 mt-3">Loading verified Bingo card…</Text>
      </View>
    );
  }

  if (!card || tricks.length !== 25) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
        <Text className="text-white text-lg font-bold text-center">Trick Bingo is unavailable right now.</Text>
        <Text className="text-gray-500 text-sm text-center mt-2">The server did not return a valid 25-trick card.</Text>
        <TouchableOpacity className="bg-[#FF6B35] rounded-xl px-5 py-3 mt-5" onPress={() => void loadCard()}>
          <Text className="text-white font-bold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#FF6B35"
          onRefresh={() => {
            setRefreshing(true);
            void loadCard();
          }}
        />
      }
    >
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-extrabold text-white">Weekly Trick Bingo</Text>
        <Text className="text-[#777] text-sm mt-1">
          New card in <Text className="text-[#FF6B35] font-bold">{formatCountdown(countdown)}</Text>
        </Text>
        <Text className="text-gray-400 text-sm leading-5 mt-3">
          Tap a square, upload a real video, and pass the Judge’s Booth. Only approved proof fills the card.
        </Text>

        <View className="flex-row mt-4 gap-2">
          <View className="flex-1 bg-[#171717] rounded-xl px-3 py-3">
            <Text className="text-[#FFD700] font-extrabold text-base">+50 XP</Text>
            <Text className="text-[#777] text-xs mt-1">each verified row, column, or diagonal</Text>
          </View>
          <View className="flex-1 bg-[#171717] rounded-xl px-3 py-3">
            <Text className="text-[#FFD700] font-extrabold text-base">+500 XP</Text>
            <Text className="text-[#777] text-xs mt-1">verified full card bonus</Text>
          </View>
        </View>

        <View className="mt-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[#777] text-xs">{completedCells.length} / 25 verified</Text>
            <Text className="text-[#FFD700] text-xs font-bold">{earnedXp} XP earned</Text>
          </View>
          <View className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <View
              className="h-2 bg-[#FF6B35] rounded-full"
              style={{ width: `${(completedCells.length / 25) * 100}%` }}
            />
          </View>
        </View>
      </View>

      <View className="px-4">
        {[0, 1, 2, 3, 4].map(row => (
          <View key={row} className="flex-row justify-between mb-2">
            {[0, 1, 2, 3, 4].map(column => {
              const index = row * 5 + column;
              const verified = completedSet.has(index);
              const pending = pendingSet.has(index);
              const highlighted = highlightedCells.has(index);
              const cellClass = verified
                ? highlighted
                  ? 'bg-[#FF6B35] border-[#FFD700] border-2'
                  : 'bg-[#FF6B35] border-[#FF6B35] border-2'
                : pending
                  ? 'bg-[#2B2417] border-[#D8A43A] border-2'
                  : 'bg-[#1a1a1a] border-[#333] border';

              return (
                <TouchableOpacity
                  key={column}
                  onPress={() => openProofUpload(index)}
                  activeOpacity={0.75}
                  className={`rounded-lg items-center justify-center p-1 ${cellClass}`}
                  style={{ width: '19%', aspectRatio: 1 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${tricks[index]}: ${verified ? 'verified' : pending ? 'pending judging' : 'needs video proof'}`}
                >
                  {verified ? (
                    <CheckCircle size={15} color="#fff" style={{ marginBottom: 2 }} />
                  ) : pending ? (
                    <Clock3 size={15} color="#FFD166" style={{ marginBottom: 2 }} />
                  ) : (
                    <Video size={14} color="#777" style={{ marginBottom: 2 }} />
                  )}
                  <Text className="text-white text-center font-semibold" style={{ fontSize: 9 }} numberOfLines={3}>
                    {tricks[index]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {completedLines.length > 0 && (
        <View className="mx-5 mt-4 bg-[#171717] rounded-xl p-4">
          <Text className="text-white font-bold">
            {completedLines.length} verified BINGO{completedLines.length === 1 ? '' : 'S'}
          </Text>
          <Text className="text-[#777] text-sm mt-1">XP shown above comes from server-recorded Bingo rewards only.</Text>
        </View>
      )}

      {card.completed && (
        <View className="mx-5 mt-4 bg-[#2B2417] border border-[#FFD700] rounded-xl p-5 items-center">
          <Text className="text-[#FFD700] text-2xl font-extrabold">FULL CARD VERIFIED</Text>
          <Text className="text-white text-sm text-center mt-2">Every square passed community judging.</Text>
        </View>
      )}
    </ScrollView>
  );
}
