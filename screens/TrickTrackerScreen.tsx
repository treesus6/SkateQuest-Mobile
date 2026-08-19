import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Target, Star, Zap, Plus, Trash2, CheckCircle, BookOpen, BarChart3 } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { NativeStackNavigationProp } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { userTricksService } from '../lib/userTricksService';
import { UserTrick, RootStackParamList } from '../types';

const COMMON_TRICKS = [
  'Ollie', 'Kickflip', 'Heelflip', 'Pop Shove-it', 'Frontside 180', 'Backside 180',
  'Varial Kickflip', 'Hardflip', 'Treflip', '50-50 Grind', 'Boardslide', 'Noseslide',
  'Tailslide', 'Feeble Grind', 'Smith Grind',
];

const STATUS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  trying: { icon: Zap, color: '#F59E0B', label: 'TRYING' },
  landed: { icon: Target, color: '#38BDF8', label: 'LANDED' },
  consistent: { icon: Star, color: '#4ADE80', label: 'CONSISTENT' },
};

function getDailyTrick(): string {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return COMMON_TRICKS[seed % COMMON_TRICKS.length];
}

export default function TrickTrackerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrickName, setNewTrickName] = useState('');

  const { data: tricks, refetch } = useSupabaseQuery<UserTrick[]>(
    () => userTricksService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `tricks-${user?.id}`, enabled: !!user }
  );

  const allTricks = tricks ?? [];
  const todayTrick = getDailyTrick();
  const todayTrickDone = allTricks.some(
    t => t.trick_name.toLowerCase() === todayTrick.toLowerCase() && (t.status === 'landed' || t.status === 'consistent')
  );

  const addTrick = async () => {
    if (!newTrickName.trim() || !user) return;
    try {
      const { error } = await userTricksService.create({ user_id: user.id, trick_name: newTrickName.trim(), status: 'trying' });
      if (error) {
        if ((error as any).code === '23505') Alert.alert('Error', 'You already have this trick in your list');
        else throw error;
      } else {
        setNewTrickName('');
        setShowAddModal(false);
        refetch();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateTrickStatus = async (trick: UserTrick, newStatus: 'trying' | 'landed' | 'consistent') => {
    if (!user) return;
    try {
      const { error } = await userTricksService.updateStatus(trick.id, newStatus);
      if (error) throw error;
      if (newStatus === 'landed' && trick.status === 'trying') {
        Alert.alert('Saved to your tracker', `${trick.trick_name} is marked landed in your personal progress log. Self-reported tracker status does not award XP; verified challenges and proof clips do.`);
      }
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const incrementAttempts = async (trick: UserTrick) => {
    try {
      const { error } = await userTricksService.incrementAttempts(trick.id);
      if (error) {
        await userTricksService.update(trick.id, { attempts: trick.attempts + 1, updated_at: new Date().toISOString() });
      }
      refetch();
    } catch {}
  };

  const deleteTrick = (trick: UserTrick) => {
    Alert.alert('Delete Trick', `Remove ${trick.trick_name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await userTricksService.delete(trick.id); refetch(); } },
    ]);
  };

  const renderTrick = ({ item }: { item: UserTrick }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.trying;
    const Icon = config.icon;
    return (
      <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-[#0B1017] border border-[#252D39] items-center justify-center">
            <Icon color={config.color} size={21} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[17px] font-black">{item.trick_name}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text style={{ color: config.color }} className="text-[10px] font-black tracking-wider">{config.label}</Text>
              <Text className="text-[#697383] text-xs">{item.attempts} attempts</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <TouchableOpacity className="flex-1 bg-[#D2673D] py-3 rounded-xl items-center" onPress={() => incrementAttempts(item)}>
            <Text className="text-white text-xs font-black">+1 TRY</Text>
          </TouchableOpacity>
          {item.status === 'trying' ? (
            <TouchableOpacity className="flex-1 bg-[#12331F] border border-[#285D39] py-3 rounded-xl items-center" onPress={() => updateTrickStatus(item, 'landed')}>
              <Text className="text-[#4ADE80] text-xs font-black">LANDED</Text>
            </TouchableOpacity>
          ) : null}
          {item.status === 'landed' ? (
            <TouchableOpacity className="flex-1 bg-[#102334] border border-[#214967] py-3 rounded-xl items-center" onPress={() => updateTrickStatus(item, 'consistent')}>
              <Text className="text-[#7DD3FC] text-xs font-black">CONSISTENT</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity className="bg-[#251112] border border-[#532326] px-3 py-3 rounded-xl items-center" onPress={() => deleteTrick(item)}>
            <Trash2 color="#F87171" size={15} />
          </TouchableOpacity>
        </View>
        <Text className="text-[#596271] text-[10px] mt-2.5">Personal tracker only — no XP until a challenge/proof flow verifies it.</Text>
      </View>
    );
  };

  const landedCount = allTricks.filter(t => t.status === 'landed' || t.status === 'consistent').length;
  const consistentCount = allTricks.filter(t => t.status === 'consistent').length;

  const header = (
    <View>
      <View className="bg-[#171020] border border-[#3B2850] rounded-[20px] p-4 mb-4">
        <View className="flex-row items-center gap-2 mb-1">
          <Star color="#C084FC" size={14} fill="#C084FC" />
          <Text className="text-[#C084FC] text-[10px] font-black uppercase tracking-[1.5px]">Trick of the Day</Text>
        </View>
        <Text className="text-white text-2xl font-black mt-1 mb-3">{todayTrick}</Text>
        <View className="flex-row gap-2">
          {todayTrickDone ? (
            <View className="flex-1 flex-row items-center justify-center gap-1.5 bg-[#12331F] border border-[#285D39] py-3 rounded-xl">
              <CheckCircle size={14} color="#4ADE80" />
              <Text className="text-[#4ADE80] text-xs font-black">IN TRACKER</Text>
            </View>
          ) : (
            <TouchableOpacity className="flex-1 bg-[#7C3AED] py-3 rounded-xl items-center" onPress={() => { setNewTrickName(todayTrick); setShowAddModal(true); }}>
              <Text className="text-white text-xs font-black">ADD TRICK</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity className="flex-1 border border-[#6D4A8E] bg-[#120D19] py-3 rounded-xl flex-row items-center justify-center gap-1.5" onPress={() => navigation.navigate('TrickTutorials', { initialSearch: todayTrick })}>
            <BookOpen size={13} color="#C084FC" />
            <Text className="text-[#C084FC] text-xs font-black">TUTORIAL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">PERSONAL PROGRESS</Text>
            <Text className="text-white text-[30px] font-black mt-1">Trick Tracker</Text>
            <Text className="text-[#7B8493] text-sm mt-1">Track attempts and consistency without faking verified XP.</Text>
          </View>
          <TouchableOpacity className="bg-[#D2673D] px-4 py-3 rounded-2xl flex-row items-center gap-2" onPress={() => setShowAddModal(true)}>
            <Plus color="#fff" size={15} />
            <Text className="text-white font-black text-sm">Add</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <BarChart3 size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{allTricks.length}</Text>
            <Text className="text-[#697383] text-[11px]">tracked</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Target size={16} color="#38BDF8" />
            <Text className="text-white text-xl font-black mt-1">{landedCount}</Text>
            <Text className="text-[#697383] text-[11px]">landed</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Star size={16} color="#4ADE80" />
            <Text className="text-white text-xl font-black mt-1">{consistentCount}</Text>
            <Text className="text-[#697383] text-[11px]">consistent</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={allTricks}
        renderItem={renderTrick}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View className="items-center mt-12 px-8">
            <Target size={30} color="#596271" />
            <Text className="text-white text-lg font-black mt-4">No tricks tracked yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">Add what you’re working on and log your attempts.</Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#10151D] border border-[#2A303A] rounded-t-[28px] p-5" style={{ maxHeight: '80%' }}>
            <View className="w-10 h-1 bg-[#343B47] rounded-full self-center mb-4" />
            <Text className="text-[#D2673D] text-[10px] font-black tracking-[1.5px]">ADD TO TRACKER</Text>
            <Text className="text-white text-[22px] font-black mt-1 mb-4">New Trick</Text>
            <TextInput className="bg-[#090D13] border border-[#252D39] rounded-xl p-3.5 text-base mb-4 text-white" placeholder="Trick name" placeholderTextColor="#596271" value={newTrickName} onChangeText={setNewTrickName} autoFocus />
            <Text className="text-xs font-black text-[#7B8493] mb-2.5 uppercase tracking-wider">Common tricks</Text>
            <ScrollView>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {COMMON_TRICKS.map(trick => (
                  <TouchableOpacity key={trick} className="bg-[#0B1017] border border-[#252D39] px-3 py-2 rounded-full" onPress={() => setNewTrickName(trick)}>
                    <Text className="text-xs text-[#AEB5C0] font-bold">{trick}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View className="flex-row gap-2.5">
              <TouchableOpacity className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-4 items-center" onPress={() => { setShowAddModal(false); setNewTrickName(''); }}>
                <Text className="text-[#AEB5C0] font-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className={`flex-1 rounded-xl py-4 items-center ${newTrickName.trim() ? 'bg-[#D2673D]' : 'bg-[#353B45]'}`} onPress={addTrick} disabled={!newTrickName.trim()}>
                <Text className="text-white font-black">Add Trick</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
