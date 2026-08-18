import React, { useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BookOpen, CheckCircle, Plus, Star, Target, Trash2, Zap } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { userTricksService } from '../lib/userTricksService';
import { feedService } from '../lib/feedService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const COMMON_TRICKS = [
  'Ollie','Kickflip','Heelflip','Pop Shove-it','Frontside 180','Backside 180','Varial Kickflip','Hardflip','Treflip','50-50 Grind','Boardslide','Noseslide','Tailslide','Feeble Grind','Smith Grind',
];

function getDailyTrick() {
  const d = new Date();
  const seed = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  return COMMON_TRICKS[seed % COMMON_TRICKS.length];
}

const STATUS = {
  trying: { label: 'TRYING', color: '#FF9800', Icon: Zap },
  landed: { label: 'LANDED', color: '#2196F3', Icon: Target },
  consistent: { label: 'CONSISTENT', color: '#4CAF50', Icon: Star },
} as const;

export default function TrickTrackerScreenVerified() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const { data: tricks, refetch } = useSupabaseQuery<any[]>(
    () => userTricksService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `tricks-${user?.id}`, enabled: !!user }
  );
  const daily = getDailyTrick();
  const dailyDone = (tricks || []).some(t => t.trick_name?.toLowerCase() === daily.toLowerCase() && ['landed','consistent'].includes(t.status));

  const addTrick = async () => {
    if (!user || !name.trim()) return;
    try {
      const { error } = await userTricksService.create({ user_id: user.id, trick_name: name.trim(), status: 'trying' });
      if (error) throw error;
      setName(''); setShowAdd(false); refetch();
    } catch (error: any) { Alert.alert('Could not add trick', error?.message || 'Please try again.'); }
  };

  const setStatus = async (trick: any, status: 'trying'|'landed'|'consistent') => {
    if (!user) return;
    try {
      const { error } = await userTricksService.updateStatus(trick.id, status);
      if (error) throw error;
      if (status === 'landed' && trick.status === 'trying') {
        await feedService.create({
          user_id: user.id,
          activity_type: 'trick_landed',
          title: `Logged ${trick.trick_name} as landed`,
          description: 'Self-reported trick log — no XP awarded until a verified SkateQuest activity earns it.',
          xp_earned: 0,
        }).catch(() => undefined);
        Alert.alert('Trick logged', `${trick.trick_name} is marked landed. XP is only awarded through verified activity.`);
      }
      refetch();
    } catch (error: any) { Alert.alert('Could not update trick', error?.message || 'Please try again.'); }
  };

  const addAttempt = async (trick: any) => {
    try { const { error } = await userTricksService.incrementAttempts(trick.id); if (error) throw error; refetch(); }
    catch (error: any) { Alert.alert('Could not log attempt', error?.message || 'Please try again.'); }
  };

  const remove = (trick: any) => Alert.alert('Delete trick', `Remove ${trick.trick_name}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await userTricksService.delete(trick.id); refetch(); } },
  ]);

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-gray-950 px-5 pt-12 pb-4 flex-row items-center justify-between">
        <View><Text className="text-white text-2xl font-black">Trick Tracker</Text><Text className="text-gray-400 text-xs mt-1">Your real progression log. Self-reported tricks do not mint XP.</Text></View>
        <TouchableOpacity className="bg-brand-terracotta rounded-full px-4 py-2" onPress={() => setShowAdd(true)}><Text className="text-white font-black">+ Add</Text></TouchableOpacity>
      </View>

      <FlatList
        data={tricks || []}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        ListHeaderComponent={
          <View className="bg-purple-950/50 border border-purple-800 rounded-2xl p-4 mb-4">
            <Text className="text-purple-300 text-xs font-black uppercase tracking-widest">Trick of the day</Text>
            <Text className="text-white text-2xl font-black mt-1">{daily}</Text>
            <View className="flex-row gap-2 mt-3">
              {dailyDone ? <View className="flex-1 bg-green-600 rounded-xl py-3 items-center flex-row justify-center gap-2"><CheckCircle size={15} color="#fff" /><Text className="text-white font-black">Logged landed</Text></View> : <TouchableOpacity className="flex-1 bg-purple-600 rounded-xl py-3 items-center" onPress={() => { setName(daily); setShowAdd(true); }}><Text className="text-white font-black">Add to tracker</Text></TouchableOpacity>}
              <TouchableOpacity className="flex-1 border border-purple-500 rounded-xl py-3 flex-row items-center justify-center gap-2" onPress={() => navigation.navigate('TrickTutorials', { initialSearch: daily })}><BookOpen size={15} color="#C084FC" /><Text className="text-purple-300 font-black">Tutorial</Text></TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS[item.status as keyof typeof STATUS] || STATUS.trying;
          const Icon = cfg.Icon;
          return <Card>
            <View className="flex-row items-center mb-3"><Icon size={24} color={cfg.color} /><View className="flex-1 ml-3"><Text className="text-lg font-black text-gray-900 dark:text-white">{item.trick_name}</Text><Text style={{ color: cfg.color }} className="text-xs font-black">{cfg.label} · {item.attempts || 0} attempts</Text></View></View>
            <View className="flex-row gap-2">
              <TouchableOpacity className="flex-1 bg-brand-terracotta rounded-xl py-3 items-center" onPress={() => addAttempt(item)}><Text className="text-white font-black">+1 Try</Text></TouchableOpacity>
              {item.status === 'trying' ? <TouchableOpacity className="flex-1 bg-brand-green rounded-xl py-3 items-center" onPress={() => setStatus(item,'landed')}><Text className="text-white font-black">Landed</Text></TouchableOpacity> : null}
              {item.status === 'landed' ? <TouchableOpacity className="flex-1 bg-blue-600 rounded-xl py-3 items-center" onPress={() => setStatus(item,'consistent')}><Text className="text-white font-black">Consistent</Text></TouchableOpacity> : null}
              <TouchableOpacity className="bg-red-500 rounded-xl px-4 items-center justify-center" onPress={() => remove(item)}><Trash2 size={16} color="#fff" /></TouchableOpacity>
            </View>
          </Card>;
        }}
        ListEmptyComponent={<View className="items-center mt-16"><Text className="text-gray-500 font-bold">No tricks tracked yet.</Text></View>}
      />

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View className="flex-1 bg-black/60 justify-end"><View className="bg-white dark:bg-gray-800 rounded-t-3xl p-5" style={{ maxHeight: '80%' }}>
          <Text className="text-xl font-black text-gray-900 dark:text-white mb-3">Add a trick</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Trick name" placeholderTextColor="#999" className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 mb-3" autoFocus />
          <ScrollView><View className="flex-row flex-wrap gap-2 mb-4">{COMMON_TRICKS.map(t => <TouchableOpacity key={t} className="bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2" onPress={() => setName(t)}><Text className="text-gray-700 dark:text-gray-200">{t}</Text></TouchableOpacity>)}</View></ScrollView>
          <View className="flex-row gap-3"><Button title="Cancel" onPress={() => { setShowAdd(false); setName(''); }} variant="secondary" size="lg" className="flex-1" /><Button title="Add" onPress={addTrick} variant="primary" size="lg" className="flex-1" disabled={!name.trim()} /></View>
        </View></View>
      </Modal>
    </View>
  );
}
