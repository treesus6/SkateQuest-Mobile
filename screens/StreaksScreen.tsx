import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Flame, AlertTriangle, Trophy, Calendar } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StreakData {
  id?: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  xp_at_risk: number;
}

interface StreakHistoryEntry {
  id: string;
  user_id: string;
  streak_length: number;
  xp_lost: number;
  ended_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the date string for a given offset from today (0 = today, -1 = yesterday, etc.) */
function offsetDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toDateString();
}

/** Check if a date string represents today */
function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

/** Check if a date string represents yesterday */
function isYesterday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(dateStr).toDateString() === yesterday.toDateString();
}

/** Returns true if the streak is still alive (logged today or yesterday) */
function isStreakAlive(lastActiveDate: string | null): boolean {
  return isToday(lastActiveDate) || isYesterday(lastActiveDate);
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Get short weekday label for an offset */
function weekdayLabel(offset: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date(offsetDate(offset)).getDay()
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StreaksScreen() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [history, setHistory] = useState<StreakHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Fetch streak data ─────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [{ data: streakData }, { data: historyData }] = await Promise.all([
        supabase.from('streaks').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('streak_history')
          .select('*')
          .eq('user_id', userId)
          .order('ended_at', { ascending: false })
          .limit(10),
      ]);

      if (streakData) {
        setStreak(streakData as StreakData);
      } else {
        // Default empty streak for new user
        setStreak({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          last_active_date: null,
          xp_at_risk: 0,
        });
      }

      setHistory((historyData ?? []) as StreakHistoryEntry[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Log activity ──────────────────────────────────────────────────────────
  const handleLogActivity = async () => {
    if (!userId || !streak || logging) return;
    if (isToday(streak.last_active_date)) return; // already logged

    setLogging(true);
    try {
      const today = new Date().toISOString();

      let newStreak = streak.current_streak;
      // If last active was yesterday, extend streak; otherwise start fresh
      if (isYesterday(streak.last_active_date) || streak.current_streak === 0) {
        newStreak = streak.current_streak + 1;
      } else if (!isToday(streak.last_active_date)) {
        // Streak broken before we log — save to history then reset
        if (streak.current_streak > 0) {
          await supabase.from('streak_history').insert({
            user_id: userId,
            streak_length: streak.current_streak,
            xp_lost: streak.xp_at_risk,
            ended_at: streak.last_active_date ?? today,
          });
        }
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, streak.longest_streak);
      const newXpAtRisk = newStreak * 5;

      const updatedStreak: StreakData = {
        ...streak,
        current_streak: newStreak,
        longest_streak: newLongest,
        last_active_date: today,
        xp_at_risk: newXpAtRisk,
      };

      if (streak.id) {
        await supabase
          .from('streaks')
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_active_date: today,
            xp_at_risk: newXpAtRisk,
          })
          .eq('id', streak.id);
      } else {
        const { data } = await supabase
          .from('streaks')
          .insert(updatedStreak)
          .select()
          .single();
        if (data) updatedStreak.id = data.id;
      }

      setStreak(updatedStreak);
      await fetchData();
    } finally {
      setLogging(false);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const loggedToday = isToday(streak?.last_active_date ?? null);
  const alive = isStreakAlive(streak?.last_active_date ?? null);
  const xpAtRisk = streak ? streak.current_streak * 5 : 0;

  /**
   * Build 7-day calendar grid: offsets -6 … 0 (oldest → today).
   * A day is "active" if last_active_date covers that day, OR if the streak
   * spans far enough back (approximation — a real impl would store daily logs).
   */
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const offset = i - 6; // -6 … 0
    const dateStr = offsetDate(offset);
    // Rough heuristic: within the current streak window
    const daysAgo = -offset;
    const active =
      streak != null &&
      alive &&
      daysAgo < streak.current_streak &&
      streak.last_active_date != null;
    const isCurrentDay = offset === 0;
    return { dateStr, active, isCurrentDay, label: weekdayLabel(offset) };
  });

  // ─── Main render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]" contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Header */}
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-extrabold text-white">Streak Tracker</Text>
        <Text className="text-[#666] text-sm mt-1">Keep skating every day. Stakes are real.</Text>
      </View>

      {/* Big streak number */}
      <View className="mx-5 bg-[#1a1a1a] rounded-3xl p-8 items-center mb-4">
        <Flame
          size={56}
          color={alive ? '#FF6B35' : '#444'}
          fill={alive ? '#FF6B35' : '#333'}
        />
        <Text
          className="font-extrabold mt-2"
          style={{ fontSize: 72, color: alive ? '#FF6B35' : '#444', lineHeight: 80 }}
        >
          {streak?.current_streak ?? 0}
        </Text>
        <Text className="text-white text-xl font-extrabold tracking-widest">
          {alive
            ? streak?.current_streak === 1
              ? 'DAY STREAK'
              : 'DAYS'
            : 'STREAK BROKEN'}
        </Text>
        {!alive && streak && streak.current_streak === 0 && (
          <Text className="text-[#666] text-sm mt-2 text-center">
            Start logging sessions to build your streak!
          </Text>
        )}
      </View>

      {/* 7-day calendar */}
      <View className="mx-5 bg-[#1a1a1a] rounded-2xl p-4 mb-4">
        <View className="flex-row items-center mb-3">
          <Calendar size={16} color="#FF6B35" />
          <Text className="text-white font-bold ml-2">This Week</Text>
        </View>
        <View className="flex-row justify-between">
          {calendarDays.map((day, i) => (
            <View key={i} className="items-center">
              <Text className="text-[#666] text-xs mb-2">{day.label}</Text>
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  day.active
                    ? 'bg-[#FF6B35]'
                    : day.isCurrentDay
                    ? 'border-2 border-[#FF6B35] bg-transparent'
                    : 'bg-[#222]'
                }`}
              >
                {day.active ? (
                  <Flame size={16} color="#fff" fill="#fff" />
                ) : (
                  <View className="w-2 h-2 rounded-full bg-[#444]" />
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* XP at risk warning */}
      {streak && streak.current_streak > 0 && !loggedToday && (
        <View className="mx-5 bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-2xl p-4 mb-4 flex-row items-start">
          <AlertTriangle size={20} color="#FFD700" style={{ marginTop: 2 }} />
          <View className="ml-3 flex-1">
            <Text className="text-[#FFD700] font-extrabold text-sm">XP AT RISK</Text>
            <Text className="text-white text-sm mt-1">
              Miss today and lose{' '}
              <Text className="text-[#FFD700] font-extrabold">{xpAtRisk} XP</Text> — your{' '}
              {streak.current_streak}-day streak disappears.
            </Text>
            <Text className="text-[#666] text-xs mt-1">
              Scales with streak: 5 XP × {streak.current_streak} days
            </Text>
          </View>
        </View>
      )}

      {/* Log activity button */}
      <View className="mx-5 mb-6">
        <TouchableOpacity
          onPress={handleLogActivity}
          disabled={loggedToday || logging}
          className={`rounded-2xl py-5 items-center ${
            loggedToday ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-[#FF6B35]'
          }`}
        >
          {logging ? (
            <ActivityIndicator color="#fff" />
          ) : loggedToday ? (
            <View className="flex-row items-center">
              <Flame size={20} color="#FF6B35" fill="#FF6B35" />
              <Text className="text-[#FF6B35] font-extrabold text-base ml-2">
                Streak Maintained Today!
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <Flame size={20} color="#fff" fill="#fff" />
              <Text className="text-white font-extrabold text-base ml-2">
                Log Activity Today
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Longest streak record */}
      {streak && streak.longest_streak > 0 && (
        <View className="mx-5 bg-[#1a1a1a] rounded-2xl p-4 mb-4 flex-row items-center">
          <View className="bg-[#FFD700]/20 rounded-full w-12 h-12 items-center justify-center mr-4">
            <Trophy size={24} color="#FFD700" fill="#FFD700" />
          </View>
          <View>
            <Text className="text-[#666] text-xs">Personal Best</Text>
            <Text className="text-white font-extrabold text-2xl">
              {streak.longest_streak} days
            </Text>
            <Text className="text-[#666] text-xs">longest streak ever</Text>
          </View>
        </View>
      )}

      {/* Recent streak history */}
      {history.length > 0 && (
        <View className="mx-5">
          <Text className="text-white font-bold mb-3">Lost Streaks</Text>
          {history.map((entry) => (
            <View
              key={entry.id}
              className="bg-[#1a1a1a] rounded-xl p-4 mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-full bg-[#333] items-center justify-center mr-3">
                  <Flame size={18} color="#555" />
                </View>
                <View>
                  <Text className="text-white font-semibold">
                    {entry.streak_length} day streak
                  </Text>
                  <Text className="text-[#666] text-xs">
                    Ended {shortDate(entry.ended_at)}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-red-400 font-bold text-sm">
                  -{entry.xp_lost} XP
                </Text>
                <Text className="text-[#666] text-xs">lost</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
