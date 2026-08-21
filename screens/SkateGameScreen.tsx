import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronRight,
  Gamepad2,
  Plus,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { skateGameService } from '../lib/skateGameService';
import { SkateGame } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

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
        Alert.alert('User not found', 'Check the exact SkateQuest username and try again.');
        return;
      }
      if (opponentData.id === user.id) {
        Alert.alert('Pick another skater', 'You cannot challenge yourself.');
        return;
      }

      const { error } = await skateGameService.create(user.id, opponentData.id);
      if (error) throw error;
      Alert.alert('Challenge sent', `Game created with @${opponentUsername.trim()}.`);
      setShowNewGameModal(false);
      setOpponentUsername('');
      refetch();
    } catch (error: any) {
      Alert.alert('Game not created', error?.message || 'Please try again.');
    }
  };

  const getGameStatus = (game: SkateGame) => {
    if (game.status === 'completed') return game.winner_id === user?.id ? 'YOU WON' : 'YOU LOST';
    if (game.status === 'pending') return 'WAITING';
    return game.current_turn === user?.id ? 'YOUR TURN' : 'THEIR TURN';
  };

  const getLettersDisplay = (letters: string) => {
    const target = 'SKATE';
    return target
      .split('')
      .map((letter, index) => (index < letters.length ? letter : '_'))
      .join('');
  };

  const allGames = games ?? [];
  const activeCount = allGames.filter(game => game.status === 'active').length;
  const wins = allGames.filter(
    game => game.status === 'completed' && game.winner_id === user?.id
  ).length;
  const pendingCount = allGames.filter(game => game.status === 'pending').length;
  const myTurnCount = useMemo(
    () => allGames.filter(game => game.status === 'active' && game.current_turn === user?.id).length,
    [allGames, user?.id]
  );

  const renderGame = ({ item, index }: { item: SkateGame; index: number }) => {
    const isChallenger = item.challenger_id === user?.id;
    const opponent = isChallenger ? item.opponent : item.challenger;
    const myLetters = isChallenger ? item.challenger_letters : item.opponent_letters;
    const opponentLetters = isChallenger ? item.opponent_letters : item.challenger_letters;
    const status = getGameStatus(item);
    const isMyTurn = item.status === 'active' && item.current_turn === user?.id;
    const won = status === 'YOU WON';
    const lost = status === 'YOU LOST';
    const accent = won ? ACID : lost ? ORANGE : isMyTurn ? BLUE : index % 2 === 0 ? ORANGE : ACID;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
        style={[s.gameCard, index % 2 === 1 && s.gameCardTilt]}
      >
        <View style={[s.gameStripe, { backgroundColor: accent }]} />
        <View style={s.gameTop}>
          <View style={[s.gameStamp, { backgroundColor: accent }]}>
            <Swords color={INK} size={22} strokeWidth={2.8} />
          </View>
          <View style={s.gameCopy}>
            <Text style={s.gameKicker}>HEAD TO HEAD</Text>
            <Text style={s.opponentName}>vs @{opponent?.username || 'skater'}</Text>
            <Text
              style={[
                s.gameStatus,
                won && s.gameStatusWon,
                lost && s.gameStatusLost,
                isMyTurn && s.gameStatusTurn,
              ]}
            >
              {status}
            </Text>
          </View>
          <ChevronRight color={INK} size={20} strokeWidth={3} />
        </View>

        <View style={s.letterBoard}>
          <View style={s.letterRow}>
            <Text style={s.letterLabel}>YOU</Text>
            <Text style={s.letters}>{getLettersDisplay(myLetters)}</Text>
          </View>
          <View style={s.letterDivider} />
          <View style={s.letterRow}>
            <Text style={s.letterLabel}>THEM</Text>
            <Text style={s.letters}>{getLettersDisplay(opponentLetters)}</Text>
          </View>
        </View>

        {isMyTurn ? (
          <View style={s.turnBanner}>
            <Target color={INK} size={17} strokeWidth={2.8} />
            <View style={s.turnCopy}>
              <Text style={s.turnTitle}>YOUR MOVE</Text>
              <Text style={s.turnText}>Open the match and record the trick for this turn.</Text>
            </View>
            <ChevronRight color={INK} size={18} strokeWidth={3} />
          </View>
        ) : item.status === 'pending' ? (
          <View style={s.waitingBanner}>
            <Zap color={INK} size={16} strokeWidth={2.8} />
            <Text style={s.waitingText}>CHALLENGE WAITING TO START</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <FlatList
        data={allGames}
        renderItem={renderGame}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.orangeSlash} />
              <View style={s.acidSlash} />
              <View style={s.blueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.heroStamp}>
                  <Swords color={INK} size={29} strokeWidth={2.8} />
                </View>
                <TouchableOpacity
                  style={s.newGameButton}
                  onPress={() => setShowNewGameModal(true)}
                >
                  <Plus color={INK} size={16} strokeWidth={3} />
                  <Text style={s.newGameButtonText}>NEW GAME</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.eyebrow}>REAL HEAD-TO-HEAD SKATEQUEST MATCHES</Text>
              <Text style={s.title}>GAME OF{`\n`}SKATE.</Text>
              <Text style={s.subtitle}>
                Challenge another skater, take turns posting tricks, and be the last one standing before SKATE fills up.
              </Text>
            </View>

            <View style={s.statsTicket}>
              <View style={s.statCell}>
                <Gamepad2 color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{activeCount}</Text>
                <Text style={s.statLabel}>ACTIVE</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Target color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{myTurnCount}</Text>
                <Text style={s.statLabel}>YOUR TURN</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Trophy color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{wins}</Text>
                <Text style={s.statLabel}>WINS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Zap color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{pendingCount}</Text>
                <Text style={s.statLabel}>WAITING</Text>
              </View>
            </View>

            <View style={s.rulesPoster}>
              <View style={s.rulesStamp}>
                <ShieldCheck color={INK} size={22} strokeWidth={2.8} />
              </View>
              <View style={s.rulesCopy}>
                <Text style={s.rulesKicker}>HOW THE MATCH WORKS</Text>
                <Text style={s.rulesTitle}>SET IT. MATCH IT. TAKE A LETTER.</Text>
                <Text style={s.rulesText}>
                  Take turns posting trick videos. Miss the match, take a letter. First skater to spell SKATE loses.
                </Text>
              </View>
            </View>

            {allGames.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionKicker}>YOUR MATCH BOARD</Text>
                  <Text style={s.sectionTitle}>LIVE + RECENT GAMES</Text>
                </View>
                <View style={s.matchCountBadge}>
                  <Text style={s.matchCountText}>{allGames.length} MATCHES</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyStamp}>
              <Gamepad2 color={INK} size={31} strokeWidth={2.8} />
            </View>
            <Text style={s.emptyKicker}>NO MATCHES YET</Text>
            <Text style={s.emptyTitle}>CALL SOMEBODY OUT</Text>
            <Text style={s.emptyText}>
              Start a real game of SKATE with another SkateQuest user.
            </Text>
            <TouchableOpacity
              style={s.emptyButton}
              onPress={() => setShowNewGameModal(true)}
            >
              <Plus color={INK} size={16} strokeWidth={3} />
              <Text style={s.emptyButtonText}>START A GAME</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={showNewGameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewGameModal(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <View style={s.modalTopRow}>
              <View style={s.modalStamp}>
                <Swords color={INK} size={25} strokeWidth={2.8} />
              </View>
              <View style={s.modalCopy}>
                <Text style={s.modalKicker}>START A REAL MATCH</Text>
                <Text style={s.modalTitle}>CHALLENGE A SKATER</Text>
              </View>
            </View>

            <Text style={s.modalHelp}>
              Enter their exact SkateQuest username. The game is created against their real profile.
            </Text>
            <TextInput
              style={s.modalInput}
              placeholder="Opponent username"
              placeholderTextColor="#8A8D86"
              value={opponentUsername}
              onChangeText={setOpponentUsername}
              autoFocus
              autoCapitalize="none"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelButton}
                onPress={() => {
                  setShowNewGameModal(false);
                  setOpponentUsername('');
                }}
              >
                <Text style={s.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.challengeButton, !opponentUsername.trim() && s.disabled]}
                onPress={() => void createGame()}
                disabled={!opponentUsername.trim()}
              >
                <Swords color={INK} size={16} strokeWidth={2.8} />
                <Text style={s.challengeButtonText}>CHALLENGE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 305, paddingHorizontal: 18, paddingTop: 46, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 94, right: -105, top: 70, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 35, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  newGameButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 11, paddingVertical: 8 },
  newGameButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45, marginTop: 27 },
  title: { color: PAPER, fontSize: 50, lineHeight: 46, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 96, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#74766F', fontSize: 6.2, fontWeight: '900', letterSpacing: 0.6, marginTop: 1, textAlign: 'center' },

  rulesPoster: { marginHorizontal: 14, marginTop: 18, minHeight: 105, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: ORANGE, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14, transform: [{ rotate: '-0.35deg' }] },
  rulesStamp: { width: 49, height: 49, borderRadius: 14, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  rulesCopy: { flex: 1 },
  rulesKicker: { color: '#753923', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  rulesTitle: { color: INK, fontSize: 13, fontWeight: '900', letterSpacing: -0.25, marginTop: 2 },
  rulesText: { color: '#593123', fontSize: 9.5, lineHeight: 14, fontWeight: '700', marginTop: 4 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 25, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  matchCountBadge: { minHeight: 31, borderRadius: 999, backgroundColor: '#171A20', borderWidth: 1.5, borderColor: '#30343D', paddingHorizontal: 10, justifyContent: 'center' },
  matchCountText: { color: '#8B929E', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },

  gameCard: { marginHorizontal: 14, marginBottom: 12, backgroundColor: PAPER, borderRadius: 21, borderWidth: 2, borderColor: INK, padding: 14, overflow: 'hidden', position: 'relative' },
  gameCardTilt: { transform: [{ rotate: '0.35deg' }] },
  gameStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  gameTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 3 },
  gameStamp: { width: 47, height: 47, borderRadius: 14, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  gameCopy: { flex: 1 },
  gameKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  opponentName: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  gameStatus: { color: '#737871', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.75, marginTop: 3 },
  gameStatusWon: { color: '#51851A' },
  gameStatusLost: { color: '#A6442F' },
  gameStatusTurn: { color: '#2D669D' },

  letterBoard: { marginTop: 14, backgroundColor: INK, borderRadius: 15, borderWidth: 2, borderColor: INK, overflow: 'hidden' },
  letterRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  letterLabel: { color: '#9098A4', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  letters: { color: PAPER, fontSize: 24, fontWeight: '900', letterSpacing: 7 },
  letterDivider: { height: 1, backgroundColor: '#2C313A' },

  turnBanner: { minHeight: 58, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 14, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 11 },
  turnCopy: { flex: 1 },
  turnTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  turnText: { color: '#606722', fontSize: 8.5, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  waitingBanner: { minHeight: 44, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EAE5DB', borderRadius: 13, borderWidth: 1, borderColor: '#CFC7BA' },
  waitingText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },

  empty: { marginHorizontal: 14, marginTop: 28, minHeight: 235, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 14 },
  emptyTitle: { color: PAPER, fontSize: 16, fontWeight: '900', letterSpacing: 0.65, marginTop: 3 },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 270 },
  emptyButton: { minHeight: 45, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 12, borderWidth: 2, borderColor: INK, paddingHorizontal: 15 },
  emptyButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, padding: 18, paddingBottom: 28 },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C8C1B5', alignSelf: 'center', marginBottom: 15 },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  modalStamp: { width: 50, height: 50, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  modalCopy: { flex: 1 },
  modalKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  modalTitle: { color: INK, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  modalHelp: { color: '#666A65', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 14 },
  modalInput: { minHeight: 52, marginTop: 11, backgroundColor: '#EAE5DB', borderRadius: 14, borderWidth: 1.5, borderColor: '#CFC7BB', color: INK, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  challengeButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, borderWidth: 2, borderColor: INK, backgroundColor: ORANGE },
  challengeButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.45 },
});
