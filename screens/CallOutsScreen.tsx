import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { CallOut, UserProfile, SkateSpot } from '../types';

type TabType = 'received' | 'sent';

const CallOutsScreen = memo(() => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [callOuts, setCallOuts] = useState<CallOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [spots, setSpots] = useState<SkateSpot[]>([]);

  // Create call out form
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedSpot, setSelectedSpot] = useState<string>('');
  const [trickName, setTrickName] = useState('');
  const [message, setMessage] = useState('');
  const [xpReward, setXpReward] = useState('100');

  useEffect(() => {
    loadCallOuts();
  }, [activeTab]);

  useEffect(() => {
    if (showCreateModal) {
      loadUsers();
      loadNearbySpots();
    }
  }, [showCreateModal]);

  const loadCallOuts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const query =
        activeTab === 'received'
          ? supabase
              .from('call_outs')
              .select(
                `
              *,
              challenger:profiles!call_outs_challenger_id_fkey(id, username, level, xp),
              challenged_user:profiles!call_outs_challenged_user_id_fkey(id, username, level, xp),
              spot:skate_spots(id, name, latitude, longitude)
            `
              )
              .eq('challenged_user_id', user.id)
              .order('created_at', { ascending: false })
          : supabase
              .from('call_outs')
              .select(
                `
              *,
              challenger:profiles!call_outs_challenger_id_fkey(id, username, level, xp),
              challenged_user:profiles!call_outs_challenged_user_id_fkey(id, username, level, xp),
              spot:skate_spots(id, name, latitude, longitude)
            `
              )
              .eq('challenger_id', user.id)
              .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading call outs:', error);
      } else {
        setCallOuts(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, level, xp, spots_added, challenges_completed, created_at')
        .neq('id', user?.id)
        .order('xp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadNearbySpots = async () => {
    try {
      const { data, error } = await supabase
        .from('skate_spots')
        .select('id, name, latitude, longitude')
        .limit(20);

      if (error) throw error;
      setSpots(data || []);
    } catch (error) {
      console.error('Error loading spots:', error);
    }
  };

  const createCallOut = async () => {
    if (!selectedUser || !trickName.trim()) {
      Alert.alert('Error', 'Please select a user and enter a trick name');
      return;
    }

    try {
      const { error } = await supabase.from('call_outs').insert([
        {
          challenger_id: user?.id,
          challenged_user_id: selectedUser,
          spot_id: selectedSpot || null,
          trick_name: trickName.trim(),
          message: message.trim(),
          xp_reward: parseInt(xpReward) || 100,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Call out sent! 💪');
      setShowCreateModal(false);
      resetForm();
      setActiveTab('sent');
      loadCallOuts();
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

  const acceptCallOut = async (callOut: CallOut) => {
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
              const { error } = await supabase
                .from('call_outs')
                .update({ status: 'accepted' })
                .eq('id', callOut.id);

              if (error) throw error;
              Alert.alert('Accepted!', 'Time to land that trick! 🔥');
              loadCallOuts();
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
      const { error } = await supabase
        .from('call_outs')
        .update({ status: 'declined' })
        .eq('id', callOut.id);

      if (error) throw error;
      Alert.alert('Declined', 'Call out declined');
      loadCallOuts();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const completeCallOut = async (callOut: CallOut) => {
    Alert.alert(
      'Complete Call Out',
      `Did you land "${callOut.trick_name}"?\n\nYou should upload video proof!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              // Update call out status
              const { error: callOutError } = await supabase
                .from('call_outs')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', callOut.id);

              if (callOutError) throw callOutError;

              // Update user XP
              const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('xp')
                .eq('id', user?.id)
                .single();

              if (userError) throw userError;

              await supabase
                .from('profiles')
                .update({ xp: (userData.xp || 0) + callOut.xp_reward })
                .eq('id', user?.id);

              Alert.alert('Completed!', `You earned ${callOut.xp_reward} XP! 🎉`);
              loadCallOuts();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: CallOut['status']) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'declined':
        return '#666';
      case 'failed':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusText = (status: CallOut['status']) => {
    switch (status) {
      case 'pending':
        return '⏳ Pending';
      case 'accepted':
        return '✅ Accepted';
      case 'completed':
        return '🎉 Completed';
      case 'declined':
        return '❌ Declined';
      case 'failed':
        return '😅 Failed';
      default:
        return status;
    }
  };

  const renderCallOut = ({ item }: { item: CallOut }) => {
    const isReceived = activeTab === 'received';
    const otherUser = isReceived ? item.challenger : item.challenged_user;

    return (
      <View style={styles.callOutCard}>
        <View style={styles.callOutHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {isReceived ? '👊 ' : '🎯 '}
              {otherUser?.username || 'Unknown User'}
            </Text>
            <Text style={styles.trickName}>{item.trick_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {item.message && <Text style={styles.message}>"{item.message}"</Text>}

        {item.spot && <Text style={styles.spotName}>📍 {item.spot.name}</Text>}

        <View style={styles.callOutFooter}>
          <Text style={styles.xpReward}>+{item.xp_reward} XP</Text>

          {isReceived && item.status === 'pending' && (
            <TouchableOpacity style={styles.acceptButton} onPress={() => acceptCallOut(item)}>
              <Text style={styles.acceptButtonText}>Respond</Text>
            </TouchableOpacity>
          )}

          {isReceived && item.status === 'accepted' && (
            <TouchableOpacity style={styles.completeButton} onPress={() => completeCallOut(item)}>
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>Sent</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={callOuts}
        renderItem={renderCallOut}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadCallOuts}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'received' ? 'No call outs received yet' : 'No call outs sent yet'}
            </Text>
            <Text style={styles.emptySubtext}>Challenge someone to step up their game!</Text>
          </View>
        }
      />

      {/* Create Call Out Button */}
      <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.createButtonText}>+ Call Out</Text>
      </TouchableOpacity>

      {/* Create Call Out Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Create Call Out</Text>

              <Text style={styles.label}>Challenge Who?</Text>
              <ScrollView
                horizontal
                style={styles.userScroll}
                showsHorizontalScrollIndicator={false}
              >
                {users.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userChip, selectedUser === u.id && styles.selectedUserChip]}
                    onPress={() => setSelectedUser(u.id)}
                  >
                    <Text
                      style={[
                        styles.userChipText,
                        selectedUser === u.id && styles.selectedUserChipText,
                      ]}
                    >
                      {u.username}
                    </Text>
                    <Text style={styles.userLevel}>Lv {u.level}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Trick Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Kickflip, Treflip, 50-50 grind"
                value={trickName}
                onChangeText={setTrickName}
              />

              <Text style={styles.label}>Location (Optional)</Text>
              <ScrollView
                horizontal
                style={styles.spotScroll}
                showsHorizontalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[styles.spotChip, !selectedSpot && styles.selectedSpotChip]}
                  onPress={() => setSelectedSpot('')}
                >
                  <Text style={[styles.spotChipText, !selectedSpot && styles.selectedSpotChipText]}>
                    Any Spot
                  </Text>
                </TouchableOpacity>
                {spots.map(spot => (
                  <TouchableOpacity
                    key={spot.id}
                    style={[styles.spotChip, selectedSpot === spot.id && styles.selectedSpotChip]}
                    onPress={() => setSelectedSpot(spot.id)}
                  >
                    <Text
                      style={[
                        styles.spotChipText,
                        selectedSpot === spot.id && styles.selectedSpotChipText,
                      ]}
                    >
                      {spot.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Trash Talk (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Bet you can't land this..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>XP Reward</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                value={xpReward}
                onChangeText={setXpReward}
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={createCallOut}
                >
                  <Text style={styles.submitButtonText}>Send Call Out</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#d2673d',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#d2673d',
  },
  listContainer: {
    padding: 15,
  },
  callOutCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callOutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  trickName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d2673d',
  },
  message: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  spotName: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callOutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  xpReward: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  acceptButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  createButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#d2673d',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 15,
  },
  userScroll: {
    marginBottom: 10,
  },
  userChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserChip: {
    backgroundColor: '#d2673d',
    borderColor: '#b85a30',
  },
  userChipText: {
    color: '#333',
    fontWeight: '600',
  },
  selectedUserChipText: {
    color: '#fff',
  },
  userLevel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  spotScroll: {
    marginBottom: 10,
  },
  spotChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedSpotChip: {
    backgroundColor: '#2196F3',
    borderColor: '#1976D2',
  },
  spotChipText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  selectedSpotChipText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#d2673d',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default CallOutsScreen;
