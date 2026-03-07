import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Trophy,
  Megaphone,
  CalendarDays,
  Flame,
  Zap,
  Star,
  Heart,
  Video,
  ChevronRight,
  Users,
  BookOpen,
  Sunrise,
} from 'lucide-react-native';
import { useChallenges } from '../contexts/ChallengeContext';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';

// XP needed to level up: level * 500
function xpForLevel(level: number) {
  return level * 500;
}

function xpProgress(xp: number, level: number) {
  const base = (level - 1) * 500;
  const cap = level * 500;
  return Math.min((xp - base) / (cap - base), 1);
}

interface QuickAction {
  label: string;
  sub: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
  bg: string;
  screen: string;
  params?: object;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Map',        sub: '27k+ parks',     icon: MapPin,      color: '#d2673d', bg: '#FFF3ED', screen: 'SpotsTab' },
  { label: 'Sessions',   sub: 'Meet up',         icon: CalendarDays,color: '#6B4CE6', bg: '#F3F0FF', screen: 'Sessions' },
  { label: 'Challenges', sub: 'Earn XP',         icon: Trophy,      color: '#F59E0B', bg: '#FFFBEB', screen: 'ChallengesTab' },
  { label: 'Call Outs',  sub: 'Beef settled',    icon: Megaphone,   color: '#EF4444', bg: '#FFF5F5', screen: 'CallOuts' },
];

const EXPLORE_TILES = [
  { label: 'Spot of Day',   icon: Sunrise,   color: '#F59E0B', screen: 'SpotOfTheDay' },
  { label: 'Clip of Week',  icon: Video,     color: '#9B59B6', screen: 'ClipOfWeek' },
  { label: 'Tutorials',     icon: BookOpen,  color: '#16A085', screen: 'TrickTutorials' },
  { label: 'Crew Battles',  icon: Users,     color: '#E74C3C', screen: 'CrewBattles' },
  { label: 'Feed',          icon: Star,      color: '#d2673d', screen: 'Feed' },
  { label: 'Donate XP',     icon: Heart,     color: '#EC4899', screen: 'DonateXP' },
];

export default function HomeScreen({ navigation }: any) {
  const { xp, level, streakDays, challenges, dailyChallenges } = useChallenges();
  const { user } = useAuthStore();
  const [username, setUsername] = useState<string | null>(null);
  const [boardsTotal, setBoardsTotal] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  const completedDaily = dailyChallenges.filter((c: any) => c.completed).length;
  const progress = xpProgress(xp, level);
  const xpToNext = xpForLevel(level) - xp;

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const [profileRes, donationsRes] = await Promise.all([
      supabase.from('profiles').select('username').eq('id', user.id).single(),
      supabase.from('xp_donations').select('xp_amount'),
    ]);
    if (profileRes.data?.username) setUsername(profileRes.data.username);
    if (donationsRes.data) {
      const totalXP = donationsRes.data.reduce((s: number, r: any) => s + (r.xp_amount ?? 0), 0);
      setBoardsTotal(Math.floor(totalXP / 50000));
    }
  }, [user?.id]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  };

  const displayName = username ?? user?.email?.split('@')[0] ?? 'Skater';

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-950">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Header ─────────────────────────────── */}
        <View className="px-5 pt-2 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{greeting()},</Text>
            <Text className="text-3xl font-extrabold text-gray-800 dark:text-gray-50">
              {displayName} 🛹
            </Text>
          </View>
          {streakDays > 0 && (
            <View className="bg-orange-100 dark:bg-orange-900/40 rounded-2xl px-3 py-2 items-center">
              <Flame size={20} color="#F97316" />
              <Text className="text-orange-500 font-bold text-xs mt-0.5">{streakDays}d</Text>
            </View>
          )}
        </View>

        {/* ── XP / Level card ────────────────────── */}
        <View className="mx-4 mb-5 bg-gray-900 dark:bg-gray-800 rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Zap size={16} color="#FBBF24" />
              <Text className="text-yellow-400 font-bold text-sm">Level {level}</Text>
            </View>
            <Text className="text-gray-400 text-xs">{xpToNext.toLocaleString()} XP to next level</Text>
          </View>
          {/* Progress bar */}
          <View className="h-2.5 bg-gray-700 rounded-full overflow-hidden mb-2">
            <View
              className="h-full bg-yellow-400 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-white font-bold">{xp.toLocaleString()} XP</Text>
            <Text className="text-gray-400 text-sm">
              {challenges.filter((c: any) => c.completed).length}/{challenges.length} challenges done
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────── */}
        <Text className="px-5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</Text>
        <View className="flex-row flex-wrap px-3 mb-5">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <TouchableOpacity
                key={a.label}
                className="w-1/2 p-2"
                onPress={() => navigation.navigate(a.screen, a.params)}
                activeOpacity={0.8}
              >
                <View
                  className="rounded-2xl p-4 shadow-sm"
                  style={{ backgroundColor: a.bg }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: a.color + '25' }}
                  >
                    <Icon color={a.color} size={22} />
                  </View>
                  <Text className="text-gray-800 font-bold text-base">{a.label}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{a.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Daily Quests ──────────────────────── */}
        <TouchableOpacity
          className="mx-4 mb-5 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm"
          onPress={() => navigation.navigate('DailyTab')}
          activeOpacity={0.85}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Star size={16} color="#F59E0B" />
              <Text className="text-gray-800 dark:text-gray-100 font-bold">Daily Quests</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-purple-600 font-semibold text-sm">
                {completedDaily}/{dailyChallenges.length}
              </Text>
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </View>

          {/* Mini quest progress bar */}
          <View className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-purple-500 rounded-full"
              style={{ width: dailyChallenges.length ? `${(completedDaily / dailyChallenges.length) * 100}%` : '0%' }}
            />
          </View>

          {dailyChallenges.slice(0, 2).map((q: any) => (
            <View key={q.id} className="flex-row items-center gap-3 mb-1.5">
              <View
                className="w-5 h-5 rounded-full border-2 items-center justify-center"
                style={{ borderColor: q.completed ? '#A78BFA' : '#D1D5DB' }}
              >
                {q.completed && <View className="w-2.5 h-2.5 rounded-full bg-purple-400" />}
              </View>
              <Text
                className="text-sm flex-1"
                style={{ color: q.completed ? '#9CA3AF' : '#374151' }}
                numberOfLines={1}
              >
                {q.title}
              </Text>
              <Text className="text-xs text-purple-500 font-semibold">{q.xp} XP</Text>
            </View>
          ))}
          {dailyChallenges.length > 2 && (
            <Text className="text-xs text-gray-400 mt-1 text-center">
              +{dailyChallenges.length - 2} more quests
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Charity Banner ────────────────────── */}
        <TouchableOpacity
          className="mx-4 mb-5 rounded-2xl overflow-hidden"
          onPress={() => navigation.navigate('DonateXP')}
          activeOpacity={0.88}
        >
          <View className="bg-gradient-to-r from-pink-500 to-rose-500 p-4"
            style={{ backgroundColor: '#EC4899' }}>
            <View className="flex-row items-center gap-3">
              <View className="bg-white/20 rounded-xl p-2">
                <Heart size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-extrabold text-base">
                  {boardsTotal} boards funded 🛹
                </Text>
                <Text className="text-pink-100 text-xs mt-0.5">
                  Community donations helping kids skate — tap to donate XP
                </Text>
              </View>
              <ChevronRight size={18} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Explore ───────────────────────────── */}
        <Text className="px-5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Explore</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          className="mb-2"
        >
          {EXPLORE_TILES.map(tile => {
            const Icon = tile.icon;
            return (
              <TouchableOpacity
                key={tile.label}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm items-center"
                style={{ width: 90 }}
                onPress={() => navigation.navigate(tile.screen)}
                activeOpacity={0.8}
              >
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                  style={{ backgroundColor: tile.color + '20' }}
                >
                  <Icon color={tile.color} size={24} />
                </View>
                <Text className="text-gray-700 dark:text-gray-200 text-xs font-semibold text-center" numberOfLines={2}>
                  {tile.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
