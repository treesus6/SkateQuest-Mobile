import React, { memo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Video, ResizeMode } from '../components/VideoPlayer';
import {
  CheckCircle2,
  Clock3,
  History,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { SkateGame, SkateGameTurn } from '../types';
import { pickVideo, saveMediaToDatabase, uploadVideo } from '../lib/mediaUpload';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

const GameDetailScreen = memo(({ route }: any) => {
  const { gameId } = route.params;
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [setTrickName, setSetTrickName] = useState('');

  const {
    data: game,
    loading: gameLoading,
    refetch: refetchGame,
  } = useSupabaseQuery<SkateGame>(
    () => skateGameService.getById(gameId),
    [gameId],
    { cacheKey: `game-${gameId}` }
  );

  const {
    data: turns,
    loading: turnsLoading,
    refetch: refetchTurns,
  } = useSupabaseQuery<SkateGameTurn[]>(
    () => skateGameService.getTurns(gameId),
    [gameId],
    { cacheKey: `game-turns-${gameId}` }
  );

  const isChallenger = game?.challenger_id === user?.id;
  const myLetters = isChallenger
    ? game?.challenger_letters || ''
    : game?.opponent_letters || '';
  const opponentLetters = isChallenger
    ? game?.opponent_letters || ''
    : game?.challenger_letters || '';
  const opponent = isChallenger ? game?.opponent : game?.challenger;
  const isMyTurn = game?.current_turn === user?.id;
  const phase = game?.turn_phase ?? 'set';
  const isMatchPhase = phase === 'match';
  const currentTrick = game?.current_trick_name || '';

  const getLettersDisplay = (letters: string) => {
    return 'SKATE'
      .split('')
      .map((letter, index) => (index < letters.length ? letter : '_'))
      .join('');
  };

  const refetchAll = async () => {
    await Promise.all([refetchGame(), refetchTurns()]);
  };

  const submitResult = async (landed: boolean, mediaId?: string) => {
    if (!user || !game) return;

    const trickName = isMatchPhase ? currentTrick : setTrickName.trim();
    if (!trickName) {
      Alert.alert('Name the trick', 'Enter the trick you are setting before submitting this turn.');
      return;
    }

    const previousPhase = phase;
    const result = (await skateGameService.submitTurn({
      gameId,
      trickName,
      landed,
      mediaId: mediaId ?? null,
    })) as any;

    if (previousPhase === 'set') setSetTrickName('');

    if (result?.status === 'completed') {
      const won = result.winner_id === user.id;
      Alert.alert(
        won ? 'You won SKATE' : 'Game over',
        won
          ? 'The final match was missed. You win the game.'
          : `${opponent?.username || 'Your opponent'} wins this game of SKATE.`
      );
    } else if (previousPhase === 'set') {
      Alert.alert(
        landed ? 'Set landed' : 'Set missed',
        landed
          ? `${opponent?.username || 'Your opponent'} now has to match ${trickName}.`
          : `No letter. The set passes to ${opponent?.username || 'your opponent'}.`
      );
    } else if (landed) {
      Alert.alert('Matched', `You matched ${trickName}. You now get the next set.`);
    } else {
      Alert.alert(
        result?.letter_awarded ? `Letter: ${result.letter_awarded}` : 'Match missed',
        `You missed ${trickName}. ${opponent?.username || 'The setter'} keeps the set.`
      );
    }

    await refetchAll();
  };

  const recordLanded = async () => {
    if (!user || !game || !isMyTurn) return;
    const trickName = isMatchPhase ? currentTrick : setTrickName.trim();
    if (!trickName) {
      Alert.alert('Name the trick', 'Enter the trick you are setting before uploading the landed clip.');
      return;
    }

    try {
      setUploading(true);
      const picked = await pickVideo();
      if (!picked) return;

      const videoResult = await uploadVideo(picked.uri, 'game_videos', user.id);
      const media = await saveMediaToDatabase(user.id, videoResult, {
        caption: `SKATE: ${trickName} vs ${opponent?.username || 'opponent'}`,
        trickName,
      });
      await submitResult(true, media.id);
    } catch (error: any) {
      Alert.alert('Turn not saved', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const recordMiss = async () => {
    if (!user || !game || !isMyTurn) return;
    const trickName = isMatchPhase ? currentTrick : setTrickName.trim();
    if (!trickName) {
      Alert.alert('Name the trick', 'Enter the trick you attempted to set.');
      return;
    }

    try {
      setUploading(true);
      await submitResult(false);
    } catch (error: any) {
      Alert.alert('Turn not saved', error?.message || 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (gameLoading || turnsLoading) {
    return (
      <View style={s.loading}>
        <LoadingSkeleton height={150} className="mb-4" />
        <LoadingSkeleton height={180} className="mb-4" />
        <LoadingSkeleton height={120} className="mb-4" />
      </View>
    );
  }

  if (!game) {
    return (
      <View style={s.notFound}>
        <View style={s.notFoundStamp}>
          <Swords size={31} color={INK} strokeWidth={2.8} />
        </View>
        <Text style={s.notFoundTitle}>GAME NOT FOUND</Text>
      </View>
    );
  }

  const completed = game.status === 'completed';
  const won = completed && game.winner_id === user?.id;
  const statusLabel = completed
    ? won
      ? 'YOU WON'
      : 'YOU LOST'
    : isMyTurn
      ? isMatchPhase
        ? 'YOUR MATCH'
        : 'YOUR SET'
      : isMatchPhase
        ? `WAITING FOR @${opponent?.username || 'OPPONENT'} TO MATCH`
        : `@${opponent?.username || 'OPPONENT'} IS SETTING`;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.hero}>
        <View style={s.orangeSlash} />
        <View style={s.acidSlash} />
        <View style={s.blueOrb} />

        <View style={s.heroTopRow}>
          <View style={s.heroStamp}>
            <Swords color={INK} size={29} strokeWidth={2.8} />
          </View>
          <View style={s.serverChip}>
            <ShieldCheck color={INK} size={12} strokeWidth={3} />
            <Text style={s.serverChipText}>SERVER RULES</Text>
          </View>
        </View>

        <Text style={s.eyebrow}>HEAD TO HEAD • SET → MATCH → LETTER</Text>
        <Text style={s.title}>GAME OF{`\n`}SKATE.</Text>
        <Text style={s.subtitle}>vs @{opponent?.username || 'opponent'}</Text>
      </View>

      <View
        style={[
          s.statusPoster,
          completed && (won ? s.statusPosterWon : s.statusPosterLost),
          !completed && isMyTurn && s.statusPosterTurn,
        ]}
      >
        <View style={s.statusIcon}>
          {completed ? (
            <Trophy color={INK} size={23} strokeWidth={2.8} />
          ) : isMyTurn ? (
            <Target color={INK} size={23} strokeWidth={2.8} />
          ) : (
            <Clock3 color={INK} size={23} strokeWidth={2.8} />
          )}
        </View>
        <View style={s.statusCopy}>
          <Text style={s.statusKicker}>{completed ? 'FINAL RESULT' : phase.toUpperCase()}</Text>
          <Text style={s.statusTitle}>{statusLabel}</Text>
          {!completed && isMatchPhase && currentTrick ? (
            <Text style={s.statusText}>TRICK ON THE LINE: {currentTrick.toUpperCase()}</Text>
          ) : null}
        </View>
      </View>

      <View style={s.letterBoard}>
        <Text style={s.boardKicker}>LETTER BOARD</Text>
        <View style={s.letterRow}>
          <View>
            <Text style={s.letterWho}>YOU</Text>
            <Text style={s.letterCount}>{myLetters.length}/5 LETTERS</Text>
          </View>
          <Text style={s.letters}>{getLettersDisplay(myLetters)}</Text>
        </View>
        <View style={s.letterDivider} />
        <View style={s.letterRow}>
          <View>
            <Text style={s.letterWho}>@{(opponent?.username || 'THEM').toUpperCase()}</Text>
            <Text style={s.letterCount}>{opponentLetters.length}/5 LETTERS</Text>
          </View>
          <Text style={s.letters}>{getLettersDisplay(opponentLetters)}</Text>
        </View>
      </View>

      {game.status === 'active' && isMyTurn ? (
        <View style={s.turnCard}>
          <View style={s.turnHeader}>
            <View style={[s.phaseStamp, { backgroundColor: isMatchPhase ? BLUE : ORANGE }]}>
              {isMatchPhase ? (
                <Target color={INK} size={23} strokeWidth={2.8} />
              ) : (
                <Zap color={INK} size={23} strokeWidth={2.8} />
              )}
            </View>
            <View style={s.turnHeaderCopy}>
              <Text style={s.turnKicker}>{isMatchPhase ? 'DEFENDER' : 'SETTER'}</Text>
              <Text style={s.turnTitle}>
                {isMatchPhase ? 'MATCH THE TRICK' : 'SET THE NEXT TRICK'}
              </Text>
            </View>
          </View>

          {isMatchPhase ? (
            <View style={s.matchTicket}>
              <Text style={s.matchLabel}>YOU MUST MATCH</Text>
              <Text style={s.matchTrick}>{currentTrick || 'Waiting for set'}</Text>
              <Text style={s.matchRule}>Miss this match and the server gives you the next letter.</Text>
            </View>
          ) : (
            <>
              <Text style={s.inputLabel}>TRICK YOU ARE SETTING</Text>
              <TextInput
                value={setTrickName}
                onChangeText={setSetTrickName}
                placeholder="Kickflip, boardslide, tre flip..."
                placeholderTextColor="#8B8D87"
                style={s.trickInput}
                maxLength={80}
              />
              <Text style={s.setRule}>Miss your own set and nobody gets a letter — the set simply passes.</Text>
            </>
          )}

          <TouchableOpacity
            disabled={uploading}
            onPress={() => void recordLanded()}
            style={[s.landedButton, uploading && s.disabled]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={INK} />
            ) : (
              <CheckCircle2 size={18} color={INK} strokeWidth={3} />
            )}
            <Text style={s.landedButtonText}>
              {uploading
                ? 'SAVING TURN...'
                : isMatchPhase
                  ? 'LANDED MATCH — UPLOAD CLIP'
                  : 'LANDED SET — UPLOAD CLIP'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={uploading}
            onPress={() => void recordMiss()}
            style={[s.missButton, uploading && s.disabled]}
          >
            <XCircle size={18} color={INK} strokeWidth={2.8} />
            <Text style={s.missButtonText}>
              {isMatchPhase ? 'MISSED MATCH — TAKE LETTER' : 'MISSED SET — PASS THE SET'}
            </Text>
          </TouchableOpacity>

          <View style={s.serverRuleRail}>
            <ShieldCheck color={INK} size={17} strokeWidth={2.8} />
            <Text style={s.serverRuleText}>
              Letters, next turn, set ownership, and the winner are now calculated atomically on the server.
            </Text>
          </View>
        </View>
      ) : null}

      {turns && turns.length > 0 ? (
        <View style={s.historySection}>
          <View style={s.historyHeader}>
            <View style={s.historyStamp}>
              <History color={INK} size={20} strokeWidth={2.8} />
            </View>
            <View>
              <Text style={s.historyKicker}>THE RECEIPTS</Text>
              <Text style={s.historyTitle}>TURN HISTORY</Text>
            </View>
          </View>

          {turns.map((turn, index) => (
            <View key={turn.id} style={[s.historyCard, index % 2 === 1 && s.historyCardTilt]}>
              <View style={s.historyTop}>
                <View style={s.turnNumberBadge}>
                  <Text style={s.turnNumberText}>{String(turn.turn_number).padStart(2, '0')}</Text>
                </View>
                <View style={s.historyCopy}>
                  <Text style={s.historyPlayer}>@{turn.player?.username || 'player'}</Text>
                  <Text style={s.historyTrick}>{turn.trick_name}</Text>
                </View>
                <View style={[s.resultBadge, turn.matched === false ? s.resultMiss : s.resultLanded]}>
                  <Text style={s.resultBadgeText}>{turn.matched === false ? 'MISS' : 'LANDED'}</Text>
                </View>
              </View>

              {turn.media?.url ? (
                <View style={s.videoFrame}>
                  <Video
                    source={{ uri: turn.media.url }}
                    style={s.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={s.noHistory}>
          <History color={ORANGE} size={25} strokeWidth={2.6} />
          <Text style={s.noHistoryTitle}>NO TURNS RECORDED YET</Text>
          <Text style={s.noHistoryText}>The first real set or miss will appear here.</Text>
        </View>
      )}
    </ScrollView>
  );
});

GameDetailScreen.displayName = 'GameDetailScreen';
export default GameDetailScreen;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 118 },
  loading: { flex: 1, backgroundColor: INK, padding: 16, paddingTop: 42 },
  notFound: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  notFoundStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  notFoundTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 0.8, marginTop: 14 },

  hero: { minHeight: 270, paddingHorizontal: 18, paddingTop: 46, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 94, right: -105, top: 70, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  serverChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  serverChipText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45, marginTop: 25 },
  title: { color: PAPER, fontSize: 49, lineHeight: 45, fontWeight: '900', letterSpacing: -2.8, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, fontWeight: '800', marginTop: 7 },

  statusPoster: { marginHorizontal: 14, marginTop: -9, minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 14, transform: [{ rotate: '-0.4deg' }] },
  statusPosterTurn: { backgroundColor: ACID },
  statusPosterWon: { backgroundColor: ACID },
  statusPosterLost: { backgroundColor: ORANGE },
  statusIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  statusCopy: { flex: 1 },
  statusKicker: { color: '#777A74', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 },
  statusTitle: { color: INK, fontSize: 17, lineHeight: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  statusText: { color: '#5F645F', fontSize: 8.5, fontWeight: '800', marginTop: 3 },

  letterBoard: { marginHorizontal: 14, marginTop: 13, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 14 },
  boardKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginBottom: 7 },
  letterRow: { minHeight: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  letterWho: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  letterCount: { color: '#858780', fontSize: 6.5, fontWeight: '800', marginTop: 2 },
  letters: { color: INK, fontSize: 24, fontWeight: '900', letterSpacing: 7 },
  letterDivider: { height: 1, backgroundColor: '#D8D1C6' },

  turnCard: { marginHorizontal: 14, marginTop: 13, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 14 },
  turnHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseStamp: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  turnHeaderCopy: { flex: 1 },
  turnKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 },
  turnTitle: { color: INK, fontSize: 17, fontWeight: '900', letterSpacing: -0.35, marginTop: 2 },
  matchTicket: { marginTop: 13, backgroundColor: BLUE, borderRadius: 16, borderWidth: 1.5, borderColor: INK, padding: 13 },
  matchLabel: { color: '#274C78', fontSize: 7, fontWeight: '900', letterSpacing: 0.9 },
  matchTrick: { color: INK, fontSize: 24, lineHeight: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  matchRule: { color: '#294D76', fontSize: 9, lineHeight: 14, fontWeight: '700', marginTop: 6 },
  inputLabel: { color: '#7B7F78', fontSize: 7, fontWeight: '900', letterSpacing: 0.85, marginTop: 14, marginBottom: 6 },
  trickInput: { minHeight: 51, backgroundColor: '#EAE5DB', borderRadius: 14, borderWidth: 1.5, borderColor: '#CFC7BB', color: INK, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' },
  setRule: { color: '#747871', fontSize: 8.5, lineHeight: 13, fontWeight: '700', marginTop: 7 },
  landedButton: { minHeight: 51, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: ACID, borderRadius: 14, borderWidth: 2, borderColor: INK, paddingHorizontal: 10 },
  landedButtonText: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.65, textAlign: 'center' },
  missButton: { minHeight: 49, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: ORANGE, borderRadius: 14, borderWidth: 2, borderColor: INK, paddingHorizontal: 10 },
  missButtonText: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.65, textAlign: 'center' },
  disabled: { opacity: 0.5 },
  serverRuleRail: { minHeight: 59, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EAE5DB', borderRadius: 14, borderWidth: 1, borderColor: '#CFC7BB', paddingHorizontal: 10 },
  serverRuleText: { flex: 1, color: '#666A65', fontSize: 8.5, lineHeight: 13, fontWeight: '700' },

  historySection: { marginHorizontal: 14, marginTop: 23 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  historyStamp: { width: 42, height: 42, borderRadius: 12, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  historyKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.9 },
  historyTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.4, marginTop: 1 },
  historyCard: { marginBottom: 10, backgroundColor: PAPER, borderRadius: 18, borderWidth: 1.5, borderColor: INK, padding: 12 },
  historyCardTilt: { transform: [{ rotate: '0.3deg' }] },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  turnNumberBadge: { width: 38, height: 38, borderRadius: 11, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  turnNumberText: { color: INK, fontSize: 9, fontWeight: '900' },
  historyCopy: { flex: 1 },
  historyPlayer: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  historyTrick: { color: INK, fontSize: 14, fontWeight: '900', marginTop: 2 },
  resultBadge: { minWidth: 58, minHeight: 29, borderRadius: 999, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  resultLanded: { backgroundColor: ACID },
  resultMiss: { backgroundColor: ORANGE },
  resultBadgeText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  videoFrame: { height: 220, borderRadius: 15, overflow: 'hidden', backgroundColor: INK, marginTop: 11, borderWidth: 1.5, borderColor: INK },
  video: { width: '100%', height: '100%' },
  noHistory: { marginHorizontal: 14, marginTop: 20, minHeight: 120, borderRadius: 18, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 16 },
  noHistoryTitle: { color: PAPER, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 7 },
  noHistoryText: { color: '#7F8793', fontSize: 9, marginTop: 3 },
});
