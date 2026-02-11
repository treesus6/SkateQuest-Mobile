import React, { useState, useEffect, useRef, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Trophy, Play, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { supabase } from '../lib/supabase';
import { SkateGame, SkateGameTurn } from '../types';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const GameDetailScreen = memo(({ route, navigation }: any) => {
  const { gameId } = route.params;
  const { user } = useAuthStore();
  const videoRef = useRef<Video>(null);
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
    for (let i = 0; i < target.length; i++) {
      display += i < letters.length ? letters[i] : '_';
    }
    return display;
  };

  const recordTrick = async () => {
    if (!user || !game) return;

    try {
      setUploading(true);
      const result = await pickVideo();
      if (!result) { setUploading(false); return; }

      const videoResult = await uploadVideo(result.uri, 'game_videos', user.id);
      const media = await saveMediaToDatabase(user.id, videoResult, {
        caption: `SKATE Game vs ${opponent?.username}`,
      });

      await skateGameService.submitTurn({
        game_id: gameId,
        player_id: user.id,
        trick_name: 'Trick',
        media_id: media.id,
        turn_number: (turns?.length || 0) + 1,
      });

      Alert.alert('Success', 'Trick recorded! Waiting for opponent response.');
      refetchGame();
      refetchTurns();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  if (gameLoading || turnsLoading) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 p-4">
        <LoadingSkeleton height={120} className="mb-4" />
        <LoadingSkeleton height={200} className="mb-4" />
        <LoadingSkeleton height={80} className="mb-4" />
      </View>
    );
  }

  if (!game) {
    return (
      <View className="flex-1 bg-brand-beige dark:bg-gray-900 justify-center items-center">
        <Text className="text-lg text-gray-400">Game not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-brand-beige dark:bg-gray-900">
      {/* Game Status Header */}
      <View className="bg-brand-terracotta p-5 items-center">
        <View className="flex-row items-center gap-2 mb-2">
          <Trophy color="#fff" size={24} />
          <Text className="text-2xl font-bold text-white">SKATE</Text>
        </View>
        <Text className="text-base text-white/90">
          vs {opponent?.username || 'Opponent'}
        </Text>
        {game.status === 'completed' && (
          <View className={`mt-3 px-4 py-2 rounded-full ${game.winner_id === user?.id ? 'bg-brand-green' : 'bg-red-500'}`}>
            <Text className="text-white font-bold text-lg">
              {game.winner_id === user?.id ? 'YOU WON!' : 'YOU LOST'}
            </Text>
          </View>
        )}
      </View>

      {/* Letters Display */}
      <Card className="mx-4 mt-4">
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">You</Text>
            <Text className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-[12px] font-mono">
              {getLettersDisplay(myLetters)}
            </Text>
          </View>
          <View className="h-px bg-gray-200 dark:bg-gray-700" />
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">{opponent?.username || 'Them'}</Text>
            <Text className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-[12px] font-mono">
              {getLettersDisplay(opponentLetters)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Turn Action */}
      {game.status === 'active' && isMyTurn && (
        <View className="mx-4 mt-4">
          <Button
            title={uploading ? 'Uploading...' : 'Record Your Trick'}
            onPress={recordTrick}
            variant="primary"
            size="lg"
            className="bg-brand-green"
            disabled={uploading}
          />
        </View>
      )}

      {game.status === 'active' && !isMyTurn && (
        <Card className="mx-4 items-center">
          <Text className="text-base font-semibold text-gray-500 dark:text-gray-400">
            Waiting for {opponent?.username}'s turn...
          </Text>
        </Card>
      )}

      {/* Turn History */}
      {turns && turns.length > 0 && (
        <Card className="mx-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Turn History</Text>
          {turns.map((turn, index) => (
            <View key={turn.id} className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base font-bold text-brand-terracotta">
                  Turn {turn.turn_number} - {turn.player?.username || 'Player'}
                </Text>
                <Text className="text-sm text-gray-400">{turn.trick_name}</Text>
              </View>
              {turn.media?.url && (
                <Video
                  source={{ uri: turn.media.url }}
                  style={{ width: '100%', height: 200, borderRadius: 12 }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              )}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
});

export default GameDetailScreen;
