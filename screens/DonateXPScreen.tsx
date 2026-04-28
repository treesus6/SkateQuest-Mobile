import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Heart, Gift, DollarSign, ChevronRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const XP_PER_DOLLAR = 1000;
const COST_PER_BOARD_USD = 50;
const PRESET_AMOUNTS = [1000, 2500, 5000, 10000] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DonationRecord {
  id: string;
  user_id: string;
  xp_amount: number;
  usd_value: number;
  created_at: string;
  username: string;
}

interface UserProfile {
  id: string;
  xp: number;
  username: string;
  total_xp_donated: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xpToUsd(xp: number): number {
  return xp / XP_PER_DOLLAR;
}

function xpToBoards(xp: number): number {
  return xpToUsd(xp) / COST_PER_BOARD_USD;
}


function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={{ borderColor: color + '33', backgroundColor: color + '11' }}
      className="flex-1 items-center rounded-xl p-3 border"
    >
      {icon}
      <Text style={{ color }} className="text-lg font-black mt-1">
        {value}
      </Text>
      <Text className="text-neutral-500 text-xs text-center mt-0.5">{label}</Text>
    </View>
  );
}

function ConfirmModal({
  visible,
  xpAmount,
  userXp,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  xpAmount: number;
  userXp: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const usd = xpToUsd(xpAmount).toFixed(2);
  const remaining = userXp - xpAmount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center items-center bg-black/80 px-6">
        <View className="bg-[#1a1a1a] rounded-2xl p-6 w-full border border-green-500/30">
          <View className="items-center mb-5">
            <View className="bg-green-500/20 rounded-full p-4 mb-3">
              <Heart size={32} color="#4CAF50" fill="#4CAF50" />
            </View>
            <Text className="text-white text-xl font-black">Confirm Donation</Text>
            <Text className="text-neutral-400 text-sm mt-1 text-center">
              Every board changes a kid's life
            </Text>
          </View>

          <View className="bg-neutral-900 rounded-xl p-4 gap-2 mb-5">
            <View className="flex-row justify-between">
              <Text className="text-neutral-400 text-sm">XP donated</Text>
              <Text className="text-orange-400 font-bold text-sm">
                -{xpAmount.toLocaleString()} XP
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-neutral-400 text-sm">USD value</Text>
              <Text className="text-green-400 font-bold text-sm">${usd}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-neutral-400 text-sm">Boards funded</Text>
              <Text className="text-yellow-400 font-bold text-sm">
                {xpToBoards(xpAmount) >= 0.01 ? xpToBoards(xpAmount).toFixed(2) : '<0.01'} 🛹
              </Text>
            </View>
            <View className="h-px bg-neutral-700 my-1" />
            <View className="flex-row justify-between">
              <Text className="text-neutral-400 text-sm">Remaining XP</Text>
              <Text className="text-white font-bold text-sm">
                {remaining.toLocaleString()} XP
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 border border-neutral-600 rounded-xl py-3 items-center"
            >
              <Text className="text-neutral-300 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Gift size={18} color="#fff" />
              )}
              <Text className="text-white font-bold">Donate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DonationRow({ item }: { item: DonationRecord }) {
  const boards = xpToBoards(item.xp_amount);
  return (
    <View className="flex-row items-center bg-[#1a1a1a] rounded-xl px-4 py-3 mb-2 border border-neutral-800">
      <View className="bg-green-500/20 rounded-full p-2 mr-3">
        <Heart size={16} color="#4CAF50" fill="#4CAF50" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-semibold text-sm">@{item.username}</Text>
        <Text className="text-neutral-500 text-xs mt-0.5">
          {timeAgo(item.created_at)}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-orange-400 font-bold text-sm">
          {item.xp_amount.toLocaleString()} XP
        </Text>
        <Text className="text-green-400 text-xs">
          {boards >= 1
            ? `${boards.toFixed(boards % 1 === 0 ? 0 : 2)} board${boards !== 1 ? 's' : ''}`
            : `$${xpToUsd(item.xp_amount).toFixed(2)}`}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DonateXPScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedXp, setSelectedXp] = useState<number>(1000);
  const [recentDonations, setRecentDonations] = useState<DonationRecord[]>([]);
  const [totalDonated, setTotalDonated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return;

    const [{ data: prof }, { data: donations }, { data: totals }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, xp, username, total_xp_donated')
          .eq('id', userId)
          .single(),
        supabase
          .from('xp_donations')
          .select('id, user_id, xp_amount, usd_value, created_at, profile:user_id(username)')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('xp_donations')
          .select('xp_amount')
          .limit(10000),
      ]);

    if (prof) {
      setProfile({
        id: prof.id,
        xp: prof.xp ?? 0,
        username: prof.username ?? 'You',
        total_xp_donated: prof.total_xp_donated ?? 0,
      });
    }

    if (donations) {
      setRecentDonations(
        (donations as any[]).map((d) => ({
          id: d.id,
          user_id: d.user_id,
          xp_amount: d.xp_amount,
          usd_value: d.usd_value ?? xpToUsd(d.xp_amount),
          created_at: d.created_at,
          username: d.profile?.username ?? 'Anonymous',
        }))
      );
    }

    if (totals) {
      const total = (totals as any[]).reduce((sum, d) => sum + (d.xp_amount ?? 0), 0);
      setTotalDonated(total);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleDonate = useCallback(async () => {
    if (!profile || donating) return;
    if (profile.xp < selectedXp) return;
    setDonating(true);

    try {
      const usdValue = xpToUsd(selectedXp);

      const { error: donationError } = await supabase.from('xp_donations').insert({
        user_id: profile.id,
        xp_amount: selectedXp,
        usd_value: usdValue,
      });

      if (donationError) throw donationError;

      const { error: xpError } = await supabase
        .from('profiles')
        .update({
          xp: profile.xp - selectedXp,
          total_xp_donated: (profile.total_xp_donated ?? 0) + selectedXp,
        })
        .eq('id', profile.id);

      if (xpError) throw xpError;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              xp: prev.xp - selectedXp,
              total_xp_donated: prev.total_xp_donated + selectedXp,
            }
          : prev
      );

      setTotalDonated((prev) => prev + selectedXp);
      setModalVisible(false);
      setSuccessMsg(
        `You donated ${selectedXp.toLocaleString()} XP! Thank you for changing a kid's life.`
      );
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      console.error('Donation error:', err?.message ?? err);
    } finally {
      setDonating(false);
    }
  }, [profile, donating, selectedXp, fetchData]);

  const totalBoardsFunded = Math.floor(xpToBoards(totalDonated));
  const myBoardsFunded = profile ? xpToBoards(profile.total_xp_donated) : 0;
  const canDonate = profile && profile.xp >= selectedXp;

  if (loading) {
    return (
      <View className="flex-1 bg-[#0a0a0a] items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-neutral-400 mt-3">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0a0a0a]"
      contentContainerClassName="pb-10"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
      }
    >
      {/* ── Header ── */}
      <View className="px-4 pt-6 pb-4 border-b border-neutral-800">
        <Text className="text-green-400 text-xs font-bold tracking-widest uppercase">
          Give Back
        </Text>
        <Text className="text-white text-3xl font-black mt-1">Donate XP</Text>
        <Text className="text-neutral-400 text-sm mt-1">
          Every board changes a kid's life.
        </Text>
      </View>

      {/* ── Success Banner ── */}
      {successMsg.length > 0 && (
        <View className="mx-4 mt-4 bg-green-600/20 border border-green-500/40 rounded-xl px-4 py-3 flex-row items-center gap-2">
          <Heart size={18} color="#4CAF50" fill="#4CAF50" />
          <Text className="text-green-300 text-sm flex-1">{successMsg}</Text>
        </View>
      )}

      {/* ── XP Balance ── */}
      <View className="mx-4 mt-5 bg-[#1a1a1a] rounded-2xl p-5 border border-neutral-800 items-center">
        <Text className="text-neutral-400 text-sm uppercase tracking-widest font-bold">
          Your XP Balance
        </Text>
        <Text className="text-orange-400 text-5xl font-black mt-2">
          {(profile?.xp ?? 0).toLocaleString()}
        </Text>
        <Text className="text-neutral-500 text-sm mt-1">XP</Text>
      </View>

      {/* ── Stats Row ── */}
      <View className="flex-row mx-4 mt-4 gap-3">
        <StatPill
          icon={<Gift size={20} color="#4CAF50" />}
          label="Boards Funded"
          value={totalBoardsFunded.toString()}
          color="#4CAF50"
        />
        <StatPill
          icon={<DollarSign size={20} color="#FF6B35" />}
          label="USD Raised"
          value={`$${xpToUsd(totalDonated).toFixed(0)}`}
          color="#FF6B35"
        />
        <StatPill
          icon={<Heart size={20} color="#e91e8c" />}
          label="Your Boards"
          value={myBoardsFunded >= 1 ? myBoardsFunded.toFixed(0) : `${(myBoardsFunded * 100).toFixed(0)}%`}
          color="#e91e8c"
        />
      </View>

      {/* ── Conversion Rate ── */}
      <View className="mx-4 mt-5 flex-row items-center bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 gap-3">
        <DollarSign size={18} color="#4CAF50" />
        <Text className="text-green-300 text-sm flex-1">
          <Text className="font-bold">1,000 XP = $1</Text> toward a skateboard for a kid in need
        </Text>
      </View>

      {/* ── Preset Amounts ── */}
      <View className="mx-4 mt-5">
        <Text className="text-white font-bold text-base mb-3">Select Amount</Text>
        <View className="flex-row flex-wrap gap-3">
          {PRESET_AMOUNTS.map((amount) => {
            const selected = selectedXp === amount;
            const affordable = (profile?.xp ?? 0) >= amount;
            return (
              <TouchableOpacity
                key={amount}
                onPress={() => setSelectedXp(amount)}
                disabled={!affordable}
                className={`flex-1 min-w-[40%] rounded-xl p-4 border items-center ${
                  !affordable
                    ? 'bg-neutral-900 border-neutral-800 opacity-40'
                    : selected
                    ? 'bg-green-600 border-green-500'
                    : 'bg-[#1a1a1a] border-neutral-700'
                }`}
              >
                <Text
                  className={`text-lg font-black ${
                    selected ? 'text-white' : affordable ? 'text-orange-400' : 'text-neutral-500'
                  }`}
                >
                  {amount.toLocaleString()}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${selected ? 'text-green-100' : 'text-neutral-500'}`}
                >
                  XP
                </Text>
                <Text
                  className={`text-xs mt-1 font-semibold ${
                    selected ? 'text-green-200' : 'text-neutral-500'
                  }`}
                >
                  ${xpToUsd(amount).toFixed(0)} •{' '}
                  {xpToBoards(amount) >= 0.1
                    ? `${xpToBoards(amount).toFixed(2)} boards`
                    : `${(xpToBoards(amount) * 100).toFixed(0)}% of board`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Mission Statement ── */}
      <View className="mx-4 mt-5 bg-[#1a1a1a] rounded-2xl p-5 border border-green-500/20">
        <View className="flex-row items-center gap-2 mb-2">
          <Heart size={18} color="#4CAF50" fill="#4CAF50" />
          <Text className="text-green-400 font-bold text-sm uppercase tracking-wider">
            Our Mission
          </Text>
        </View>
        <Text className="text-neutral-300 text-sm leading-6">
          Every board changes a kid's life. SkateQuest donates 100% of XP
          conversion proceeds to get skateboards into the hands of kids who
          can't afford them. Skate for good.
        </Text>
      </View>

      {/* ── Donate Button ── */}
      <View className="mx-4 mt-5">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          disabled={!canDonate}
          className={`rounded-2xl py-4 flex-row items-center justify-center gap-3 ${
            canDonate ? 'bg-green-600' : 'bg-neutral-800'
          }`}
        >
          <Gift size={22} color={canDonate ? '#fff' : '#555'} />
          <Text
            className={`text-base font-bold ${canDonate ? 'text-white' : 'text-neutral-500'}`}
          >
            Donate {selectedXp.toLocaleString()} XP
          </Text>
          {canDonate && <ChevronRight size={18} color="#fff" />}
        </TouchableOpacity>
        {!canDonate && (
          <Text className="text-neutral-500 text-xs text-center mt-2">
            You need {(selectedXp - (profile?.xp ?? 0)).toLocaleString()} more XP to donate this amount
          </Text>
        )}
      </View>

      {/* ── Recent Donations Feed ── */}
      <View className="mx-4 mt-6">
        <Text className="text-white font-bold text-base mb-3">
          Recent Donations
        </Text>
        {recentDonations.length === 0 ? (
          <View className="items-center py-8">
            <Heart size={36} color="#333" />
            <Text className="text-neutral-500 text-sm mt-2">
              No donations yet. Be the first!
            </Text>
          </View>
        ) : (
          recentDonations.map((d) => <DonationRow key={d.id} item={d} />)
        )}
      </View>

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        visible={modalVisible}
        xpAmount={selectedXp}
        userXp={profile?.xp ?? 0}
        onConfirm={handleDonate}
        onCancel={() => setModalVisible(false)}
        loading={donating}
      />
    </ScrollView>
  );
}
