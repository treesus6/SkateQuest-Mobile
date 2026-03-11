import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { MapPin, Trophy, Shield, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConquestSpot {
  conquest_id: string;
  spot_id: string;
  spot_name: string;
  conquerer_id: string;
  conquerer_username: string;
  trick_name: string;
  conquered_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  spot_count: number;
}

type ActiveTab = 'nearby' | 'leaderboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpotConquerScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('nearby');
  const [spots, setSpots] = useState<ConquestSpot[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Claim modal state
  const [claimTarget, setClaimTarget] = useState<ConquestSpot | null>(null);
  const [trickInput, setTrickInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
  }, []);

  // ── Fetch nearby spots ────────────────────────────────────────────────────
  const fetchSpots = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('spot_conquests')
        .select(
          `
          id,
          spot_id,
          user_id,
          trick_name,
          conquered_at,
          spots ( name ),
          profiles ( username )
        `
        )
        .order('conquered_at', { ascending: false })
        .limit(30);

      if (data) {
        const mapped: ConquestSpot[] = data.map((row: any) => ({
          conquest_id: row.id,
          spot_id: row.spot_id,
          spot_name: row.spots?.name ?? 'Unknown Spot',
          conquerer_id: row.user_id,
          conquerer_username: row.profiles?.username ?? 'Unknown Skater',
          trick_name: row.trick_name,
          conquered_at: row.conquered_at,
        }));
        setSpots(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch leaderboard ─────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('spot_conquests')
      .select('user_id, profiles ( username )')
      .limit(200);

    if (!data) return;

    const counts: Record<string, { username: string; count: number }> = {};
    for (const row of data as any[]) {
      const uid = row.user_id;
      if (!counts[uid]) {
        counts[uid] = { username: row.profiles?.username ?? 'Unknown', count: 0 };
      }
      counts[uid].count += 1;
    }

    const sorted: LeaderboardEntry[] = Object.entries(counts)
      .map(([user_id, v]) => ({ user_id, username: v.username, spot_count: v.count }))
      .sort((a, b) => b.spot_count - a.spot_count)
      .slice(0, 20);

    setLeaderboard(sorted);
  }, []);

  useEffect(() => {
    fetchSpots();
    fetchLeaderboard();
  }, [fetchSpots, fetchLeaderboard]);

  // ── Claim submission ──────────────────────────────────────────────────────
  const handleClaimSubmit = async () => {
    if (!claimTarget || !userId || !trickInput.trim()) {
      setClaimError('Enter a trick name to claim this spot.');
      return;
    }
    setClaiming(true);
    setClaimError(null);
    try {
      // Upsert: one conquest per spot (first to land keeps it until reclaimed)
      const { error } = await supabase.from('spot_conquests').upsert(
        {
          spot_id: claimTarget.spot_id,
          user_id: userId,
          trick_name: trickInput.trim(),
          conquered_at: new Date().toISOString(),
        },
        { onConflict: 'spot_id' }
      );
      if (error) {
        setClaimError(error.message);
      } else {
        setClaimTarget(null);
        setTrickInput('');
        await fetchSpots();
        await fetchLeaderboard();
      }
    } finally {
      setClaiming(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderSpotCard = ({ item }: { item: ConquestSpot }) => {
    const isOwner = item.conquerer_id === userId;
    return (
      <View className="bg-[#1a1a1a] rounded-2xl p-4 mb-3 mx-5">
        {/* Top row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <MapPin size={16} color="#FF6B35" />
            <Text className="text-white font-bold text-base ml-2 flex-1" numberOfLines={1}>
              {item.spot_name}
            </Text>
          </View>
          {isOwner && (
            <View className="bg-[#FF6B35] rounded-full px-3 py-1 flex-row items-center ml-2">
              <Shield size={12} color="#fff" />
              <Text className="text-white text-xs font-bold ml-1">Your Territory</Text>
            </View>
          )}
        </View>

        {/* Conquerer info */}
        <View className="flex-row items-center mb-3">
          <View className="bg-[#FF6B35]/20 rounded-full w-8 h-8 items-center justify-center mr-3">
            <Text className="text-[#FF6B35] font-extrabold text-sm">
              {item.conquerer_username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-white font-semibold text-sm">{item.conquerer_username}</Text>
            <Text className="text-[#666] text-xs">
              Landed <Text className="text-[#FF6B35]">{item.trick_name}</Text> ·{' '}
              {timeAgo(item.conquered_at)}
            </Text>
          </View>
        </View>

        {/* Claim button — shown to others or for reclaiming */}
        {!isOwner && (
          <TouchableOpacity
            onPress={() => {
              setClaimTarget(item);
              setTrickInput('');
              setClaimError(null);
            }}
            className="bg-[#FF6B35] rounded-xl py-2 items-center"
          >
            <Text className="text-white font-bold text-sm">Claim This Spot</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderLeaderRow = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    const isMe = item.user_id === userId;
    return (
      <View
        className={`flex-row items-center mx-5 mb-2 rounded-xl p-3 ${
          isMe ? 'bg-[#FF6B35]/20 border border-[#FF6B35]/40' : 'bg-[#1a1a1a]'
        }`}
      >
        <Text className="text-[#666] font-bold w-8 text-sm">
          {medal ?? `#${index + 1}`}
        </Text>
        <View className="bg-[#333] rounded-full w-9 h-9 items-center justify-center mr-3">
          <Text className="text-white font-extrabold text-sm">
            {item.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-white font-semibold flex-1">{item.username}</Text>
        <View className="flex-row items-center">
          <MapPin size={14} color="#FF6B35" />
          <Text className="text-[#FF6B35] font-extrabold ml-1">{item.spot_count}</Text>
          <Text className="text-[#666] text-xs ml-1">spots</Text>
        </View>
      </View>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      {/* Header */}
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-extrabold text-white">Spot Conquest</Text>
        <Text className="text-[#666] text-sm mt-1">
          Land a trick to claim a spot as your territory.
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-5 mb-4 bg-[#1a1a1a] rounded-xl p-1">
        {(['nearby', 'leaderboard'] as ActiveTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab ? 'bg-[#FF6B35]' : ''
            }`}
          >
            <Text
              className={`font-bold text-sm capitalize ${
                activeTab === tab ? 'text-white' : 'text-[#666]'
              }`}
            >
              {tab === 'nearby' ? 'Nearby Spots' : 'Leaderboard'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : activeTab === 'nearby' ? (
        <FlatList
          data={spots}
          keyExtractor={(item) => item.conquest_id}
          renderItem={renderSpotCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <MapPin size={48} color="#333" />
              <Text className="text-[#666] mt-4 text-center px-8">
                No conquered spots yet. Be the first to claim one!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.user_id}
          renderItem={renderLeaderRow}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View className="flex-row items-center mx-5 mb-3">
              <Trophy size={18} color="#FFD700" />
              <Text className="text-white font-bold ml-2">Top Spot Conquerors</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Trophy size={48} color="#333" />
              <Text className="text-[#666] mt-4">No conquerors yet.</Text>
            </View>
          }
        />
      )}

      {/* Claim Modal */}
      <Modal
        visible={!!claimTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimTarget(null)}
      >
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#1a1a1a] rounded-t-3xl px-6 pt-6 pb-10">
            {/* Close */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-xl font-extrabold">Claim This Spot</Text>
              <TouchableOpacity onPress={() => setClaimTarget(null)}>
                <X size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {claimTarget && (
              <View className="bg-[#0a0a0a] rounded-xl p-3 mb-4">
                <Text className="text-[#666] text-xs mb-1">Spot</Text>
                <Text className="text-white font-bold">{claimTarget.spot_name}</Text>
                <Text className="text-[#666] text-xs mt-2">Current holder</Text>
                <Text className="text-[#FF6B35] font-semibold">
                  {claimTarget.conquerer_username} — {claimTarget.trick_name}
                </Text>
              </View>
            )}

            <Text className="text-[#666] text-sm mb-2">
              What trick did you land to claim this spot?
            </Text>
            <TextInput
              value={trickInput}
              onChangeText={setTrickInput}
              placeholder="e.g. Kickflip, Heelflip, 360 flip…"
              placeholderTextColor="#444"
              className="bg-[#0a0a0a] text-white rounded-xl px-4 py-3 text-base border border-[#333] mb-3"
            />

            {claimError && (
              <Text className="text-red-400 text-sm mb-3">{claimError}</Text>
            )}

            <TouchableOpacity
              onPress={handleClaimSubmit}
              disabled={claiming || !trickInput.trim()}
              className={`rounded-xl py-4 items-center ${
                claiming || !trickInput.trim() ? 'bg-[#333]' : 'bg-[#FF6B35]'
              }`}
            >
              {claiming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-extrabold text-base">Claim Territory</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
