import React, { useState, memo } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import { Trophy, Swords, Target, XCircle, Clock3, History } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { SkateGame, SkateGameTurn } from '../types';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const GameDetailScreen = memo(({ route }: any) => {
  const { gameId } = route.params;
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);

  const { data: game, loading: gameLoading, refetch: refetchGame } = useSupabaseQuery<SkateGame>(
    () => skateGameService.getById(gameId),
    [gameId],
    { cacheKey: `game-${gameId}` }
  );

  const { data: turns, loading: turnsLoading, refetch: refetchTurns } = useSupabaseQuery<SkateGameTurn[]>(
    () => skateGameService.getTurns(gameId),
    [gameId],
    { cacheKey: `game-turns-${gameId}` }
  );

  const isChallenger = game?.challenger_id === user?.id;
  const myLetters = isChallenger ? game?.challenger_letters || '' : game?.opponent_letters || '';
  const opponentLetters = isChallenger ? game?.opponent_letters || '' : game?.challenger_letters || '';
  const opponent = isChallenger ? game?.opponent : game?.challenger;
  const isMyTurn = game?.current_turn === user?.id;

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    let display = '';
    for (let i = 0; i < target.length; i++) display += i < letters.length ? letters[i] : '_';
    return display;
  };

  const finishTurn = async (landed: boolean, mediaId?: string) => {
    if (!user || !game || !opponent?.id) return;
    const turnNumber = (turns?.length || 0) + 1;
    await skateGameService.submitTurn({
      game_id: gameId,
      player_id: user.id,
      trick_name: landed ? 'Trick' : 'Missed attempt',
      media_id: mediaId,
      turn_number: turnNumber,
      matched: landed,
    });

    if (landed) {
      await skateGameService.updateGame(gameId, { current_turn: opponent.id });
      Alert.alert('Landed', 'Trick recorded. Your opponent is up.');
    } else {
      const nextLetter = 'SKATE'[myLetters.length];
      const updatedLetters = nextLetter ? `${myLetters}${nextLetter}` : myLetters;
      const completed = updatedLetters.length >= 5;
      const updates: Record<string, any> = {
        current_turn: completed ? null : opponent.id,
        [isChallenger ? 'challenger_letters' : 'opponent_letters']: updatedLetters,
      };
      if (completed) {
        updates.status = 'completed';
        updates.winner_id = opponent.id;
        updates.completed_at = new Date().toISOString();
      }
      await skateGameService.updateGame(gameId, updates);
      Alert.alert(
        completed ? 'Game Over' : `Letter: ${nextLetter}`,
        completed ? `${opponent.username || 'Your opponent'} wins this game of SKATE.` : 'Missed attempt recorded. Turn passed.'
      );
    }
    await Promise.all([refetchGame(), refetchTurns()]);
  };

  const recordTrick = async () => {
    if (!user || !game) return;
    try {
      setUploading(true);
      const result = await pickVideo();
      if (!result) return;
      const videoResult = await uploadVideo(result.uri, 'game_videos', user.id);
      const media = await saveMediaToDatabase(user.id, videoResult, { caption: `SKATE Game vs ${opponent?.username}` });
      await finishTurn(true, media.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const recordMiss = async () => {
    if (!user || !game) return;
    try {
      setUploading(true);
      await finishTurn(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  if (gameLoading || turnsLoading) {
    return (
      <View className="flex-1 bg-[#07090D] p-4 pt-10">
        <LoadingSkeleton height={150} className="mb-4" />
        <LoadingSkeleton height={180} className="mb-4" />
        <LoadingSkeleton height={120} className="mb-4" />
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 bg-[#07090D] justify-center items-center">
        <Swords size={34} color="#596271" />
        <Text className="text-white text-lg font-black mt-3">Game not found</Text>
      </View>
    );
  }

  const completed = game.status === 'completed';
  const won = completed && game.winner_id === user?.id;

  return (
    <ScrollView className="flex-1 bg-[#07090D]" contentContainerStyle={{ paddingBottom: 36 }}>
      <View className="px-5 pt-12 pb-5">
        <Text className="text-[#D2673D] text-[11px] font-black tracking-[2px]">GAME IN PROGRESS</Text>
        <View className="flex-row items-center gap-2 mt-1">
          <Trophy color="#FFD166" size={22} />
          <Text className="text-white text-[30px] font-black">SKATE</Text>
        </View>
        <Text className="text-[#9AA3AF] text-sm mt-1">vs @{opponent?.username || 'opponent'}</Text>

        <View className={`mt-4 rounded-2xl border p-4 ${completed ? (won ? 'bg-[#12331F] border-[#285D39]' : 'bg-[#251112] border-[#532326]') : isMyTurn ? 'bg-[#2B210E] border-[#5E481A]' : 'bg-[#10151D] border-[#252D39]'}`}>
          <View className="flex-row items-center gap-2">
            {completed ? <Trophy size={17} color={won ? '#4ADE80' : '#F87171'} /> : isMyTurn ? <Target size={17} color="#FBBF24" /> : <Clock3 size={17} color="#8B95A5" />}
            <Text className={`font-black text-sm ${completed ? (won ? 'text-[#4ADE80]' : 'text-[#F87171]') : isMyTurn ? 'text-[#FBBF24]' : 'text-[#AEB5C0]'}`}>
              {completed ? (won ? 'YOU WON' : 'YOU LOST') : isMyTurn ? 'YOUR TURN' : `WAITING FOR @${opponent?.username || 'opponent'}`}
            </Text>
          </View>
        </View>
      </View>

      <View className="mx-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4">
        <Text className="text-[#697383] text-[10px] font-black tracking-[1.5px] mb-3">LETTER BOARD</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-[#9AA3AF] text-xs font-black">YOU</Text>
          <Text className="text-white text-[30px] font-black tracking-[10px] font-mono">{getLettersDisplay(myLetters)}</Text>
        </View>
        <View className="h-px bg-[#252D39] my-3" />
        <View className="flex-row items-center justify-between">
          <Text className="text-[#9AA3AF] text-xs font-black">THEM</Text>
          <Text className="text-white text-[30px] font-black tracking-[10px] font-mono">{getLettersDisplay(opponentLetters)}</Text>
        </View>
      </View>

      {game.status === 'active' && isMyTurn ? (
        <View className="mx-4 mt-4">
          <TouchableOpacity disabled={uploading} onPress={recordTrick} className="bg-[#12331F] border border-[#285D39] rounded-2xl py-4 flex-row items-center justify-center gap-2">
            {uploading ? <ActivityIndicator size="small" color="#4ADE80" /> : <Target size={17} color="#4ADE80" />}
            <Text className="text-[#4ADE80] font-black">{uploading ? 'SAVING...' : 'LANDED — UPLOAD TRICK'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={uploading} onPress={recordMiss} className="bg-[#251112] border border-[#532326] rounded-2xl py-4 flex-row items-center justify-center gap-2 mt-2">
            <XCircle size={17} color="#F87171" />
            <Text className="text-[#F87171] font-black">MISSED — TAKE A LETTER</Text>
          </TouchableOpacity>
          <Text className="text-[#596271] text-[11px] text-center mt-2 px-4">Result is self-reported in this game flow. Five misses spells SKATE.</Text>
        </View>
      ) : null}

      {turns && turns.length > 0 ? (
        <View className="mx-4 mt-4 bg-[#10151D] border border-[#252D39] rounded-[22px] p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <History size={17} color="#D2673D" />
            <Text className="text-white text-lg font-black">Turn History</Text>
          </View>
          {turns.map(turn => (
            <View key={turn.id} className="py-3 border-b border-[#252D39] last:border-0">
              <View className="flex-row justify-between items-center mb-2">
                <View>
                  <Text className="text-[#D2673D] text-xs font-black">TURN {turn.turn_number}</Text>
                  <Text className="text-white text-sm font-bold mt-0.5">@{turn.player?.username || 'player'}</Text>
                </View>
                <View className={`px-2.5 py-1 rounded-full border ${turn.matched === false ? 'bg-[#251112] border-[#532326]' : 'bg-[#12331F] border-[#285D39]'}`}>
                  <Text className={`text-[10px] font-black ${turn.matched === false ? 'text-[#F87171]' : 'text-[#4ADE80]'}`}>{turn.matched === false ? 'MISS' : 'LANDED'}</Text>
                </View>
              </View>
              {turn.media?.url ? (
                <View className="rounded-2xl overflow-hidden bg-black">
                  <Video source={{ uri: turn.media.url }} style={{ width: '100%', height: 220 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
});

export default GameDetailScreen;
