import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Crosshair, MapPin, Clock, Check, X, Ban } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { callOutsService } from '../lib/callOutsService';
import { profilesService } from '../lib/profilesService';
import { CallOut, UserProfile, SkateSpot } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

type TabType = 'received' | 'sent';

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFA500',
  accepted: '#2196F3',
  completed: '#4CAF50',
  declined: '#666',
  failed: '#F44336',
};

export default function CallOutsScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedSpot, setSelectedSpot] = useState('');
  const [trickName, setTrickName] = useState('');
  const [message, setMessage] = useState('');
  const [xpReward, setXpReward] = useState('100');

  const queryFn = useCallback(() => {
    if (!user) return Promise.resolve({ data: [], error: null });
    return activeTab === 'received'
      ? callOutsService.getReceived(user.id)
      : callOutsService.getSent(user.id);
  }, [user, activeTab]);

  const {
    data: callOuts,
    loading,
    refetch,
  } = useSupabaseQuery<CallOut[]>(queryFn, [activeTab, user?.id], {
    cacheKey: `callouts-${activeTab}-${user?.id}`,
    enabled: !!user,
  });

  useEffect(() => {
    if (showCreateModal) {
      loadUsers();
      loadNearbySpots();
    }
  }, [showCreateModal]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, level, xp, spots_added, challenges_completed, created_at')
      .neq('id', user?.id)
      .order('xp', { ascending: false })
      .limit(50);
    setUsers(data || []);
  };

  const loadNearbySpots = async () => {
    const { data } = await supabase
      .from('skate_spots')
      .select('id, name, latitude, longitude')
      .limit(20);
    setSpots(data || []);
  };

  const createCallOut = async () => {
    if (!user) return;
    if (!selectedUser || !trickName.trim()) {
      Alert.alert('Error', 'Please select a user and enter a trick name');
      return;
    }

    try {
      const { error } = await callOutsService.create({
        challenger_id: user.id,
        challenged_user_id: selectedUser,
        trick_name: trickName.trim(),
        spot_id: selectedSpot || undefined,
        message: message.trim() || undefined,
        xp_reward: parseInt(xpReward) || 100,
      });

      if (error) throw error;

      Alert.alert('Success', 'Call out sent!');
      setShowCreateModal(false);
      resetForm();
      setActiveTab('sent');
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setSelectedSpot('');
    setTrickName('');
    setMessage('');
    setXpReward('100');
  };

  const acceptCallOut = (callOut: CallOut) => {
    Alert.alert(
      'Accept Call Out',
      `Accept "${callOut.trick_name}"?\nYou'll earn ${callOut.xp_reward} XP if you land it!`,
      [
        { text: 'Decline', onPress: () => declineCallOut(callOut), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await callOutsService.updateStatus(callOut.id, 'accepted');
              Alert.alert('Accepted!', 'Time to land that trick!');
              refetch();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const declineCallOut = async (callOut: CallOut) => {
    try {
      await callOutsService.updateStatus(callOut.id, 'declined');
      Alert.alert('Declined', 'Call out declined');
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const completeCallOut = (callOut: CallOut) => {
    Alert.alert(
      'Complete Call Out',
      `Did you land "${callOut.trick_name}"?\n\nYou should upload video proof!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            if (!user) return;
            try {
              await supabase
                .from('call_outs')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', callOut.id);

              const { data: userData, error: profileError } = await profilesService.getById(
                user.id
              );
              if (profileError) throw profileError;
              if (userData) {
                await profilesService.update(user.id, {
                  xp: (userData.xp || 0) + callOut.xp_reward,
                });
              }

              Alert.alert('Completed!', `You earned ${callOut.xp_reward} XP!`);
              refetch();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock color="#FFA500" size={14} />;
      case 'accepted':
        return <Check color="#2196F3" size={14} />;
      case 'completed':
        return <Check color="#4CAF50" size={14} />;
      case 'declined':
        return <X color="#666" size={14} />;
      case 'failed':
        return <Ban color="#F44336" size={14} />;
      default:
        return null;
    }
  };

  const renderCallOut = ({ item }: { item: CallOut }) => {
    const isReceived = activeTab === 'received';
    const otherUser = isReceived ? item.challenger : item.challenged_user;

    return (
      <Card>
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Crosshair color={isReceived ? '#d2673d' : '#2196F3'} size={16} />
              <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
                {otherUser?.username || 'Unknown User'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-brand-terracotta mt-1">{item.trick_name}</Text>
          </View>
          <View
            className="px-3 py-1.5 rounded-full flex-row items-center gap-1"
            style={{ backgroundColor: STATUS_COLORS[item.status] || '#999' }}
          >
            {getStatusIcon(item.status)}
            <Text className="text-white text-xs font-bold capitalize">{item.status}</Text>
          </View>
        </View>

        {item.message ? (
          <Text className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">
            "{item.message}"
          </Text>
        ) : null}

        {item.spot ? (
          <View className="flex-row items-center gap-1 mb-2">
            <MapPin color="#888" size={14} />
            <Text className="text-sm text-gray-400">{item.spot.name}</Text>
          </View>
        ) : null}

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-lg font-bold text-brand-green">+{item.xp_reward} XP</Text>

          {isReceived && item.status === 'pending' && (
            <Button
              title="Respond"
              onPress={() => acceptCallOut(item)}
              variant="primary"
              size="sm"
            />
          )}

          {isReceived && item.status === 'accepted' && (
            <Button
              title="Complete"
              onPress={() => completeCallOut(item)}
              variant="primary"
              size="sm"
              className="bg-brand-green"
            />
          )}
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="flex-row bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          className={`flex-1 py-4 items-center ${activeTab === 'received' ? 'border-b-[3px] border-brand-terracotta' : ''}`}
          onPress={() => setActiveTab('received')}
        >
          <Text
            className={`text-base font-semibold ${activeTab === 'received' ? 'text-brand-terracotta' : 'text-gray-500'}`}
          >
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 items-center ${activeTab === 'sent' ? 'border-b-[3px] border-brand-terracotta' : ''}`}
          onPress={() => setActiveTab('sent')}
        >
          <Text
            className={`text-base font-semibold ${activeTab === 'sent' ? 'text-brand-terracotta' : 'text-gray-500'}`}
          >
            Sent
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={callOuts ?? []}
        renderItem={renderCallOut}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center mt-24">
            <Text className="text-lg font-bold text-gray-400">
              {activeTab === 'received' ? 'No call outs received yet' : 'No call outs sent yet'}
            </Text>
            <Text className="text-sm text-gray-300 mt-1">
              Challenge someone to step up their game!
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute bottom-8 right-8 bg-brand-terracotta px-6 py-4 rounded-full shadow-lg"
        onPress={() => setShowCreateModal(true)}
      >
        <Text className="text-white text-base font-bold">+ Call Out</Text>
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white dark:bg-gray-800 rounded-t-2xl p-6"
            style={{ maxHeight: '90%' }}
          >
            <ScrollView>
              <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-5">
                Create Call Out
              </Text>

              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">Challenge Who?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5">
                {users.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    className={`px-4 py-2.5 rounded-full mr-2.5 border-2 ${
                      selectedUser === u.id
                        ? 'bg-brand-terracotta border-brand-terracotta'
                        : 'bg-gray-100 dark:bg-gray-700 border-transparent'
                    }`}
                    onPress={() => setSelectedUser(u.id)}
                  >
                    <Text
                      className={`font-semibold ${selectedUser === u.id ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      {u.username}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">Lv {u.level}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">Trick Name *</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-2.5 text-gray-800 dark:text-gray-100"
                placeholder="e.g., Kickflip, Treflip, 50-50 grind"
                placeholderTextColor="#999"
                value={trickName}
                onChangeText={setTrickName}
              />

              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">
                Location (Optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5">
                <TouchableOpacity
                  className={`px-4 py-2.5 rounded-full mr-2.5 border-2 ${
                    !selectedSpot
                      ? 'bg-blue-500 border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 border-transparent'
                  }`}
                  onPress={() => setSelectedSpot('')}
                >
                  <Text
                    className={`text-sm font-semibold ${!selectedSpot ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    Any Spot
                  </Text>
                </TouchableOpacity>
                {spots.map(spot => (
                  <TouchableOpacity
                    key={spot.id}
                    className={`px-4 py-2.5 rounded-full mr-2.5 border-2 ${
                      selectedSpot === spot.id
                        ? 'bg-blue-500 border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 border-transparent'
                    }`}
                    onPress={() => setSelectedSpot(spot.id)}
                  >
                    <Text
                      className={`text-xs font-semibold ${selectedSpot === spot.id ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      {spot.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">
                Trash Talk (Optional)
              </Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-2.5 text-gray-800 dark:text-gray-100"
                placeholder="Bet you can't land this..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />

              <Text className="text-sm font-semibold text-gray-500 mb-2 mt-4">XP Reward</Text>
              <TextInput
                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-5 text-gray-800 dark:text-gray-100"
                placeholder="100"
                placeholderTextColor="#999"
                value={xpReward}
                onChangeText={setXpReward}
                keyboardType="numeric"
              />

              <View className="flex-row gap-2.5 mt-5">
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                />
                <Button
                  title="Send Call Out"
                  onPress={createCallOut}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
