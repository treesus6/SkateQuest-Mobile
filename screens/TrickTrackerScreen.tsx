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
import { Target, Star, Zap, Plus, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { userTricksService } from '../lib/userTricksService';
import { feedService } from '../lib/feedService';
import { profilesService } from '../lib/profilesService';
import { UserTrick } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const COMMON_TRICKS = [
  'Ollie',
  'Kickflip',
  'Heelflip',
  'Pop Shove-it',
  'Frontside 180',
  'Backside 180',
  'Varial Kickflip',
  'Hardflip',
  'Treflip',
  '50-50 Grind',
  'Boardslide',
  'Noseslide',
  'Tailslide',
  'Feeble Grind',
  'Smith Grind',
];

const STATUS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  trying: { icon: Zap, color: '#FF9800', label: 'TRYING' },
  landed: { icon: Target, color: '#2196F3', label: 'LANDED' },
  consistent: { icon: Star, color: '#4CAF50', label: 'CONSISTENT' },
};

export default function TrickTrackerScreen() {
  const { user } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrickName, setNewTrickName] = useState('');

  const { data: tricks, refetch } = useSupabaseQuery<UserTrick[]>(
    () => userTricksService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `tricks-${user?.id}`, enabled: !!user }
  );

  const addTrick = async () => {
    if (!newTrickName.trim() || !user) return;

    try {
      const { error } = await userTricksService.create({
        user_id: user.id,
        trick_name: newTrickName.trim(),
        status: 'trying',
      });

      if (error) {
        if ((error as any).code === '23505') {
          Alert.alert('Error', 'You already have this trick in your list');
        } else {
          throw error;
        }
      } else {
        setNewTrickName('');
        setShowAddModal(false);
        refetch();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateTrickStatus = async (
    trick: UserTrick,
    newStatus: 'trying' | 'landed' | 'consistent'
  ) => {
    if (!user) return;
    try {
      const { error } = await userTricksService.updateStatus(trick.id, newStatus);
      if (error) throw error;

      if (newStatus === 'landed' && trick.status === 'trying') {
        await feedService.create({
          user_id: user.id,
          activity_type: 'trick_landed',
          title: `Landed a ${trick.trick_name}!`,
          xp_earned: 25,
        });

        const { error: xpError } = await profilesService.incrementXp(user.id, 25);
        if (xpError) {
          const { data: userData } = await profilesService.getById(user.id);
          if (userData) {
            await profilesService.update(user.id, { xp: (userData.xp || 0) + 25 });
          }
        }

        Alert.alert('Congrats!', `You landed a ${trick.trick_name}! +25 XP`);
      }

      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const incrementAttempts = async (trick: UserTrick) => {
    try {
      await userTricksService.update(trick.id, {
        attempts: trick.attempts + 1,
        updated_at: new Date().toISOString(),
      });
      refetch();
    } catch {}
  };

  const deleteTrick = (trick: UserTrick) => {
    Alert.alert('Delete Trick', `Remove ${trick.trick_name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await userTricksService.delete(trick.id);
          refetch();
        },
      },
    ]);
  };

  const renderTrick = ({ item }: { item: UserTrick }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.trying;
    const Icon = config.icon;

    return (
      <Card>
        <View className="flex-row items-center mb-3">
          <Icon color={config.color} size={28} />
          <View className="flex-1 ml-3">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {item.trick_name}
            </Text>
            <View className="flex-row gap-2.5 mt-1">
              <Text style={{ color: config.color }} className="text-xs font-bold">
                {config.label}
              </Text>
              <Text className="text-xs text-gray-500">{item.attempts} attempts</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-brand-terracotta py-2.5 rounded-lg items-center"
            onPress={() => incrementAttempts(item)}
          >
            <Text className="text-white text-sm font-bold">+1 Try</Text>
          </TouchableOpacity>

          {item.status === 'trying' && (
            <TouchableOpacity
              className="flex-1 bg-brand-green py-2.5 rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'landed')}
            >
              <Text className="text-white text-sm font-bold">Landed!</Text>
            </TouchableOpacity>
          )}

          {item.status === 'landed' && (
            <TouchableOpacity
              className="flex-1 bg-blue-500 py-2.5 rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'consistent')}
            >
              <Text className="text-white text-sm font-bold">Consistent</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-red-500 px-3 py-2.5 rounded-lg items-center"
            onPress={() => deleteTrick(item)}
          >
            <Trash2 color="#fff" size={16} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-white">Trick Tracker</Text>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full flex-row items-center gap-1.5"
          onPress={() => setShowAddModal(true)}
        >
          <Plus color="#d2673d" size={14} />
          <Text className="text-brand-terracotta font-bold text-sm">Add Trick</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tricks ?? []}
        renderItem={renderTrick}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">No tricks yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Add a trick you're working on!</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white dark:bg-gray-800 rounded-t-2xl p-5"
            style={{ maxHeight: '80%' }}
          >
            <Text className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mb-4">
              Add New Trick
            </Text>

            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 text-gray-800 dark:text-gray-100"
              placeholder="Trick name"
              placeholderTextColor="#999"
              value={newTrickName}
              onChangeText={setNewTrickName}
              autoFocus
            />

            <Text className="text-sm font-semibold text-gray-500 mb-2.5">Common Tricks:</Text>
            <ScrollView>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {COMMON_TRICKS.map(trick => (
                  <TouchableOpacity
                    key={trick}
                    className="bg-gray-200 dark:bg-gray-600 px-3 py-1.5 rounded-full"
                    onPress={() => setNewTrickName(trick)}
                  >
                    <Text className="text-sm text-gray-700 dark:text-gray-200">{trick}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View className="flex-row gap-2.5">
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setNewTrickName('');
                }}
                variant="secondary"
                size="lg"
                className="flex-1"
              />
              <Button
                title="Add"
                onPress={addTrick}
                variant="primary"
                size="lg"
                className="flex-1 bg-brand-green"
                disabled={!newTrickName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
