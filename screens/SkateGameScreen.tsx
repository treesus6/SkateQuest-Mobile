import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SkateGame } from '../types';

export default function SkateGameScreen({ navigation }: any) {
  const { user } = useAuth();
  const [games, setGames] = useState<SkateGame[]>([]);
  const [, setLoading] = useState(true);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('skate_games')
        .select(
          `
          *,
          challenger:challenger_id(id, username, level, xp),
          opponent:opponent_id(id, username, level, xp)
        `
        )
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
        .from('profiles')
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
      const { error } = await supabase
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
        className="bg-white rounded-xl p-[15px] mb-3 shadow-md"
        onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
      >
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-bold text-[#333]">vs {opponent?.username}</Text>
          <Text className="text-sm font-bold text-brand-orange">{getGameStatus(item)}</Text>
        </View>

        <View className="gap-2 mb-3">
          <View className="flex-row items-center">
            <Text className="text-sm text-[#666] w-[60px]">You:</Text>
            <Text className="text-2xl font-bold text-[#333] font-mono tracking-[8px]">
              {getLettersDisplay(myLetters)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm text-[#666] w-[60px]">Them:</Text>
            <Text className="text-2xl font-bold text-[#333] font-mono tracking-[8px]">
              {getLettersDisplay(opponentLetters)}
            </Text>
          </View>
        </View>

        {item.status === 'active' && item.current_turn === user?.id && (
          <TouchableOpacity className="bg-[#4CAF50] py-3 rounded-lg items-center">
            <Text className="text-white text-base font-bold">🎬 Record Trick</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="flex-row justify-between items-center bg-brand-orange p-[15px] rounded-bl-[15px] rounded-br-[15px]">
        <View>
          <Text className="text-2xl font-bold text-white">🏆 SKATE Game</Text>
          <Text className="text-[13px] text-white opacity-90">Challenge your friends!</Text>
        </View>
        <TouchableOpacity
          className="bg-white px-[15px] py-2 rounded-[20px]"
          onPress={() => setShowNewGameModal(true)}
        >
          <Text className="text-brand-orange font-bold text-sm">+ New</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white m-[15px] p-[15px] rounded-xl shadow-md">
        <Text className="text-base font-bold text-[#333] mb-2">How to Play:</Text>
        <Text className="text-[13px] text-[#666] leading-[20px]">
          1. Challenge a skater to a game of SKATE{'\n'}
          2. Take turns posting trick videos{'\n'}
          3. If you can't match their trick, you get a letter{'\n'}
          4. First to spell SKATE loses!
        </Text>
      </View>

      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item: SkateGame) => item.id}
        contentContainerStyle={{ padding: 15, paddingTop: 0 }}
        ListEmptyComponent={
          <View className="items-center mt-[50px]">
            <Text className="text-lg font-bold text-[#999]">No games yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Challenge someone to SKATE!</Text>
          </View>
        }
      />

      <Modal
        visible={showNewGameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-5">
          <View className="bg-white rounded-[20px] p-5">
            <Text className="text-[22px] font-bold text-[#333] mb-[5px]">New SKATE Game</Text>
            <Text className="text-sm text-[#666] mb-5">Challenge another skater to a game!</Text>

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-5"
              placeholder="Opponent's username"
              value={opponentUsername}
              onChangeText={setOpponentUsername}
              autoFocus
              autoCapitalize="none"
            />

            <View className="flex-row gap-[10px]">
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-[#e0e0e0]"
                onPress={() => {
                  setShowNewGameModal(false);
                  setOpponentUsername('');
                }}
              >
                <Text className="text-[#333] text-base font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-brand-orange"
                onPress={createGame}
                disabled={!opponentUsername.trim()}
              >
                <Text className="text-white text-base font-bold">Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
