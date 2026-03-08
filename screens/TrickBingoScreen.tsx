import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BingoCard {
  id: string;
  week_number: number;
  tricks: string[];
}

interface BingoProgress {
  id?: string;
  user_id: string;
  bingo_card_id: string;
  landed_cells: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns all winning lines for a 5×5 grid (rows, cols, diagonals). */
function getWinningLines(): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) {
    lines.push([r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4]); // row
  }
  for (let c = 0; c < 5; c++) {
    lines.push([c, c + 5, c + 10, c + 15, c + 20]); // col
  }
  lines.push([0, 6, 12, 18, 24]); // diagonal TL→BR
  lines.push([4, 8, 12, 16, 20]); // diagonal TR→BL
  return lines;
}

function getCompletedLines(landed: number[]): number[][] {
  const set = new Set(landed);
  return getWinningLines().filter((line) => line.every((i) => set.has(i)));
}

function isFullCard(landed: number[]): boolean {
  return landed.length === 25;
}

function getMsUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay(); // 0 Sun … 6 Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrickBingoScreen() {
  const [card, setCard] = useState<BingoCard | null>(null);
  const [progress, setProgress] = useState<BingoProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(getMsUntilNextMonday());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setCountdown(getMsUntilNextMonday()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch card + progress ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cardData } = await supabase
        .from('bingo_cards')
        .select('*')
        .order('week_number', { ascending: false })
        .limit(1)
        .single();

      if (!cardData) return;
      setCard(cardData as BingoCard);

      if (userId) {
        const { data: prog } = await supabase
          .from('bingo_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('bingo_card_id', cardData.id)
          .maybeSingle();

        setProgress(
          prog ?? {
            user_id: userId,
            bingo_card_id: cardData.id,
            landed_cells: [],
          }
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Show toast briefly ────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ── Cell tap ──────────────────────────────────────────────────────────────
  const handleCellTap = async (index: number) => {
    if (!card || !progress || !userId) return;

    const alreadyLanded = progress.landed_cells.includes(index);
    const newLanded = alreadyLanded
      ? progress.landed_cells.filter((i) => i !== index)
      : [...progress.landed_cells, index];

    const prevLines = getCompletedLines(progress.landed_cells);
    const newLines = getCompletedLines(newLanded);
    const newLineCount = newLines.length - prevLines.length;

    const updatedProgress: BingoProgress = { ...progress, landed_cells: newLanded };
    setProgress(updatedProgress);

    // Persist
    if (progress.id) {
      await supabase
        .from('bingo_progress')
        .update({ landed_cells: newLanded })
        .eq('id', progress.id);
    } else {
      const { data } = await supabase
        .from('bingo_progress')
        .insert({ user_id: userId, bingo_card_id: card.id, landed_cells: newLanded })
        .select()
        .single();
      if (data) setProgress({ ...updatedProgress, id: data.id });
    }

    // Feedback
    if (isFullCard(newLanded)) {
      setCelebrationVisible(true);
    } else if (newLineCount > 0) {
      showToast(`BINGO! +${newLineCount * 50} XP`);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const landed = progress?.landed_cells ?? [];
  const completedLines = getCompletedLines(landed);
  const highlightedCells = new Set(completedLines.flat());

  const cellStyle = (index: number): string => {
    const isLanded = landed.includes(index);
    const isHighlighted = highlightedCells.has(index);
    if (isLanded && isHighlighted) return 'bg-[#FF6B35] border-[#FFD700] border-2';
    if (isLanded) return 'bg-[#FF6B35] border-[#FF6B35] border-2';
    return 'bg-[#1a1a1a] border-[#333] border';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (!card) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
        <Text className="text-white text-lg text-center">No bingo card available this week.</Text>
      </View>
    );
  }

  const rowsCompleted = completedLines.filter((l) => l[1] === l[0] + 1).length;
  const totalXP = rowsCompleted * 50 + (isFullCard(landed) ? 500 : 0);

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-extrabold text-white">
          Week {card.week_number} Bingo Card
        </Text>
        <Text className="text-[#666] text-sm mt-1">
          Resets in:{' '}
          <Text className="text-[#FF6B35] font-bold">{formatCountdown(countdown)}</Text>
        </Text>

        {/* XP info strip */}
        <View className="flex-row mt-3 gap-x-3">
          <View className="bg-[#1a1a1a] rounded-lg px-3 py-2 flex-row items-center">
            <Text className="text-[#FFD700] font-bold text-sm">+50 XP</Text>
            <Text className="text-[#666] text-sm ml-1">per row/col/diag</Text>
          </View>
          <View className="bg-[#1a1a1a] rounded-lg px-3 py-2 flex-row items-center">
            <Text className="text-[#FFD700] font-bold text-sm">+500 XP</Text>
            <Text className="text-[#666] text-sm ml-1">full card</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View className="mt-4">
          <Text className="text-[#666] text-xs mb-1">
            {landed.length} / 25 tricks landed
          </Text>
          <View className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <View
              className="h-2 bg-[#FF6B35] rounded-full"
              style={{ width: `${(landed.length / 25) * 100}%` }}
            />
          </View>
        </View>
      </View>

      {/* 5×5 Grid */}
      <View className="px-4">
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} className="flex-row justify-between mb-2">
            {[0, 1, 2, 3, 4].map((col) => {
              const index = row * 5 + col;
              const isLanded = landed.includes(index);
              return (
                <TouchableOpacity
                  key={col}
                  onPress={() => handleCellTap(index)}
                  activeOpacity={0.7}
                  className={`rounded-lg items-center justify-center p-1 ${cellStyle(index)}`}
                  style={{ width: '19%', aspectRatio: 1 }}
                >
                  {isLanded && (
                    <CheckCircle size={14} color="#fff" style={{ marginBottom: 2 }} />
                  )}
                  <Text
                    className="text-white text-center font-semibold"
                    style={{ fontSize: 9 }}
                    numberOfLines={3}
                  >
                    {card.tricks[index]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Total XP earned */}
      {totalXP > 0 && (
        <View className="mx-5 mt-4 bg-[#1a1a1a] rounded-xl p-4 items-center">
          <Text className="text-[#666] text-sm">XP Earned This Week</Text>
          <Text className="text-[#FFD700] text-3xl font-extrabold mt-1">+{totalXP} XP</Text>
        </View>
      )}

      {/* Completed lines summary */}
      {completedLines.length > 0 && (
        <View className="mx-5 mt-3 bg-[#1a1a1a] rounded-xl p-4">
          <Text className="text-white font-bold mb-1">
            {completedLines.length} BINGO{completedLines.length > 1 ? 'S' : ''} completed!
          </Text>
          <Text className="text-[#666] text-sm">
            Keep landing tricks to fill the whole card for the +500 XP bonus.
          </Text>
        </View>
      )}

      {/* Toast */}
      {toastMessage && (
        <View
          className="mx-10 mt-4 bg-[#FF6B35] rounded-2xl p-4 items-center"
          style={{ position: 'absolute', top: 80, left: 40, right: 40 }}
        >
          <Text className="text-white text-xl font-extrabold">{toastMessage}</Text>
        </View>
      )}

      {/* Full-card celebration modal */}
      <Modal
        visible={celebrationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebrationVisible(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-8">
          <View className="bg-[#1a1a1a] rounded-3xl p-8 items-center w-full">
            <Text style={{ fontSize: 48 }}>🛹</Text>
            <Text className="text-[#FFD700] text-4xl font-extrabold mt-2 text-center">
              FULL CARD!
            </Text>
            <Text className="text-white text-lg text-center mt-2">
              You landed every trick this week!
            </Text>
            <View className="mt-4 bg-[#FF6B35] rounded-xl px-6 py-3">
              <Text className="text-white text-2xl font-extrabold">+500 XP BONUS</Text>
            </View>
            <Text className="text-[#666] text-sm mt-4 text-center">
              Come back next Monday for a fresh card.
            </Text>
            <TouchableOpacity
              onPress={() => setCelebrationVisible(false)}
              className="mt-6 bg-[#333] rounded-xl px-8 py-3"
            >
              <Text className="text-white font-bold text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
