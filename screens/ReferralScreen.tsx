import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Plus, X, Users, Zap, Copy, UserPlus } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../stores/useAuthStore';
import { referralService } from '../lib/referralService';
import ReferralCodeCard from '../components/ReferralCodeCard';
import { Logger } from '../lib/logger';

export default function ReferralScreen() {
  const { user } = useAuthStore();
  const [codes, setCodes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCode, setNewCode] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [codesData, statsData] = await Promise.all([
        referralService.getUserReferralCodes(user.id),
        referralService.getReferralStats(user.id),
      ]);
      setCodes(codesData);
      setStats(statsData);
    } catch (error) {
      Logger.error('Failed to load referral data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateCode = async () => {
    if (!user?.id || !newCode.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }
    try {
      await referralService.createReferralCode(user.id, newCode);
      Alert.alert('Success', 'Referral code created!');
      setNewCode('');
      setModalVisible(false);
      await loadData();
    } catch (error) {
      Logger.error('Failed to create code', error);
      Alert.alert('Error', 'Failed to create referral code');
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Code "${code}" copied to clipboard`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#07090D] items-center justify-center">
        <ActivityIndicator size="large" color="#D2673D" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-4 pb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">GROW THE CREW</Text>
            <Text className="text-white text-[30px] font-black mt-1">Referrals</Text>
            <Text className="text-[#7B8493] text-sm mt-1">Invite real skaters and track the rewards your codes earn.</Text>
          </View>
          <Pressable onPress={() => setModalVisible(true)} className="bg-[#D2673D] px-4 py-3 rounded-2xl flex-row items-center gap-2">
            <Plus size={16} color="#fff" />
            <Text className="text-white text-sm font-black">Code</Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Users size={16} color="#38BDF8" />
            <Text className="text-white text-xl font-black mt-1">{stats?.total_referrals ?? 0}</Text>
            <Text className="text-[#697383] text-[11px]">signups</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Zap size={16} color="#FBBF24" />
            <Text className="text-white text-xl font-black mt-1">{stats?.total_xp_earned ?? 0}</Text>
            <Text className="text-[#697383] text-[11px]">XP earned</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Copy size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{codes.length}</Text>
            <Text className="text-[#697383] text-[11px]">codes</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={codes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="px-4 mb-3">
            <ReferralCodeCard
              code={item.code}
              description={item.description}
              activationBonusXp={item.activation_bonus_xp}
              recruiterBonusXp={item.recruiter_bonus_xp}
              active={item.active}
              onCopy={handleCopyCode}
            />
          </View>
        )}
        refreshControl={<RefreshControl tintColor="#D2673D" refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={
          <View className="items-center mt-20 px-8">
            <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
              <UserPlus size={28} color="#596271" />
            </View>
            <Text className="text-white text-lg font-black mt-4">No referral codes yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">Create a code when you’re ready to bring another skater into SkateQuest.</Text>
            <Pressable onPress={() => setModalVisible(true)} className="bg-[#D2673D] px-5 py-3 rounded-xl mt-4">
              <Text className="text-white font-black">Create first code</Text>
            </Pressable>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#10151D] border border-[#2A303A] rounded-t-[28px] p-5">
            <View className="w-10 h-1 bg-[#343B47] rounded-full self-center mb-4" />
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[#D2673D] text-[10px] font-black tracking-[1.5px]">NEW INVITE CODE</Text>
                <Text className="text-white text-[22px] font-black mt-1">Create Referral</Text>
                <Text className="text-[#7B8493] text-sm mt-1">Keep it short and easy to share.</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} className="w-10 h-10 bg-[#0B1017] border border-[#252D39] rounded-xl items-center justify-center">
                <X size={19} color="#9CA3AF" />
              </Pressable>
            </View>

            <TextInput
              className="bg-[#090D13] border border-[#252D39] px-4 py-4 rounded-xl text-white text-base font-bold mt-5"
              placeholder="e.g. SHRED25"
              placeholderTextColor="#596271"
              value={newCode}
              onChangeText={setNewCode}
              maxLength={15}
              autoCapitalize="characters"
            />
            <Pressable
              disabled={!newCode.trim()}
              onPress={handleCreateCode}
              className={`px-4 py-4 rounded-xl items-center mt-4 ${newCode.trim() ? 'bg-[#D2673D]' : 'bg-[#353B45]'}`}
            >
              <Text className="text-white font-black">Create Code</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
