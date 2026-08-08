import React, { useMemo, useState, memo } from 'react';
import { View, Text, ScrollView, Alert, TextInput } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Trophy, Check, X } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { deriveGameState, applyJudgment } from '../lib/skateGameLogic';
import { SkateGame, SkateGameTurn } from '../types';
import { pickVideo, uploadVideo, saveMediaToDatabase } from '../lib/mediaUpload';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const GameDetailScreen = memo(({ route }: any) => {
  const { gameId } = route.params;
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [trickName, setTrickName] = useState('');

  const {
    data: game,
    loading: gameLoading,
    refetch: refetchGame,
  } = useSupabaseQuery<SkateGame>(() => skateGameService.getById(gameId), [gameId], {
    cacheKey: `game-${gameId}`,
  });

  const {
    data: turns,
    loading: turnsLoading,
    refetch: refetchTurns,
  } = useSupabaseQuery<SkateGameTurn[]>(() => skateGameService.getTurns(gameId), [gameId], {
    cacheKey: `game-turns-${gameId}`,
  });

  const isChallenger = game?.challenger_id === user?.id;
  const myLetters = isChallenger ? game?.challenger_letters || '' : game?.opponent_letters || '';
  const opponentLetters = isChallenger
    ? game?.opponent_letters || ''
    : game?.challenger_letters || '';
  const opponent = isChallenger ? game?.opponent : game?.challenger;

  const gameState = useMemo(() => {
    if (!game) return null;
    return deriveGameState(game, turns ?? []);
  }, [game, turns]);

  const pendingTurn = useMemo(() => {
    if (!gameState?.pendingTurn) return null;
    return turns?.find(t => t.id === gameState.pendingTurn!.id) ?? null;
  }, [gameState, turns]);

  const isMyAction = !!user && gameState?.actorId === user.id;

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    let display = '';
    for (let i = 0; i < target.length; i++) {
      display += i < letters.length ? letters[i] : '_';
    }
    return display;
  };

  const refetchAll = () => {
    refetchGame();
    refetchTurns();
  };

  const setTrick = async () => {
    if (!user || !game || !trickName.trim() || !opponent?.id) return;

    try {
      setUploading(true);
      const result = await pickVideo();
      if (!result) return;

      const videoResult = await uploadVideo(result.uri, 'game_videos', user.id);
      const media = await saveMediaToDatabase(user.id, videoResult, {
        caption: `SKATE Game vs ${opponent.username}: ${trickName.trim()}`,
      });

      await skateGameService.submitTurn({
        game_id: gameId,
        player_id: user.id,
        trick_name: trickName.trim(),
        media_id: media.id,
        turn_number: (turns?.length || 0) + 1,
      });

      await skateGameService.updateGame(gameId, { current_turn: opponent.id });

      setTrickName('');
      Alert.alert('Trick set!', `Waiting for ${opponent.username} to match it.`);
      refetchAll();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const submitResponse = async () => {
    if (!user || !game || !gameState?.pendingTrick || !gameState.setterId) return;

    try {
      setUploading(true);
      const result = await pickVideo();
      if (!result) return;

      const videoResult = await uploadVideo(result.uri, 'game_videos', user.id);
      const media = await saveMediaToDatabase(user.id, videoResult, {
        caption: `SKATE Game vs ${opponent?.username}: ${gameState.pendingTrick}`,
      });

      await skateGameService.submitTurn({
        game_id: gameId,
        player_id: user.id,
        trick_name: gameState.pendingTrick,
        media_id: media.id,
        turn_number: (turns?.length || 0) + 1,
      });

      // Hand it back to the setter — they need to judge this attempt.
      await skateGameService.updateGame(gameId, { current_turn: gameState.setterId });

      Alert.alert('Attempt recorded!', `Waiting for ${opponent?.username} to judge it.`);
      refetchAll();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const judge = async (matched: boolean) => {
    if (!game || !pendingTurn) return;

    try {
      const { gameUpdate } = applyJudgment(game, pendingTurn, matched);
      await skateGameService.judgeTurn(pendingTurn.id, matched);
      await skateGameService.updateGame(gameId, gameUpdate);
      refetchAll();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (gameLoading || turnsLoading || !gameState) {
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
        <Text className="text-base text-white/90">vs {opponent?.username || 'Opponent'}</Text>
        {game.status === 'completed' && (
          <View
            className={`mt-3 px-4 py-2 rounded-full ${game.winner_id === user?.id ? 'bg-brand-green' : 'bg-red-500'}`}
          >
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
            <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {opponent?.username || 'Them'}
            </Text>
            <Text className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-[12px] font-mono">
              {getLettersDisplay(opponentLetters)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Turn Action */}
      {gameState.phase === 'set' && isMyAction && (
        <Card className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
            Set a trick for {opponent?.username} to match
          </Text>
          <TextInput
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 text-gray-800 dark:text-gray-100"
            placeholder="Trick name (e.g. Kickflip)"
            placeholderTextColor="#999"
            value={trickName}
            onChangeText={setTrickName}
          />
          <Button
            title={uploading ? 'Uploading...' : 'Record & Set Trick'}
            onPress={setTrick}
            variant="primary"
            size="lg"
            className="bg-brand-green"
            disabled={uploading || !trickName.trim()}
          />
        </Card>
      )}

      {gameState.phase === 'respond' && isMyAction && (
        <Card className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
            Match this trick: {gameState.pendingTrick}
          </Text>
          <Button
            title={uploading ? 'Uploading...' : 'Record Your Attempt'}
            onPress={submitResponse}
            variant="primary"
            size="lg"
            className="bg-brand-green"
            disabled={uploading}
          />
        </Card>
      )}

      {gameState.phase === 'judge' && isMyAction && pendingTurn && (
        <Card className="mx-4 mt-4">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
            Did {opponent?.username} land "{pendingTurn.trick_name}"?
          </Text>
          {pendingTurn.media?.url && (
            <Video
              source={{ uri: pendingTurn.media.url }}
              style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12 }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          )}
          <View className="flex-row gap-2.5">
            <Button
              title="Landed It"
              onPress={() => judge(true)}
              variant="primary"
              size="lg"
              className="flex-1 bg-brand-green"
            />
            <Button
              title="Missed It"
              onPress={() => judge(false)}
              variant="primary"
              size="lg"
              className="flex-1 bg-red-500"
            />
          </View>
        </Card>
      )}

      {gameState.phase !== 'completed' && !isMyAction && (
        <Card className="mx-4 mt-4 items-center">
          <Text className="text-base font-semibold text-gray-500 dark:text-gray-400">
            {gameState.phase === 'set' && `Waiting for ${opponent?.username} to set a trick...`}
            {gameState.phase === 'respond' &&
              `Waiting for ${opponent?.username} to match "${gameState.pendingTrick}"...`}
            {gameState.phase === 'judge' &&
              `Waiting for ${opponent?.username} to judge your attempt...`}
          </Text>
        </Card>
      )}

      {/* Turn History */}
      {turns && turns.length > 0 && (
        <Card className="mx-4 mt-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">
            Turn History
          </Text>
          {turns.map(turn => (
            <View
              key={turn.id}
              className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-base font-bold text-brand-terracotta">
                  Turn {turn.turn_number} - {turn.player?.username || 'Player'}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm text-gray-400">{turn.trick_name}</Text>
                  {turn.matched === true && <Check color="#16a34a" size={16} />}
                  {turn.matched === false && <X color="#dc2626" size={16} />}
                </View>
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
