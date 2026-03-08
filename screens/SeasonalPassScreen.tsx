import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { Star, Gift, Zap, Lock, CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  day: number;
  reward: string; // e.g. "200 XP" or "Shadow Rider Badge"
  xp?: number;
}

interface SeasonalPass {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  milestones: Milestone[];
}

interface PassProgress {
  id?: string;
  user_id: string;
  pass_id: string;
  current_day: number;
  completed_milestones: number[]; // array of day numbers
}

interface DailyChallenge {
  title: string;
  description: string;
  xp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRemaining(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

function daysElapsed(startDate: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000));
}

/** Derive today's challenge from the current day index (deterministic). */
const DAILY_CHALLENGES: DailyChallenge[] = [
  { title: 'Land 3 Tricks in a Row', description: 'No bails allowed.', xp: 75 },
  { title: 'Film a Line', description: 'Record at least 3 tricks in one run.', xp: 100 },
  { title: 'Visit a New Spot', description: 'Check in at a skatepark you\'ve never logged.', xp: 125 },
  { title: 'Challenge a Crew Member', description: 'Send a callout and get a response.', xp: 80 },
  { title: 'Land Your Hardest Trick', description: 'Log a trick rated Hard or above.', xp: 150 },
  { title: 'Post a Session Clip', description: 'Upload video from today\'s session.', xp: 90 },
  { title: 'Vote on 5 Clips', description: 'Judge other skaters\' submissions.', xp: 50 },
];

function getDailyChallenge(dayIndex: number): DailyChallenge {
  return DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
}

// ─── Pulsing circle for "current" milestone ───────────────────────────────────

function PulsingCircle({ size = 40 }: { size?: number }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FF6B35',
        transform: [{ scale: anim }],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Star size={size * 0.4} color="#fff" fill="#fff" />
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SeasonalPassScreen() {
  const [pass, setPass] = useState<SeasonalPass | null>(null);
  const [progress, setProgress] = useState<PassProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimedToday, setClaimedToday] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const trackRef = useRef<FlatList>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Fetch pass + progress ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: passData } = await supabase
        .from('seasonal_passes')
        .select('*')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .limit(1)
        .single();

      if (!passData) return;
      setPass(passData as SeasonalPass);

      if (userId) {
        const { data: prog } = await supabase
          .from('pass_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('pass_id', passData.id)
          .maybeSingle();

        const elapsed = daysElapsed(passData.start_date);
        const initialProgress: PassProgress = {
          user_id: userId,
          pass_id: passData.id,
          current_day: Math.min(elapsed + 1, 30),
          completed_milestones: [],
        };
        setProgress(prog ?? initialProgress);

        // Check if reward was already claimed today
        if (prog) {
          const today = new Date().toDateString();
          const lastClaimKey = `pass_claimed_${prog.id ?? passData.id}_${today}`;
          // We'll store in-memory; a real impl would persist in Supabase
          setClaimedToday(false);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll to current node once data loads
  useEffect(() => {
    if (pass && progress && trackRef.current) {
      const currentIndex = (progress.current_day ?? 1) - 1;
      setTimeout(() => {
        trackRef.current?.scrollToIndex({ index: Math.max(0, currentIndex - 1), animated: true });
      }, 400);
    }
  }, [pass, progress]);

  // ── Claim daily reward ────────────────────────────────────────────────────
  const handleClaimReward = async () => {
    if (!pass || !progress || !userId || claimedToday) return;
    setClaiming(true);

    const currentDay = progress.current_day;
    const newCompleted = [...new Set([...progress.completed_milestones, currentDay])];
    const updatedProgress: PassProgress = {
      ...progress,
      completed_milestones: newCompleted,
    };

    try {
      if (progress.id) {
        await supabase
          .from('pass_progress')
          .update({ completed_milestones: newCompleted })
          .eq('id', progress.id);
      } else {
        const { data } = await supabase
          .from('pass_progress')
          .insert(updatedProgress)
          .select()
          .single();
        if (data) updatedProgress.id = data.id;
      }
      setProgress(updatedProgress);
      setClaimedToday(true);
    } finally {
      setClaiming(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderMilestoneNode = ({ item, index }: { item: Milestone; index: number }) => {
    if (!progress) return null;
    const completed = progress.completed_milestones.includes(item.day);
    const isCurrent = item.day === progress.current_day;
    const isLocked = item.day > (progress.current_day ?? 0);

    return (
      <View className="items-center" style={{ width: 88 }}>
        {/* Connector line (left) */}
        <View className="flex-row items-center w-full">
          {index > 0 && (
            <View
              className="h-1 flex-1"
              style={{ backgroundColor: completed ? '#FF6B35' : '#333' }}
            />
          )}
          <View className="items-center">
            {isCurrent ? (
              <PulsingCircle size={44} />
            ) : completed ? (
              <View className="w-11 h-11 rounded-full bg-[#FF6B35] items-center justify-center">
                <CheckCircle size={22} color="#fff" />
              </View>
            ) : (
              <View className="w-11 h-11 rounded-full bg-[#222] border border-[#444] items-center justify-center">
                {isLocked ? (
                  <Lock size={18} color="#555" />
                ) : (
                  <Gift size={18} color="#555" />
                )}
              </View>
            )}
          </View>
          {index < 29 && (
            <View
              className="h-1 flex-1"
              style={{ backgroundColor: completed ? '#FF6B35' : '#333' }}
            />
          )}
        </View>

        {/* Day label */}
        <Text
          className="font-bold text-xs mt-1"
          style={{ color: completed ? '#FF6B35' : isCurrent ? '#fff' : '#555' }}
        >
          Day {item.day}
        </Text>

        {/* Reward label */}
        <Text
          className="text-center text-xs mt-0.5 px-1"
          style={{ color: isLocked ? '#444' : '#999', fontSize: 10 }}
          numberOfLines={2}
        >
          {item.reward}
        </Text>
      </View>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  if (!pass) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-8">
        <Text className="text-white text-lg text-center">No active season right now. Check back soon!</Text>
      </View>
    );
  }

  const remaining = daysRemaining(pass.end_date);
  const currentDay = progress?.current_day ?? 1;
  const dailyChallenge = getDailyChallenge(currentDay - 1);
  const milestones: Milestone[] = pass.milestones ?? Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    reward: i === 29 ? 'Season Badge' : `${(i + 1) * 25} XP`,
  }));

  // Final badge milestone
  const finalMilestone = milestones[milestones.length - 1];

  return (
    <ScrollView className="flex-1 bg-[#0a0a0a]" contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Hero header */}
      <View className="px-5 pt-10 pb-6 bg-[#1a1a1a]">
        <View className="flex-row items-center mb-1">
          <Zap size={20} color="#FF6B35" fill="#FF6B35" />
          <Text className="text-[#FF6B35] font-extrabold text-sm ml-1 tracking-widest uppercase">
            Battle Pass
          </Text>
        </View>
        <Text className="text-white text-3xl font-extrabold">{pass.name}</Text>
        <View className="flex-row items-center mt-2 gap-x-4">
          <View className="bg-[#FF6B35]/20 rounded-lg px-3 py-1">
            <Text className="text-[#FF6B35] font-bold text-sm">{remaining}d remaining</Text>
          </View>
          <Text className="text-[#666] text-sm">
            Day{' '}
            <Text className="text-white font-bold">{currentDay}</Text> / 30
          </Text>
        </View>

        {/* Overall progress bar */}
        <View className="mt-4">
          <View className="h-3 bg-[#0a0a0a] rounded-full overflow-hidden">
            <View
              className="h-3 bg-[#FF6B35] rounded-full"
              style={{ width: `${(currentDay / 30) * 100}%` }}
            />
          </View>
        </View>
      </View>

      {/* Today's Challenge */}
      <View className="mx-5 mt-5 bg-[#1a1a1a] rounded-2xl p-4">
        <View className="flex-row items-center mb-2">
          <Star size={16} color="#FFD700" fill="#FFD700" />
          <Text className="text-[#FFD700] font-extrabold text-sm ml-2 tracking-wide">
            TODAY'S CHALLENGE
          </Text>
        </View>
        <Text className="text-white font-extrabold text-lg">{dailyChallenge.title}</Text>
        <Text className="text-[#666] text-sm mt-1">{dailyChallenge.description}</Text>
        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-row items-center">
            <Zap size={14} color="#FFD700" />
            <Text className="text-[#FFD700] font-bold ml-1">+{dailyChallenge.xp} XP</Text>
          </View>
          <TouchableOpacity
            onPress={handleClaimReward}
            disabled={claimedToday || claiming}
            className={`rounded-xl px-5 py-2 ${
              claimedToday ? 'bg-[#333]' : 'bg-[#FF6B35]'
            }`}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-bold text-sm">
                {claimedToday ? 'Claimed Today' : 'Claim Reward'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestone track */}
      <Text className="text-white font-extrabold text-base px-5 mt-6 mb-3">
        30-Day Progress Track
      </Text>
      <FlatList
        ref={trackRef}
        data={milestones}
        keyExtractor={(item) => String(item.day)}
        renderItem={renderMilestoneNode}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
        onScrollToIndexFailed={() => {}}
        style={{ backgroundColor: '#111' }}
      />

      {/* Season badge preview */}
      <View className="mx-5 mt-5 bg-[#1a1a1a] rounded-2xl p-5 items-center">
        <View className="w-20 h-20 rounded-full bg-[#FFD700]/20 border-2 border-[#FFD700] items-center justify-center mb-3">
          <Star size={36} color="#FFD700" fill="#FFD700" />
        </View>
        <Text className="text-[#FFD700] font-extrabold text-lg">Season Finale Badge</Text>
        <Text className="text-[#666] text-sm text-center mt-1">
          Complete all 30 days to unlock: <Text className="text-white font-semibold">{finalMilestone?.reward ?? 'Exclusive Badge'}</Text>
        </Text>
        <View className="mt-3 bg-[#0a0a0a] rounded-xl px-4 py-2">
          <Text className="text-[#666] text-xs text-center">
            {currentDay < 30
              ? `${30 - currentDay} days to go`
              : 'You completed the season!'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
