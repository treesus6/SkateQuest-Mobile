/**
 * XPRewardsScreen.tsx
 * Users can browse shop deals and redeem their earned XP for real-world
 * discount codes at local skate shops. Uses the existing shop_deals table
 * and redeem_shop_deal() Supabase RPC.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Gift,
  Zap,
  Store,
  CheckCircle,
  Copy,
  Clock,
  Star,
  Lock,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { shopsService } from '../lib/shopsService';

interface ShopDeal {
  id: string;
  shop_id: string;
  title: string;
  description: string;
  xp_cost: number;
  active: boolean;
  created_at: string;
  shop?: {
    id: string;
    name: string;
    address: string;
  };
}

interface Redemption {
  id: string;
  deal_id: string;
  redemption_code: string;
  redeemed_at: string;
  expires_at: string;
  used: boolean;
  deal?: { title: string; shop?: { name: string } };
}

function XpBar({ userXp }: { userXp: number }) {
  const level = Math.floor(userXp / 1000) + 1;
  const xpInLevel = userXp % 1000;
  const progress = xpInLevel / 1000;

  return (
    <View className="bg-brand-terracotta p-4 rounded-b-2xl">
      <Text className="text-2xl font-bold text-white mb-0.5">XP Rewards</Text>
      <Text className="text-white/70 text-xs mb-3">Earn XP skating → redeem for real rewards</Text>

      <View className="bg-white/20 rounded-2xl p-3 flex-row items-center gap-3">
        <View className="bg-white/30 rounded-full w-12 h-12 items-center justify-center">
          <Zap size={22} color="#fff" fill="#fff" />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between mb-1">
            <Text className="text-white font-bold text-base">{userXp.toLocaleString()} XP</Text>
            <Text className="text-white/70 text-xs">Level {level}</Text>
          </View>
          <View className="bg-white/30 rounded-full h-2">
            <View
              className="bg-white rounded-full h-2"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </View>
          <Text className="text-white/60 text-xs mt-1">{xpInLevel}/1000 XP to Level {level + 1}</Text>
        </View>
      </View>
    </View>
  );
}

function DealCard({
  deal,
  userXp,
  onRedeem,
}: {
  deal: ShopDeal;
  userXp: number;
  onRedeem: (deal: ShopDeal) => void;
}) {
  const canAfford = userXp >= deal.xp_cost;
  const discount = deal.title.match(/(\d+%)/)?.[1] || null;

  return (
    <View className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 shadow-sm border ${canAfford ? 'border-brand-green/30' : 'border-gray-200 dark:border-gray-700'}`}>
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Store size={13} color="#d2673d" />
            <Text className="text-xs text-brand-terracotta font-semibold">
              {deal.shop?.name || 'Local Skate Shop'}
            </Text>
          </View>
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100">{deal.title}</Text>
          {deal.description ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{deal.description}</Text>
          ) : null}
        </View>
        {discount && (
          <View className="bg-brand-green rounded-xl px-2.5 py-1.5 items-center">
            <Text className="text-white font-black text-lg leading-none">{discount}</Text>
            <Text className="text-white/80 text-[10px]">OFF</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center gap-1.5">
          <Zap size={14} color={canAfford ? '#4CAF50' : '#9CA3AF'} />
          <Text className={`font-bold text-sm ${canAfford ? 'text-brand-green' : 'text-gray-400'}`}>
            {deal.xp_cost.toLocaleString()} XP
          </Text>
          {!canAfford && (
            <Text className="text-xs text-gray-400">
              (need {(deal.xp_cost - userXp).toLocaleString()} more)
            </Text>
          )}
        </View>

        <TouchableOpacity
          className={`flex-row items-center gap-1.5 px-4 py-2 rounded-xl ${canAfford ? 'bg-brand-terracotta' : 'bg-gray-200 dark:bg-gray-700'}`}
          onPress={() => canAfford && onRedeem(deal)}
          disabled={!canAfford}
        >
          {canAfford ? (
            <>
              <Gift size={14} color="#fff" />
              <Text className="text-white font-bold text-sm">Redeem</Text>
            </>
          ) : (
            <>
              <Lock size={14} color="#9CA3AF" />
              <Text className="text-gray-400 font-bold text-sm">Locked</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RedemptionCodeModal({
  visible,
  code,
  expiresAt,
  dealTitle,
  shopName,
  onClose,
}: {
  visible: boolean;
  code: string;
  expiresAt: string;
  dealTitle: string;
  shopName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const expiresDate = new Date(expiresAt).toLocaleString();

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm">
          <View className="items-center mb-5">
            <View className="bg-brand-green/10 rounded-full p-4 mb-3">
              <CheckCircle size={36} color="#4CAF50" />
            </View>
            <Text className="text-xl font-black text-gray-800 dark:text-gray-100 text-center">
              Deal Unlocked!
            </Text>
            <Text className="text-sm text-gray-500 text-center mt-1">
              {dealTitle} at {shopName}
            </Text>
          </View>

          {/* Code Display */}
          <View className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 mb-4 items-center">
            <Text className="text-xs text-gray-400 uppercase tracking-widest mb-2">Your Code</Text>
            <Text className="text-3xl font-black text-brand-terracotta tracking-widest mb-3">
              {code}
            </Text>
            <TouchableOpacity
              className={`flex-row items-center gap-2 px-4 py-2 rounded-xl ${copied ? 'bg-brand-green' : 'bg-gray-200 dark:bg-gray-600'}`}
              onPress={copyCode}
            >
              {copied ? (
                <>
                  <CheckCircle size={14} color="#fff" />
                  <Text className="text-white font-bold text-sm">Copied!</Text>
                </>
              ) : (
                <>
                  <Copy size={14} color="#555" />
                  <Text className="text-gray-600 dark:text-gray-200 font-bold text-sm">Copy Code</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 mb-5">
            <Clock size={13} color="#F59E0B" />
            <Text className="text-xs text-amber-700 dark:text-amber-400 flex-1">
              Show this code at the shop. Expires: {expiresDate}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-brand-terracotta py-3 rounded-xl items-center"
            onPress={onClose}
          >
            <Text className="text-white font-bold">Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function XPRewardsScreen() {
  const { user } = useAuthStore();
  const [userXp, setUserXp] = useState(0);
  const [deals, setDeals] = useState<ShopDeal[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'deals' | 'mine'>('deals');
  const [redeeming, setRedeeming] = useState(false);
  const [codeModal, setCodeModal] = useState<{
    visible: boolean;
    code: string;
    expiresAt: string;
    dealTitle: string;
    shopName: string;
  }>({ visible: false, code: '', expiresAt: '', dealTitle: '', shopName: '' });

  const loadData = async () => {
    if (!user) return;
    try {
      // Load user XP
      const { data: profile } = await profilesService.getById(user.id);
      if (profile) setUserXp(profile.xp || 0);

      // Load active deals with shop info
      const { data: dealsData } = await supabase
        .from('shop_deals')
        .select('*, shop:skate_shops(id, name, address)')
        .eq('active', true)
        .order('xp_cost', { ascending: true });
      setDeals(dealsData || []);

      // Load user's past redemptions
      const { data: redemptionsData } = await supabase
        .from('deal_redemptions')
        .select('*, deal:shop_deals(title, shop:skate_shops(name))')
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false })
        .limit(20);
      setMyRedemptions(redemptionsData || []);
    } catch (err) {
      console.error('XPRewardsScreen load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const handleRedeem = async (deal: ShopDeal) => {
    if (!user) return;
    Alert.alert(
      'Redeem Deal',
      `Spend ${deal.xp_cost.toLocaleString()} XP for "${deal.title}"?\n\nYou'll receive a discount code valid for 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeeming(true);
            try {
              const { data, error } = await shopsService.redeemDeal(user.id, deal.id);
              if (error) throw new Error(error.message || 'Redemption failed');

              const result = Array.isArray(data) ? data[0] : data;
              setUserXp(prev => prev - deal.xp_cost);
              setCodeModal({
                visible: true,
                code: result.code,
                expiresAt: result.expires_at,
                dealTitle: deal.title,
                shopName: deal.shop?.name || 'Local Shop',
              });
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not redeem deal. Try again.');
            } finally {
              setRedeeming(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <XpBar userXp={userXp} />

      {/* Tabs */}
      <View className="flex-row mx-4 mt-4 mb-2 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
        {(['deals', 'mine'] as const).map(t => (
          <TouchableOpacity
            key={t}
            className={`flex-1 py-2 rounded-lg items-center ${tab === t ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            onPress={() => setTab(t)}
          >
            <Text className={`text-sm font-bold ${tab === t ? 'text-brand-terracotta' : 'text-gray-500'}`}>
              {t === 'deals' ? '🎁 Shop Deals' : '🎟 My Codes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'deals' ? (
        <FlatList
          data={deals}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          renderItem={({ item }) => (
            <DealCard deal={item} userXp={userXp} onRedeem={handleRedeem} />
          )}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Gift size={48} color="#d1d5db" />
              <Text className="text-lg font-bold text-gray-400 mt-3">No deals available</Text>
              <Text className="text-sm text-gray-300 mt-1 text-center px-8">
                Check back soon — local shops are adding deals regularly.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={myRedemptions}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
          renderItem={({ item }) => {
            const expired = new Date(item.expires_at) < new Date();
            return (
              <View className={`bg-white dark:bg-gray-800 rounded-2xl p-4 mb-3 border ${expired || item.used ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-brand-green/30'}`}>
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 dark:text-gray-100">{item.deal?.title}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">{item.deal?.shop?.name}</Text>
                  </View>
                  {item.used ? (
                    <View className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-lg">
                      <Text className="text-xs text-gray-500 font-bold">USED</Text>
                    </View>
                  ) : expired ? (
                    <View className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-lg">
                      <Text className="text-xs text-red-500 font-bold">EXPIRED</Text>
                    </View>
                  ) : (
                    <View className="bg-brand-green/10 px-2 py-1 rounded-lg">
                      <Text className="text-xs text-brand-green font-bold">ACTIVE</Text>
                    </View>
                  )}
                </View>
                <View className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-2.5 items-center">
                  <Text className="text-xl font-black text-brand-terracotta tracking-widest">
                    {item.redemption_code}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1 mt-2">
                  <Clock size={11} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400">
                    {expired ? 'Expired' : 'Expires'}: {new Date(item.expires_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center mt-16">
              <Star size={48} color="#d1d5db" />
              <Text className="text-lg font-bold text-gray-400 mt-3">No redemptions yet</Text>
              <Text className="text-sm text-gray-300 mt-1 text-center px-8">
                Earn XP by skating and redeem deals from local shops.
              </Text>
            </View>
          }
        />
      )}

      {/* Redemption Code Modal */}
      <RedemptionCodeModal
        visible={codeModal.visible}
        code={codeModal.code}
        expiresAt={codeModal.expiresAt}
        dealTitle={codeModal.dealTitle}
        shopName={codeModal.shopName}
        onClose={() => setCodeModal(prev => ({ ...prev, visible: false }))}
      />

      {redeeming && (
        <View className="absolute inset-0 bg-black/40 items-center justify-center">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 items-center gap-3">
            <ActivityIndicator size="large" color="#d2673d" />
            <Text className="text-gray-700 dark:text-gray-200 font-semibold">Redeeming deal...</Text>
          </View>
        </View>
      )}
    </View>
  );
}
