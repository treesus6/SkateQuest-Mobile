import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Trophy, Gamepad2, Plus, Swords, ChevronRight, Target } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { SkateGame } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';

export default function SkateGameScreen() {
  const navigation = useNavigation<any>();
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
    if (game.status === 'completed') return game.winner_id === user?.id ? 'YOU WON' : 'YOU LOST';
    if (game.status === 'pending') return 'WAITING';
    return game.current_turn === user?.id ? 'YOUR TURN' : 'THEIR TURN';
  };

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    let display = '';
    for (let i = 0; i < target.length; i++) display += i < letters.length ? letters[i] : '_';
    return display;
  };

  const allGames = games ?? [];
  const activeCount = allGames.filter(g => g.status === 'active').length;
  const wins = allGames.filter(g => g.status === 'completed' && g.winner_id === user?.id).length;

  const renderGame = ({ item }: { item: SkateGame }) => {
    const isChallenger = item.challenger_id === user?.id;
    const opponent = isChallenger ? item.opponent : item.challenger;
    const myLetters = isChallenger ? item.challenger_letters : item.opponent_letters;
    const opponentLetters = isChallenger ? item.opponent_letters : item.challenger_letters;
    const status = getGameStatus(item);
    const isMyTurn = item.status === 'active' && item.current_turn === user?.id;

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GameDetail', { gameId: item.id })} className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-11 h-11 rounded-2xl bg-[#1B1110] border border-[#4E2B22] items-center justify-center">
              <Swords size={20} color="#D2673D" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[17px] font-black">vs @{opponent?.username || 'skater'}</Text>
              <Text className={`text-[10px] font-black tracking-wider mt-1 ${status === 'YOU WON' ? 'text-[#4ADE80]' : status === 'YOU LOST' ? 'text-[#F87171]' : isMyTurn ? 'text-[#FBBF24]' : 'text-[#8B95A5]'}`}>{status}</Text>
            </View>
          </View>
          <ChevronRight size={19} color="#4D5664" />
        </View>

        <View className="bg-[#0B1017] border border-[#202733] rounded-2xl p-3 mt-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-[#7B8493] text-xs font-bold">YOU</Text>
            <Text className="text-white text-2xl font-black tracking-[7px] font-mono">{getLettersDisplay(myLetters)}</Text>
          </View>
          <View className="h-px bg-[#202733] my-2" />
          <View className="flex-row justify-between items-center">
            <Text className="text-[#7B8493] text-xs font-bold">THEM</Text>
            <Text className="text-white text-2xl font-black tracking-[7px] font-mono">{getLettersDisplay(opponentLetters)}</Text>
          </View>
        </View>

        {isMyTurn ? (
          <View className="mt-3 bg-[#12331F] border border-[#285D39] rounded-xl py-3 flex-row items-center justify-center gap-2">
            <Target size={14} color="#4ADE80" />
            <Text className="text-[#4ADE80] text-xs font-black">RECORD YOUR TRICK</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#07090D]">
      <View className="px-5 pt-12 pb-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">HEAD TO HEAD</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Trophy color="#FFD166" size={22} />
              <Text className="text-white text-[30px] font-black">SKATE</Text>
            </View>
            <Text className="text-[#7B8493] text-sm mt-1">Challenge skaters, post tricks, match or take a letter.</Text>
          </View>
          <TouchableOpacity className="bg-[#D2673D] px-4 py-3 rounded-2xl flex-row items-center gap-2" onPress={() => setShowNewGameModal(true)}>
            <Plus color="#fff" size={15} />
            <Text className="text-white font-black text-sm">New</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-2 mt-4">
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Gamepad2 size={16} color="#D2673D" />
            <Text className="text-white text-xl font-black mt-1">{activeCount}</Text>
            <Text className="text-[#697383] text-[11px]">active games</Text>
          </View>
          <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
            <Trophy size={16} color="#FFD166" />
            <Text className="text-white text-xl font-black mt-1">{wins}</Text>
            <Text className="text-[#697383] text-[11px]">wins</Text>
          </View>
        </View>

        <View className="bg-[#0B1017] border border-[#202733] rounded-2xl p-4 mt-4">
          <Text className="text-white text-sm font-black">How it works</Text>
          <Text className="text-[#7B8493] text-xs leading-5 mt-1">Take turns posting trick videos. Miss the match, take a letter. First to spell SKATE loses.</Text>
        </View>
      </View>

      <FlatList
        data={allGames}
        renderItem={renderGame}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="items-center mt-16 px-8">
            <Gamepad2 color="#596271" size={42} />
            <Text className="text-white text-lg font-black mt-4">No games yet</Text>
            <Text className="text-[#697383] text-sm text-center mt-2">Challenge another skater and start a real game of SKATE.</Text>
          </View>
        }
      />

      <Modal visible={showNewGameModal} transparent animationType="slide" onRequestClose={() => setShowNewGameModal(false)}>
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-[#10151D] border border-[#2A303A] rounded-t-[28px] p-5">
            <View className="w-10 h-1 bg-[#343B47] rounded-full self-center mb-4" />
            <Text className="text-[#D2673D] text-[10px] font-black tracking-[1.5px]">START A GAME</Text>
            <Text className="text-white text-[22px] font-black mt-1">Challenge a skater</Text>
            <Text className="text-[#7B8493] text-sm mt-1 mb-4">Enter their exact SkateQuest username.</Text>
            <TextInput
              className="bg-[#090D13] border border-[#252D39] rounded-xl p-3.5 text-base mb-5 text-white"
              placeholder="Opponent username"
              placeholderTextColor="#596271"
              value={opponentUsername}
              onChangeText={setOpponentUsername}
              autoFocus
              autoCapitalize="none"
            />
            <View className="flex-row gap-2.5">
              <TouchableOpacity className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-4 items-center" onPress={() => { setShowNewGameModal(false); setOpponentUsername(''); }}>
                <Text className="text-[#AEB5C0] font-black">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className={`flex-1 rounded-xl py-4 items-center ${opponentUsername.trim() ? 'bg-[#D2673D]' : 'bg-[#353B45]'}`} onPress={createGame} disabled={!opponentUsername.trim()}>
                <Text className="text-white font-black">Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
