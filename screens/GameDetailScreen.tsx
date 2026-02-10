import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { SkateGame, SkateGameTurn } from '../types';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';

const GameDetailScreen = memo(({ route, navigation }: any) => {
  const { gameId } = route.params;
  const { user } = useAuthStore();
  const [game, setGame] = useState<SkateGame | null>(null);
  const [turns, setTurns] = useState<SkateGameTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showTrickModal, setShowTrickModal] = useState(false);
  const [trickName, setTrickName] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    loadGameData();

    // Subscribe to game updates
    const gameChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'skate_games',
          filter: `id=eq.${gameId}`,
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    // Subscribe to turn updates
    const turnsChannel = supabase
      .channel(`turns-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'skate_game_turns',
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          loadGameData();
        }
      )
      .subscribe();

    return () => {
      gameChannel.unsubscribe();
      turnsChannel.unsubscribe();
    };
  }, [gameId]);

  const loadGameData = async () => {
    try {
      // Load game
      const { data: gameData, error: gameError } = await supabase
        .from('skate_games')
        .select(
          `
          *,
          challenger:challenger_id(id, username, level, xp),
          opponent:opponent_id(id, username, level, xp)
        `
        )
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      setGame(gameData);

      // Load turns
      const { data: turnsData, error: turnsError } = await supabase
        .from('skate_game_turns')
        .select(
          `
          *,
          player:player_id(id, username, level),
          media:media_id(id, url, thumbnail_url, type)
        `
        )
        .eq('game_id', gameId)
        .order('turn_number', { ascending: true });

      if (turnsError) throw turnsError;

      setTurns(turnsData || []);
    } catch (error: any) {
      console.error('Error loading game:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAndSetVideo = async () => {
    try {
      const result = await pickVideo();
      if (result) {
        setVideoUri(result.uri);
        setShowTrickModal(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const submitTurn = async () => {
    if (!trickName.trim() || !videoUri || !game || !user) return;

    setSubmitting(true);
    try {
      // Upload video
      const videoResult = await uploadVideo(videoUri, 'game_videos', user.id);

      // Save to media table
      const media = await saveMediaToDatabase(user.id, videoResult, {
        caption: `SKATE game trick: ${trickName}`,
        trickName,
      });

      const turnNumber = turns.length + 1;

      // Add turn
      const { error: turnError } = await supabase.from('skate_game_turns').insert([
        {
          game_id: gameId,
          player_id: user.id,
          media_id: media.id,
          trick_name: trickName,
          turn_number: turnNumber,
        },
      ]);

      if (turnError) throw turnError;

      // Determine if opponent matched the trick
      // For now, we'll let the opponent decide (in a real app, this could be AI-analyzed)
      const isChallenger = game.challenger_id === user.id;
      const opponentId = isChallenger ? game.opponent_id : game.challenger_id;

      // Switch turn
      const { error: updateError } = await supabase
        .from('skate_games')
        .update({
          current_turn: opponentId,
          status: 'active',
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Trick posted! Waiting for opponent...');
      setShowTrickModal(false);
      setTrickName('');
      setVideoUri(null);
      loadGameData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const markTurnResult = async (turnId: string, matched: boolean) => {
    if (!game || !user) return;

    try {
      // Update turn result
      const { error: turnError } = await supabase
        .from('skate_game_turns')
        .update({ matched })
        .eq('id', turnId);

      if (turnError) throw turnError;

      // If didn't match, give a letter
      if (!matched) {
        const turn = turns.find(t => t.id === turnId);
        if (!turn) return;

        const isChallenger = game.challenger_id === user.id;
        const currentLetters = isChallenger ? game.opponent_letters : game.challenger_letters;
        const letterSequence = 'SKATE';
        const newLetters = currentLetters + letterSequence[currentLetters.length];

        // Update letters
        const updateData: any = isChallenger
          ? { opponent_letters: newLetters }
          : { challenger_letters: newLetters };

        // Check if game is over
        if (newLetters === 'SKATE') {
          updateData.status = 'completed';
          updateData.winner_id = user.id;
          updateData.completed_at = new Date().toISOString();

          // Award XP to winner
          await supabase.rpc('increment_xp', {
            user_id: user.id,
            xp_amount: 100,
          });

          // Create activity
          await supabase.from('activities').insert([
            {
              user_id: user.id,
              activity_type: 'skate_game_won',
              title: 'Won a SKATE game!',
              description: `Defeated ${isChallenger ? game.opponent?.username : game.challenger?.username}`,
              xp_earned: 100,
            },
          ]);
        }

        const { error: updateError } = await supabase
          .from('skate_games')
          .update(updateData)
          .eq('id', gameId);

        if (updateError) throw updateError;
      }

      loadGameData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const forfeitGame = () => {
    Alert.alert(
      'Forfeit Game',
      'Are you sure you want to forfeit? This will give your opponent the win.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: async () => {
            try {
              const isChallenger = game?.challenger_id === user?.id;
              const winnerId = isChallenger ? game?.opponent_id : game?.challenger_id;

              await supabase
                .from('skate_games')
                .update({
                  status: 'completed',
                  winner_id: winnerId,
                  completed_at: new Date().toISOString(),
                })
                .eq('id', gameId);

              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Game not found</Text>
      </View>
    );
  }

  const isChallenger = game.challenger_id === user?.id;
  const opponent = isChallenger ? game.opponent : game.challenger;
  const myLetters = isChallenger ? game.challenger_letters : game.opponent_letters;
  const opponentLetters = isChallenger ? game.opponent_letters : game.challenger_letters;
  const isMyTurn = game.current_turn === user?.id && game.status === 'active';

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

  const renderTurn = ({ item, index }: { item: SkateGameTurn; index: number }) => {
    const isMyTrick = item.player_id === user?.id;
    const needsResponse =
      isMyTurn && index === turns.length - 1 && !isMyTrick && item.matched === null;

    return (
      <View style={[styles.turnCard, isMyTrick && styles.myTurnCard]}>
        <View style={styles.turnHeader}>
          <Text style={styles.turnNumber}>Turn {item.turn_number}</Text>
          <Text style={[styles.playerName, isMyTrick && styles.myPlayerName]}>
            {isMyTrick ? 'You' : item.player?.username}
          </Text>
        </View>

        <Text style={styles.trickName}>{item.trick_name}</Text>

        {item.media && (
          <Video
            source={{ uri: item.media.url }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
          />
        )}

        {item.matched !== null && (
          <View
            style={[styles.resultBadge, item.matched ? styles.matchedBadge : styles.missedBadge]}
          >
            <Text style={styles.resultText}>
              {item.matched ? '✅ Matched!' : '❌ Missed - Letter Added'}
            </Text>
          </View>
        )}

        {needsResponse && (
          <View style={styles.responseButtons}>
            <Text style={styles.responsePrompt}>Did you land this trick?</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.responseButton, styles.yesButton]}
                onPress={() => markTurnResult(item.id, true)}
              >
                <Text style={styles.buttonText}>✅ Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.responseButton, styles.noButton]}
                onPress={() => markTurnResult(item.id, false)}
              >
                <Text style={styles.buttonText}>❌ No</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Game Status Header */}
      <View style={styles.gameHeader}>
        <View style={styles.vsContainer}>
          <Text style={styles.vsLabel}>YOU</Text>
          <Text style={styles.vsText}>vs</Text>
          <Text style={styles.vsLabel}>{opponent?.username?.toUpperCase()}</Text>
        </View>

        <View style={styles.lettersRow}>
          <View style={styles.letterBox}>
            <Text style={styles.letterLabel}>You</Text>
            <Text style={styles.letterDisplay}>{getLettersDisplay(myLetters)}</Text>
          </View>
          <View style={styles.letterBox}>
            <Text style={styles.letterLabel}>Them</Text>
            <Text style={styles.letterDisplay}>{getLettersDisplay(opponentLetters)}</Text>
          </View>
        </View>

        {game.status === 'completed' && (
          <View
            style={[
              styles.gameOverBanner,
              game.winner_id === user?.id ? styles.wonBanner : styles.lostBanner,
            ]}
          >
            <Text style={styles.gameOverText}>
              {game.winner_id === user?.id ? '🏆 YOU WON!' : '😢 YOU LOST'}
            </Text>
          </View>
        )}

        {game.status === 'pending' && (
          <Text style={styles.statusText}>⏳ Waiting for opponent to accept...</Text>
        )}

        {game.status === 'active' && (
          <Text style={styles.statusText}>
            {isMyTurn ? '🎯 Your Turn - Post a trick!' : `⏰ ${opponent?.username}'s Turn`}
          </Text>
        )}
      </View>

      {/* Turn History */}
      <FlatList
        data={turns}
        renderItem={renderTurn}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.turnsList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No turns yet</Text>
            <Text style={styles.emptySubtext}>
              {isMyTurn ? 'Post the first trick!' : 'Waiting for first trick...'}
            </Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {isMyTurn && game.status === 'active' && (
          <TouchableOpacity style={styles.postTrickButton} onPress={pickAndSetVideo}>
            <Text style={styles.postTrickButtonText}>🎬 Post Trick</Text>
          </TouchableOpacity>
        )}

        {game.status === 'active' && (
          <TouchableOpacity style={styles.forfeitButton} onPress={forfeitGame}>
            <Text style={styles.forfeitButtonText}>Forfeit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Post Trick Modal */}
      <Modal
        visible={showTrickModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTrickModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Post Your Trick</Text>

            {videoUri && (
              <Video
                source={{ uri: videoUri }}
                style={styles.previewVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Trick name (e.g., Kickflip)"
              value={trickName}
              onChangeText={setTrickName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowTrickModal(false);
                  setTrickName('');
                  setVideoUri(null);
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitTurn}
                disabled={!trickName.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
  },
  errorText: {
    fontSize: 18,
    color: '#999',
  },
  gameHeader: {
    backgroundColor: '#d2673d',
    padding: 20,
    paddingTop: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  vsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  vsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  vsText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  lettersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  letterBox: {
    alignItems: 'center',
  },
  letterLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 5,
  },
  letterDisplay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: 6,
  },
  gameOverBanner: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  wonBanner: {
    backgroundColor: '#4CAF50',
  },
  lostBanner: {
    backgroundColor: '#ff3b30',
  },
  gameOverText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
  },
  turnsList: {
    padding: 15,
  },
  turnCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  myTurnCard: {
    borderLeftColor: '#d2673d',
    backgroundColor: '#fff9f5',
  },
  turnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  turnNumber: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  myPlayerName: {
    color: '#d2673d',
  },
  trickName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 10,
  },
  resultBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  matchedBadge: {
    backgroundColor: '#e8f5e9',
  },
  missedBadge: {
    backgroundColor: '#ffebee',
  },
  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  responseButtons: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  responsePrompt: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  responseButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
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
  actionBar: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  postTrickButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  postTrickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forfeitButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  forfeitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 15,
  },
  previewVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 15,
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
  submitButton: {
    backgroundColor: '#d2673d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GameDetailScreen;
