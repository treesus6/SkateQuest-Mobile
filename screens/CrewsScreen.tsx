import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as crewService from '../services/crews';
import { Crew } from '../services/crews';

export default function CrewsScreen() {
  const { user } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewDescription, setNewCrewDescription] = useState('');

  useEffect(() => {
    loadCrews();
  }, []);

  const loadCrews = async () => {
    try {
      const data = await crewService.getCrews();
      setCrews(data);
    } catch (error) {
      console.error('Error loading crews:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCrew = async () => {
    if (!newCrewName.trim() || !user) {
      Alert.alert('Error', 'Please enter a crew name');
      return;
    }

    try {
      await crewService.createCrew(newCrewName.trim(), newCrewDescription.trim(), user.id);
      setNewCrewName('');
      setNewCrewDescription('');
      setShowCreateModal(false);
      Alert.alert('Success', 'Crew created!');
      loadCrews();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const joinCrew = async (crewId: string) => {
    Alert.alert('Join Crew', 'Join this crew?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        onPress: async () => {
          if (!user) return;
          try {
            await crewService.joinCrew(crewId, user.id);
            Alert.alert('Success', 'Joined crew!');
            loadCrews();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderCrew = ({ item }: { item: Crew }) => (
    <View className="bg-white rounded-xl p-[15px] mb-[15px] shadow-md">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-[20px] font-bold text-[#333] flex-1">{item.name}</Text>
        <Text className="text-base font-bold text-[#6B4CE6]">{item.total_xp} XP</Text>
      </View>
      {item.description && <Text className="text-sm text-[#666] mb-3">{item.description}</Text>}
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-[#888]">
          {'\u{1F465}'} {item.member_count} members
        </Text>
        <TouchableOpacity
          className="bg-[#6B4CE6] px-5 py-2 rounded-lg"
          onPress={() => joinCrew(item.id)}
        >
          <Text className="text-white font-bold text-sm">Join Crew</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="bg-[#6B4CE6] p-5 flex-row justify-between items-center">
        <Text className="text-[28px] font-bold text-white">{'\u{1F465}'} Crews</Text>
        <TouchableOpacity
          className="bg-white px-[15px] py-2 rounded-[20px]"
          onPress={() => setShowCreateModal(true)}
        >
          <Text className="text-[#6B4CE6] font-bold text-sm">+ Create Crew</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={crews}
        renderItem={renderCrew}
        keyExtractor={(item: Crew) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshing={loading}
        onRefresh={loadCrews}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No crews yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Be the first to create one!</Text>
          </View>
        }
      />

      {/* Create Crew Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="bg-white rounded-[16px] p-6">
            <Text className="text-2xl font-bold text-[#333] mb-5">Create New Crew</Text>

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-[15px]"
              placeholder="Crew Name"
              value={newCrewName}
              onChangeText={setNewCrewName}
              maxLength={30}
            />

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-[15px] h-[80px]"
              style={{ textAlignVertical: 'top' }}
              placeholder="Description (optional)"
              value={newCrewDescription}
              onChangeText={setNewCrewDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />

            <View className="flex-row gap-[10px]">
              <TouchableOpacity
                className="flex-1 p-[15px] rounded-lg items-center bg-[#f0f0f0]"
                onPress={() => setShowCreateModal(false)}
              >
                <Text className="text-[#666] font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 p-[15px] rounded-lg items-center bg-[#6B4CE6]"
                onPress={createCrew}
              >
                <Text className="text-white font-bold">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
