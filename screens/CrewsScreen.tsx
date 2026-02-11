import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { crewsService, Crew } from '../lib/crewsService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function CrewsScreen() {
  const user = useAuthStore(s => s.user);
  const { data: crews, loading, refetch } = useSupabaseQuery<Crew[]>(
    () => crewsService.getAll(),
    []
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewDescription, setNewCrewDescription] = useState('');

  const createCrew = async () => {
    if (!newCrewName.trim()) {
      Alert.alert('Error', 'Please enter a crew name');
      return;
    }
    try {
      const { error } = await crewsService.create({
        name: newCrewName.trim(),
        description: newCrewDescription.trim(),
        created_by: user?.id ?? '',
      });
      if (error) throw error;
      setNewCrewName('');
      setNewCrewDescription('');
      setShowCreateModal(false);
      Alert.alert('Success', 'Crew created!');
      refetch();
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
          try {
            const { error } = await crewsService.join(crewId, user?.id ?? '');
            if (error) throw error;
            Alert.alert('Success', 'Joined crew!');
            refetch();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderCrew = ({ item }: { item: Crew }) => (
    <Card>
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 flex-1">{item.name}</Text>
        <Text className="text-base font-bold text-brand-purple">{item.total_xp} XP</Text>
      </View>
      {item.description ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</Text>
      ) : null}
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-400">{item.member_count} members</Text>
        <Button title="Join Crew" onPress={() => joinCrew(item.id)} variant="secondary" size="sm" />
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-purple p-5 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-white">Crews</Text>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full"
          onPress={() => setShowCreateModal(true)}
        >
          <Text className="text-brand-purple font-bold text-sm">+ Create Crew</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={crews ?? []}
        renderItem={renderCrew}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">No crews yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Be the first to create one!</Text>
          </View>
        }
      />

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-5">Create New Crew</Text>

            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 text-gray-800 dark:text-gray-100"
              placeholder="Crew Name"
              placeholderTextColor="#999"
              value={newCrewName}
              onChangeText={setNewCrewName}
              maxLength={30}
            />

            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 h-20 text-gray-800 dark:text-gray-100"
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={newCrewDescription}
              onChangeText={setNewCrewDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Cancel"
                  onPress={() => setShowCreateModal(false)}
                  variant="ghost"
                  size="lg"
                />
              </View>
              <View className="flex-1">
                <Button title="Create" onPress={createCrew} variant="secondary" size="lg" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
