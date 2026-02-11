import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Trophy, Gamepad2, Plus } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { SkateGame } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function SkateGameScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState('');

  const { data: games, refetch } = useSupabaseQuery<SkateGame[]>(
    () => skateGameService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `skate-games-${user?.id}`, enabled: !!user }
  );

  const createGame = async () => {
    if (!opponentUsername.trim() || !user) return;

    try {
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

      const { error } = await skateGameService.create(user.id, opponentData.id);
      if (error) throw error;

      Alert.alert('Success', `Game created! Challenge ${opponentUsername} to SKATE!`);
      setShowNewGameModal(false);
      setOpponentUsername('');
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getGameStatus = (game: SkateGame) => {
    if (game.status === 'completed') {
      return game.winner_id === user?.id ? 'YOU WON!' : 'YOU LOST';
    }
    if (game.status === 'pending') return 'Waiting...';
    return game.current_turn === user?.id ? 'Your Turn' : "Their Turn";
  };

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    let display = '';
    for (let i = 0; i < target.length; i++) {
      display += i < letters.length ? letters[i] : '_';
    }
    return display;
  };

  const renderGame = ({ item }: { item: SkateGame }) => {
    const isChallenger = item.challenger_id === user?.id;
    const opponent = isChallenger ? item.opponent : item.challenger;
    const myLetters = isChallenger ? item.challenger_letters : item.opponent_letters;
    const opponentLetters = isChallenger ? item.opponent_letters : item.challenger_letters;

    return (
      <TouchableOpacity onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}>
        <Card>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              vs {opponent?.username}
            </Text>
            <Text className="text-sm font-bold text-brand-terracotta">{getGameStatus(item)}</Text>
          </View>

          <View className="gap-2 mb-3">
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500 w-[60px]">You:</Text>
              <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-[8px] font-mono">
                {getLettersDisplay(myLetters)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm text-gray-500 w-[60px]">Them:</Text>
              <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-[8px] font-mono">
                {getLettersDisplay(opponentLetters)}
              </Text>
            </View>
          </View>

          {item.status === 'active' && item.current_turn === user?.id && (
            <Button title="Record Trick" variant="primary" size="sm" className="bg-brand-green" onPress={() => navigation.navigate('GameDetail', { gameId: item.id })} />
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center gap-2">
            <Trophy color="#fff" size={22} />
            <Text className="text-2xl font-bold text-white">SKATE Game</Text>
          </View>
          <Text className="text-sm text-white/90 mt-0.5">Challenge your friends!</Text>
        </View>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full flex-row items-center gap-1.5"
          onPress={() => setShowNewGameModal(true)}
        >
          <Plus color="#d2673d" size={14} />
          <Text className="text-brand-terracotta font-bold text-sm">New</Text>
        </TouchableOpacity>
      </View>

      <Card className="mx-4 mt-4">
        <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">How to Play:</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 leading-5">
          1. Challenge a skater to a game of SKATE{'\n'}
          2. Take turns posting trick videos{'\n'}
          3. If you can't match their trick, you get a letter{'\n'}
          4. First to spell SKATE loses!
        </Text>
      </Card>

      <FlatList
        data={games ?? []}
        renderItem={renderGame}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Gamepad2 color="#ccc" size={48} />
            <Text className="text-lg font-bold text-gray-400 mt-3">No games yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Challenge someone to SKATE!</Text>
          </View>
        }
      />

      <Modal
        visible={showNewGameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-5">
            <Text className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mb-1">New SKATE Game</Text>
            <Text className="text-sm text-gray-500 mb-5">Challenge another skater to a game!</Text>

            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-5 text-gray-800 dark:text-gray-100"
              placeholder="Opponent's username"
              placeholderTextColor="#999"
              value={opponentUsername}
              onChangeText={setOpponentUsername}
              autoFocus
              autoCapitalize="none"
            />

            <View className="flex-row gap-2.5">
              <Button
                title="Cancel"
                onPress={() => { setShowNewGameModal(false); setOpponentUsername(''); }}
                variant="secondary"
                size="lg"
                className="flex-1"
              />
              <Button
                title="Challenge"
                onPress={createGame}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={!opponentUsername.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
