import React, { useState, useEffect, memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { UserTrick } from '../types';
import * as trickService from '../services/tricks';
import * as profileService from '../services/profiles';
import { logActivity } from '../services/activities';

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

const TrickTrackerScreen = memo(() => {
  const { user } = useAuth();
  const [tricks, setTricks] = useState<UserTrick[]>([]);
  const [, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrickName, setNewTrickName] = useState('');

  useEffect(() => {
    if (user) {
      loadTricks();
    }
  }, [user]);

  const loadTricks = async () => {
    if (!user) return;
    try {
      const data = await trickService.getUserTricks(user.id);
      setTricks(data);
    } catch (error) {
      console.error('Error loading tricks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrick = async () => {
    if (!newTrickName.trim() || !user) return;

    try {
      const data = await trickService.addTrick(user.id, newTrickName.trim());
      setTricks([data, ...tricks]);
      setNewTrickName('');
      setShowAddModal(false);
    } catch (error: any) {
      if (error.code === '23505') {
        Alert.alert('Error', 'You already have this trick in your list');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const updateTrickStatus = async (
    trick: UserTrick,
    newStatus: 'trying' | 'landed' | 'consistent'
  ) => {
    try {
      if (newStatus === 'landed' && trick.status === 'trying' && user) {
        await logActivity({
          userId: user.id,
          type: 'trick_landed',
          title: `Landed a ${trick.trick_name}!`,
          xpEarned: 25,
        });

        try {
          await profileService.awardXP(user.id, 25);
        } catch (xpErr) {
          console.warn('Failed to award XP:', xpErr);
        }
      }

      await trickService.updateTrickStatus(trick.id, newStatus);
      loadTricks();

      if (newStatus === 'landed' && trick.status === 'trying') {
        Alert.alert('🎉 Congrats!', `You landed a ${trick.trick_name}! +25 XP`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const incrementAttempts = async (trick: UserTrick) => {
    try {
      await trickService.incrementAttempts(trick.id, trick.attempts);
      loadTricks();
    } catch (error) {
      console.error('Error incrementing attempts:', error);
    }
  };

  const deleteTrick = async (trick: UserTrick) => {
    Alert.alert('Delete Trick', `Remove ${trick.trick_name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await trickService.deleteTrick(trick.id);
            loadTricks();
          } catch (error) {
            console.error('Error deleting trick:', error);
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trying':
        return '#FF9800';
      case 'landed':
        return '#2196F3';
      case 'consistent':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'trying':
        return '💪';
      case 'landed':
        return '🎯';
      case 'consistent':
        return '⭐';
      default:
        return '📝';
    }
  };

  const renderTrick = ({ item }: { item: UserTrick }) => {
    const statusColor = getStatusColor(item.status);
    const statusEmoji = getStatusEmoji(item.status);

    return (
      <View className="bg-white rounded-xl p-[15px] mb-3 shadow-md">
        <View className="flex-row items-center mb-3">
          <Text className="text-[32px] mr-3">{statusEmoji}</Text>
          <View className="flex-1">
            <Text className="text-lg font-bold text-[#333] mb-1">{item.trick_name}</Text>
            <View className="flex-row gap-[10px]">
              <Text className="text-xs font-bold" style={{ color: statusColor }}>
                {item.status.toUpperCase()}
              </Text>
              <Text className="text-xs text-[#666]">{item.attempts} attempts</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-brand-orange py-[10px] rounded-lg items-center"
            onPress={() => incrementAttempts(item)}
          >
            <Text className="text-white text-[13px] font-bold">+1 Try</Text>
          </TouchableOpacity>

          {item.status === 'trying' && (
            <TouchableOpacity
              className="flex-1 bg-[#4CAF50] py-[10px] rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'landed')}
            >
              <Text className="text-white text-[13px] font-bold">Landed!</Text>
            </TouchableOpacity>
          )}

          {item.status === 'landed' && (
            <TouchableOpacity
              className="flex-1 bg-[#2196F3] py-[10px] rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'consistent')}
            >
              <Text className="text-white text-[13px] font-bold">Consistent</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="flex-[0.3] bg-[#ff3b30] py-[10px] rounded-lg items-center"
            onPress={() => deleteTrick(item)}
          >
            <Text className="text-white text-[13px] font-bold">🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="flex-row justify-between items-center bg-brand-orange p-[15px] rounded-bl-[15px] rounded-br-[15px]">
        <Text className="text-2xl font-bold text-white">🛹 Trick Tracker</Text>
        <TouchableOpacity
          className="bg-white px-[15px] py-2 rounded-[20px]"
          onPress={() => setShowAddModal(true)}
        >
          <Text className="text-brand-orange font-bold text-sm">+ Add Trick</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tricks}
        renderItem={renderTrick}
        keyExtractor={(item: UserTrick) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No tricks yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Add a trick you're working on!</Text>
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
          <View className="bg-white rounded-tl-[20px] rounded-tr-[20px] p-5 max-h-[80%]">
            <Text className="text-[22px] font-bold text-[#333] mb-[15px]">Add New Trick</Text>

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-[15px]"
              placeholder="Trick name"
              value={newTrickName}
              onChangeText={setNewTrickName}
              autoFocus
            />

            <Text className="text-sm font-semibold text-[#666] mb-[10px]">Common Tricks:</Text>
            <View className="flex-row flex-wrap gap-2 mb-5">
              {COMMON_TRICKS.map(trick => (
                <TouchableOpacity
                  key={trick}
                  className="bg-[#e0e0e0] px-3 py-[6px] rounded-[16px]"
                  onPress={() => setNewTrickName(trick)}
                >
                  <Text className="text-[13px] text-[#333]">{trick}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-[10px]">
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-[#e0e0e0]"
                onPress={() => {
                  setShowAddModal(false);
                  setNewTrickName('');
                }}
              >
                <Text className="text-[#333] text-base font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-[#4CAF50]"
                onPress={addTrick}
                disabled={!newTrickName.trim()}
              >
                <Text className="text-white text-base font-bold">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default TrickTrackerScreen;
