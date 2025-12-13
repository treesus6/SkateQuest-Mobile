import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserTrick } from '../types';

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

export default function TrickTrackerScreen() {
  const { user } = useAuth();
  const [tricks, setTricks] = useState<UserTrick[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrickName, setNewTrickName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'trying' | 'landed' | 'consistent'>('trying');

  useEffect(() => {
    if (user) {
      loadTricks();
    }
  }, [user]);

  const loadTricks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tricks')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading tricks:', error);
      } else {
        setTricks(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrick = async () => {
    if (!newTrickName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('user_tricks')
        .insert([
          {
            user_id: user.id,
            trick_name: newTrickName.trim(),
            status: 'trying',
            attempts: 0,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'You already have this trick in your list');
        } else {
          throw error;
        }
      } else {
        setTricks([data, ...tricks]);
        setNewTrickName('');
        setShowAddModal(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateTrickStatus = async (trick: UserTrick, newStatus: 'trying' | 'landed' | 'consistent') => {
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'landed' && trick.status === 'trying') {
      updates.first_landed_at = new Date().toISOString();

      // Create activity for landing a trick
      await supabase.from('activities').insert([
        {
          user_id: user?.id,
          activity_type: 'trick_landed',
          title: `Landed a ${trick.trick_name}!`,
          xp_earned: 25,
        },
      ]);

      // Award XP
      const { data: userData } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user?.id)
        .single();

      if (userData) {
        await supabase
          .from('profiles')
          .update({ xp: userData.xp + 25 })
          .eq('id', user?.id);
      }
    }

    const { error } = await supabase
      .from('user_tricks')
      .update(updates)
      .eq('id', trick.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadTricks();
      if (newStatus === 'landed' && trick.status === 'trying') {
        Alert.alert('🎉 Congrats!', `You landed a ${trick.trick_name}! +25 XP`);
      }
    }
  };

  const incrementAttempts = async (trick: UserTrick) => {
    const { error } = await supabase
      .from('user_tricks')
      .update({
        attempts: trick.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', trick.id);

    if (!error) {
      loadTricks();
    }
  };

  const deleteTrick = async (trick: UserTrick) => {
    Alert.alert('Delete Trick', `Remove ${trick.trick_name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('user_tricks')
            .delete()
            .eq('id', trick.id);

          if (!error) {
            loadTricks();
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
      <View style={styles.trickCard}>
        <View style={styles.trickHeader}>
          <Text style={styles.trickEmoji}>{statusEmoji}</Text>
          <View style={styles.trickInfo}>
            <Text style={styles.trickName}>{item.trick_name}</Text>
            <View style={styles.trickMeta}>
              <Text style={[styles.trickStatus, { color: statusColor }]}>
                {item.status.toUpperCase()}
              </Text>
              <Text style={styles.attempts}>{item.attempts} attempts</Text>
            </View>
          </View>
        </View>

        <View style={styles.trickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => incrementAttempts(item)}
          >
            <Text style={styles.actionButtonText}>+1 Try</Text>
          </TouchableOpacity>

          {item.status === 'trying' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => updateTrickStatus(item, 'landed')}
            >
              <Text style={styles.actionButtonText}>Landed!</Text>
            </TouchableOpacity>
          )}

          {item.status === 'landed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => updateTrickStatus(item, 'consistent')}
            >
              <Text style={styles.actionButtonText}>Consistent</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => deleteTrick(item)}
          >
            <Text style={styles.actionButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛹 Trick Tracker</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Trick</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tricks}
        renderItem={renderTrick}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tricks yet</Text>
            <Text style={styles.emptySubtext}>Add a trick you're working on!</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Trick</Text>

            <TextInput
              style={styles.input}
              placeholder="Trick name"
              value={newTrickName}
              onChangeText={setNewTrickName}
              autoFocus
            />

            <Text style={styles.suggestionsTitle}>Common Tricks:</Text>
            <View style={styles.suggestionsContainer}>
              {COMMON_TRICKS.map((trick) => (
                <TouchableOpacity
                  key={trick}
                  style={styles.suggestionChip}
                  onPress={() => setNewTrickName(trick)}
                >
                  <Text style={styles.suggestionText}>{trick}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewTrickName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addTrick}
                disabled={!newTrickName.trim()}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d2673d',
    padding: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#d2673d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  trickCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trickEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  trickInfo: {
    flex: 1,
  },
  trickName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  trickMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  trickStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  attempts: {
    fontSize: 12,
    color: '#666',
  },
  trickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#d2673d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 0.3,
    backgroundColor: '#ff3b30',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  suggestionChip: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
