import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SkateGame, SkateGameTurn, UserProfile } from '../types';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';

export default function SkateGameScreen({ navigation }: any) {
  const { user } = useAuth();
  const [games, setGames] = useState<SkateGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<SkateGame | null>(null);
  const [opponentUsername, setOpponentUsername] = useState('');

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    try {
      const { data, error} = await supabase
        .from('skate_games')
        .select(`
          *,
          challenger:challenger_id(id, username, level, xp),
          opponent:opponent_id(id, username, level, xp)
        `)
        .or(`challenger_id.eq.${user?.id},opponent_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading games:', error);
      } else {
        setGames(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async () => {
    if (!opponentUsername.trim() || !user) return;

    try {
      // Find opponent by username
      const { data: opponentData, error: opponentError } = await supabase
        .from('users')
        .select('id')
        .eq('username', opponentUsername.trim())
        .single();

      if (opponentError || !opponentData) {
        Alert.alert('Error', 'User not found');
        return;
      }

      if (opponentData.id === user.id) {
        Alert.alert('Error', 'You cannot challenge yourself');
        return;
      }

      // Create game
      const { data, error } = await supabase
        .from('skate_games')
        .insert([
          {
            challenger_id: user.id,
            opponent_id: opponentData.id,
            status: 'pending',
            current_turn: user.id,
            challenger_letters: '',
            opponent_letters: '',
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      Alert.alert('Success', `Game created! Challenge ${opponentUsername} to SKATE!`);
      setShowNewGameModal(false);
      setOpponentUsername('');
      loadGames();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getGameStatus = (game: SkateGame) => {
    const isChallenger = game.challenger_id === user?.id;
    const myLetters = isChallenger ? game.challenger_letters : game.opponent_letters;
    const opponentLetters = isChallenger ? game.opponent_letters : game.challenger_letters;

    if (game.status === 'completed') {
      if (game.winner_id === user?.id) {
        return '🏆 YOU WON!';
      } else {
        return '❌ YOU LOST';
      }
    }

    if (game.status === 'pending') {
      return '⏳ Waiting...';
    }

    const isMyTurn = game.current_turn === user?.id;
    return isMyTurn ? '🎯 Your Turn' : '⏰ Their Turn';
  };

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    let display = '';
    for (let i = 0; i < target.length; i++) {
      if (i < letters.length) {
        display += letters[i];
      } else {
        display += '_';
      }
    }
    return display;
  };

  const renderGame = ({ item }: { item: SkateGame }) => {
    const isChallenger = item.challenger_id === user?.id;
    const opponent = isChallenger ? item.opponent : item.challenger;
    const myLetters = isChallenger ? item.challenger_letters : item.opponent_letters;
    const opponentLetters = isChallenger ? item.opponent_letters : item.challenger_letters;

    return (
      <TouchableOpacity
        style={styles.gameCard}
        onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
      >
        <View style={styles.gameHeader}>
          <Text style={styles.opponentName}>vs {opponent?.username}</Text>
          <Text style={styles.gameStatus}>{getGameStatus(item)}</Text>
        </View>

        <View style={styles.lettersContainer}>
          <View style={styles.lettersRow}>
            <Text style={styles.lettersLabel}>You:</Text>
            <Text style={styles.letters}>{getLettersDisplay(myLetters)}</Text>
          </View>
          <View style={styles.lettersRow}>
            <Text style={styles.lettersLabel}>Them:</Text>
            <Text style={styles.letters}>{getLettersDisplay(opponentLetters)}</Text>
          </View>
        </View>

        {item.status === 'active' && item.current_turn === user?.id && (
          <TouchableOpacity style={styles.playButton}>
            <Text style={styles.playButtonText}>🎬 Record Trick</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏆 SKATE Game</Text>
          <Text style={styles.headerSubtitle}>Challenge your friends!</Text>
        </View>
        <TouchableOpacity
          style={styles.newGameButton}
          onPress={() => setShowNewGameModal(true)}
        >
          <Text style={styles.newGameButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>How to Play:</Text>
        <Text style={styles.rulesText}>
          1. Challenge a skater to a game of SKATE{'\n'}
          2. Take turns posting trick videos{'\n'}
          3. If you can't match their trick, you get a letter{'\n'}
          4. First to spell SKATE loses!
        </Text>
      </View>

      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No games yet</Text>
            <Text style={styles.emptySubtext}>Challenge someone to SKATE!</Text>
          </View>
        }
      />

      <Modal
        visible={showNewGameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New SKATE Game</Text>
            <Text style={styles.modalSubtitle}>
              Challenge another skater to a game!
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Opponent's username"
              value={opponentUsername}
              onChangeText={setOpponentUsername}
              autoFocus
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowNewGameModal(false);
                  setOpponentUsername('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createGame}
                disabled={!opponentUsername.trim()}
              >
                <Text style={styles.createButtonText}>Challenge</Text>
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
    paddingTop: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  newGameButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGameButtonText: {
    color: '#d2673d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rulesCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
  },
  gameCard: {
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
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  opponentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  gameStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d2673d',
  },
  lettersContainer: {
    gap: 8,
    marginBottom: 12,
  },
  lettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lettersLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
  },
  letters: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace',
    letterSpacing: 8,
  },
  playButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
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
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
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
  createButton: {
    backgroundColor: '#d2673d',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
