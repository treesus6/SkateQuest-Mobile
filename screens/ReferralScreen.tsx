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
import { Plus, X } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { referralService } from '../lib/referralService';
import ReferralCodeCard from '../components/ReferralCodeCard';
import Card from '../components/ui/Card';
import { Logger } from '../lib/logger';

export default function ReferralScreen() {
  const { user } = useAuthStore();
  const [codes, setCodes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, _setRefreshing] = useState(false);
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
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleCopyCode = (code: string) => {
    // In real app, use clipboard
    Alert.alert('Copied!', `Code "${code}" copied to clipboard`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#d2673d" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta px-4 py-4 rounded-b-2xl mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Referral Program</Text>
          <Text className="text-white/90 text-sm">Earn XP by inviting friends</Text>
        </View>
        <Pressable onPress={() => setModalVisible(true)} className="p-2 bg-white/20 rounded-full">
          <Plus size={20} color="white" strokeWidth={2} />
        </Pressable>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData()} />}
        ListHeaderComponent={
          stats ? (
            <View className="px-4 mb-4 gap-2 flex-row">
              <Card className="flex-1">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-brand-terracotta">
                    {stats.total_referrals}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">Signups</Text>
                </View>
              </Card>
              <Card className="flex-1">
                <View className="items-center">
                  <Text className="text-2xl font-bold text-brand-terracotta">
                    {stats.total_xp_earned}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">XP Earned</Text>
                </View>
              </Card>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center">
          <Card className="w-80">
            <View className="gap-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">New Code</Text>
                <Pressable onPress={() => setModalVisible(false)}>
                  <X size={24} color="#666" />
                </Pressable>
              </View>
              <TextInput
                className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg text-gray-900 dark:text-white"
                placeholder="e.g., SHRED2024K"
                value={newCode}
                onChangeText={setNewCode}
                maxLength={15}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleCreateCode}
                className="bg-brand-terracotta px-4 py-2 rounded-lg items-center"
              >
                <Text className="text-white font-semibold">Create Code</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
