import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Plus,
  Radio,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { crewsService, Crew } from '../lib/crewsService';
import {
  crewBattlesService,
  CrewBattle,
  CrewBattleVote,
} from '../lib/crewBattlesService';
import { SkateEvents } from '../lib/analytics';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const DURATIONS = [24, 48, 72] as const;
const QUICK_TRICKS = [
  'Kickflip',
  'Heelflip',
  '360 Flip',
  'Backside 180',
  'Nosegrind',
  'Crooked Grind',
  'Manual',
];

function countdownLabel(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Finalizing';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

function votePercent(a: number, b: number) {
  const total = a + b;
  return total > 0 ? Math.round((a / total) * 100) : 50;
}

function ActiveBattleCard({
  battle,
  myVote,
  voting,
  onVote,
  index,
}: {
  battle: CrewBattle;
  myVote?: CrewBattleVote;
  voting: boolean;
  onVote: (battleId: string, side: 'a' | 'b') => void;
  index: number;
}) {
  const ended = new Date(battle.ends_at).getTime() <= Date.now();
  const pctA = votePercent(battle.votes_a, battle.votes_b);
  const totalVotes = battle.votes_a + battle.votes_b;

  return (
    <View style={[s.battleCard, index % 2 === 1 && s.cardTilt]}>
      <View style={s.cardTape}>
        <Text style={s.cardTapeText}>{ended ? 'FINALIZING' : 'LIVE BATTLE'}</Text>
      </View>

      <View style={s.battleTop}>
        <View style={s.liveBadge}>
          <Radio color={INK} size={12} strokeWidth={3} />
          <Text style={s.liveBadgeText}>{ended ? 'CLOSED' : 'LIVE'}</Text>
        </View>
        <View style={s.timeBadge}>
          <Clock3 color={INK} size={13} strokeWidth={2.8} />
          <Text style={s.timeText}>{countdownLabel(battle.ends_at)}</Text>
        </View>
      </View>

      <Text style={s.battleKicker}>TRICK ON THE LINE</Text>
      <Text style={s.trick}>{battle.trick_name}</Text>

      <View style={s.matchup}>
        <View style={s.crewSide}>
          <View style={s.crewNumber}><Text style={s.crewNumberText}>A</Text></View>
          <Text style={s.crewName} numberOfLines={2}>{battle.crew_a?.name ?? 'Crew A'}</Text>
          <Text style={s.voteCount}>{battle.votes_a} VOTES</Text>
        </View>

        <View style={s.vsStamp}>
          <Swords color={INK} size={21} strokeWidth={2.8} />
          <Text style={s.vsText}>VS</Text>
        </View>

        <View style={[s.crewSide, s.crewSideRight]}>
          <View style={[s.crewNumber, s.crewNumberB]}><Text style={s.crewNumberText}>B</Text></View>
          <Text style={[s.crewName, s.rightText]} numberOfLines={2}>{battle.crew_b?.name ?? 'Crew B'}</Text>
          <Text style={s.voteCount}>{battle.votes_b} VOTES</Text>
        </View>
      </View>

      <View style={s.voteTrack}>
        <View style={[s.voteA, { width: `${pctA}%` }]} />
        <View style={s.voteB} />
      </View>
      <View style={s.voteLabels}>
        <Text style={s.votePercent}>{pctA}%</Text>
        <Text style={s.totalVotes}>{totalVotes} TOTAL VOTES</Text>
        <Text style={s.votePercent}>{100 - pctA}%</Text>
      </View>

      <View style={s.rewardTicket}>
        <Zap color={INK} size={17} strokeWidth={3} />
        <View style={s.rewardCopy}>
          <Text style={s.rewardKicker}>WINNER REWARD</Text>
          <Text style={s.rewardText}>+{battle.reward_xp.toLocaleString()} CREW XP</Text>
        </View>
        <ShieldCheck color={INK} size={17} strokeWidth={2.8} />
      </View>

      {myVote ? (
        <View style={s.lockedVote}>
          <CheckCircle2 color={INK} size={17} strokeWidth={2.8} />
          <Text style={s.lockedVoteText}>
            VOTE LOCKED • {myVote.crew_voted === 'a'
              ? (battle.crew_a?.name ?? 'Crew A').toUpperCase()
              : (battle.crew_b?.name ?? 'Crew B').toUpperCase()}
          </Text>
        </View>
      ) : ended ? (
        <View style={s.closedVote}>
          <Clock3 color={PAPER} size={17} strokeWidth={2.8} />
          <Text style={s.closedVoteText}>VOTING CLOSED • SERVER FINALIZING</Text>
        </View>
      ) : (
        <View style={s.voteButtons}>
          <TouchableOpacity
            style={[s.voteButton, s.voteButtonA, voting && s.disabled]}
            disabled={voting}
            onPress={() => onVote(battle.id, 'a')}
          >
            <Text numberOfLines={1} style={s.voteButtonText}>VOTE {battle.crew_a?.name?.toUpperCase() ?? 'A'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.voteButton, s.voteButtonB, voting && s.disabled]}
            disabled={voting}
            onPress={() => onVote(battle.id, 'b')}
          >
            <Text numberOfLines={1} style={s.voteButtonText}>VOTE {battle.crew_b?.name?.toUpperCase() ?? 'B'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CompletedBattleCard({ battle, index }: { battle: CrewBattle; index: number }) {
  const tied = !battle.winner_crew_id;
  return (
    <View style={[s.completedCard, index % 2 === 1 && s.cardTilt]}>
      <View style={s.completedTop}>
        <View style={s.completedStamp}>
          <Trophy color={INK} size={20} fill={INK} strokeWidth={1.4} />
        </View>
        <View style={s.completedCopy}>
          <Text style={s.completedKicker}>{tied ? 'DRAW' : 'FINAL RESULT'}</Text>
          <Text style={s.completedTrick}>{battle.trick_name}</Text>
        </View>
        <Text style={s.finalScore}>{battle.votes_a}–{battle.votes_b}</Text>
      </View>
      <Text style={s.completedMatch}>{battle.crew_a?.name ?? 'Crew A'} vs {battle.crew_b?.name ?? 'Crew B'}</Text>
      {tied ? (
        <View style={s.resultNote}>
          <Target color={INK} size={15} strokeWidth={2.8} />
          <Text style={s.resultNoteText}>DRAW • NO CREW XP AWARDED</Text>
        </View>
      ) : (
        <View style={s.winnerTicket}>
          <ShieldCheck color={INK} size={17} strokeWidth={2.8} />
          <Text style={s.winnerText}>
            {(battle.winner_crew?.name ?? 'Winner').toUpperCase()} +{battle.reward_xp.toLocaleString()} CREW XP
          </Text>
        </View>
      )}
    </View>
  );
}

function CreateBattleModal({
  visible,
  myCrew,
  opponents,
  onClose,
  onCreated,
}: {
  visible: boolean;
  myCrew?: Crew;
  opponents: Crew[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [opponentId, setOpponentId] = useState('');
  const [trick, setTrick] = useState('');
  const [duration, setDuration] = useState<24 | 48 | 72>(24);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOpponentId('');
      setTrick('');
      setDuration(24);
      setSaving(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!myCrew) {
      Alert.alert('Join a crew first', 'You need a crew before you can start a battle.');
      return;
    }
    if (!opponentId) {
      Alert.alert('Pick an opponent', 'Choose the crew you want to battle.');
      return;
    }
    if (trick.trim().length < 2) {
      Alert.alert('Pick a trick', 'Choose or enter the battle trick.');
      return;
    }

    try {
      setSaving(true);
      await crewBattlesService.create({
        crewAId: myCrew.id,
        crewBId: opponentId,
        trickName: trick.trim(),
        durationHours: duration,
      });
      SkateEvents.crewBattleCreated(trick.trim());
      onCreated();
      onClose();
    } catch (error: any) {
      Alert.alert('Could not start battle', error?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <View style={s.modalStamp}>
              <Swords color={INK} size={25} strokeWidth={2.8} />
            </View>
            <View style={s.modalHeaderCopy}>
              <Text style={s.modalEyebrow}>CREW VS CREW</Text>
              <Text style={s.modalTitle}>START A BATTLE.</Text>
            </View>
            <TouchableOpacity style={s.closeButton} onPress={onClose}>
              <X color={INK} size={20} strokeWidth={2.8} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalScroll}>
            <Text style={s.fieldLabel}>YOUR CREW</Text>
            <View style={s.myCrewBox}>
              <Users color={INK} size={18} strokeWidth={2.8} />
              <Text style={s.myCrewText}>{myCrew?.name ?? 'Join or create a crew first'}</Text>
            </View>

            <Text style={s.fieldLabel}>CALL OUT A CREW</Text>
            {opponents.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                {opponents.map(crew => {
                  const selected = opponentId === crew.id;
                  return (
                    <TouchableOpacity
                      key={crew.id}
                      style={[s.chip, selected && s.chipActive]}
                      onPress={() => setOpponentId(crew.id)}
                    >
                      <Text style={[s.chipText, selected && s.chipTextActive]}>{crew.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={s.noOpponents}>No other crews are available to challenge yet.</Text>
            )}

            <Text style={s.fieldLabel}>TRICK</Text>
            <TextInput
              value={trick}
              onChangeText={setTrick}
              placeholder="Kickflip, crook, line..."
              placeholderTextColor="#858780"
              style={s.input}
              maxLength={80}
            />
            <View style={s.quickGrid}>
              {QUICK_TRICKS.map(item => {
                const selected = trick === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.quickChip, selected && s.quickChipActive]}
                    onPress={() => setTrick(item)}
                  >
                    <Text style={[s.quickText, selected && s.quickTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.fieldLabel}>BATTLE WINDOW</Text>
            <View style={s.durationRow}>
              {DURATIONS.map(hours => {
                const selected = duration === hours;
                return (
                  <TouchableOpacity
                    key={hours}
                    style={[s.durationButton, selected && s.durationActive]}
                    onPress={() => setDuration(hours)}
                  >
                    <Text style={[s.durationText, selected && s.durationTextActive]}>{hours}H</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.secureNote}>
              <ShieldCheck color={INK} size={18} strokeWidth={2.8} />
              <Text style={s.secureNoteText}>Battle creation, votes, and configured XP payout are handled by SkateQuest server RPCs.</Text>
            </View>

            <TouchableOpacity
              style={[s.startButton, (saving || !myCrew || !opponentId || !trick.trim()) && s.disabled]}
              disabled={saving || !myCrew || !opponentId || !trick.trim()}
              onPress={() => void submit()}
            >
              {saving ? (
                <ActivityIndicator color={INK} />
              ) : (
                <>
                  <Swords color={INK} size={18} strokeWidth={3} />
                  <Text style={s.startText}>START LIVE BATTLE</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CrewBattlesScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const [battles, setBattles] = useState<CrewBattle[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [myCrewId, setMyCrewId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<CrewBattleVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const [battleRows, crewResult, userCrewResult, voteRows] = await Promise.all([
        crewBattlesService.getAll(),
        crewsService.getAll(),
        user?.id
          ? crewsService.getUserCrew(user.id)
          : Promise.resolve({ data: null, error: null } as any),
        user?.id ? crewBattlesService.getVotesForUser(user.id) : Promise.resolve([]),
      ]);

      if (crewResult.error) throw crewResult.error;
      if (userCrewResult?.error) throw userCrewResult.error;
      setBattles(battleRows);
      setCrews((crewResult.data ?? []) as Crew[]);
      setMyCrewId(userCrewResult?.data?.crew_id ?? null);
      setMyVotes(voteRows);
    } catch (error: any) {
      Alert.alert('Could not load crew battles', error?.message ?? 'Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
    return crewBattlesService.subscribe(() => void load());
  }, [load]);

  const myCrew = useMemo(() => crews.find(crew => crew.id === myCrewId), [crews, myCrewId]);
  const opponents = useMemo(() => crews.filter(crew => crew.id !== myCrewId), [crews, myCrewId]);
  const activeBattles = useMemo(() => battles.filter(battle => battle.status === 'active'), [battles]);
  const completedBattles = useMemo(() => battles.filter(battle => battle.status === 'completed'), [battles]);
  const liveVotes = useMemo(
    () => activeBattles.reduce((sum, battle) => sum + battle.votes_a + battle.votes_b, 0),
    [activeBattles]
  );

  const vote = async (battleId: string, side: 'a' | 'b') => {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Sign in to vote.');
      return;
    }
    try {
      setVotingId(battleId);
      await crewBattlesService.vote(battleId, side);
      SkateEvents.crewBattleVoted(battleId, side);
      await load();
    } catch (error: any) {
      Alert.alert('Vote not saved', error?.message ?? 'Try again.');
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.loading} edges={['top']}>
        <View style={s.loadingStamp}><Swords color={INK} size={30} strokeWidth={2.8} /></View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>LOADING LIVE CREW BATTLES</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={ORANGE}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />
          <View style={s.heroTop}>
            <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
              <ChevronLeft color={INK} size={23} strokeWidth={3} />
            </TouchableOpacity>
            <View style={s.heroStamp}><Swords color={INK} size={28} strokeWidth={2.8} /></View>
            <TouchableOpacity
              style={[s.addButton, !myCrew && s.disabled]}
              onPress={() => {
                if (myCrew) setShowCreate(true);
                else Alert.alert('Join a crew first', 'Create or join a crew before starting a battle.');
              }}
            >
              <Plus color={INK} size={16} strokeWidth={3} />
              <Text style={s.addText}>BATTLE</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.eyebrow}>CREW REP • COMMUNITY VOTE • SERVER PAYOUT</Text>
          <Text style={s.title}>CREW{`\n`}BATTLES.</Text>
          <Text style={s.subtitle}>Call out another crew on a trick, let the community vote, and put crew XP on the line.</Text>
        </View>

        <View style={s.statsTicket}>
          <View style={s.statCell}>
            <Radio color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{activeBattles.length}</Text>
            <Text style={s.statLabel}>LIVE</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Users color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{liveVotes}</Text>
            <Text style={s.statLabel}>LIVE VOTES</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Trophy color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{completedBattles.length}</Text>
            <Text style={s.statLabel}>FINISHED</Text>
          </View>
        </View>

        <View style={s.myCrewBanner}>
          <View style={s.myCrewIcon}><Users color={INK} size={18} strokeWidth={2.8} /></View>
          <View style={s.myCrewBannerCopy}>
            <Text style={s.myCrewBannerLabel}>YOUR CREW</Text>
            <Text style={s.myCrewBannerName}>{myCrew?.name ?? 'NO CREW JOINED'}</Text>
          </View>
          {myCrew ? (
            <View style={s.readyPill}><Text style={s.readyPillText}>READY</Text></View>
          ) : (
            <View style={s.lockedPill}><Text style={s.lockedPillText}>LOCKED</Text></View>
          )}
        </View>

        <View style={s.sectionHeader}>
          <View>
            <Text style={s.sectionKicker}>CURRENT MATCHUPS</Text>
            <Text style={s.sectionTitle}>LIVE FIGHT CARDS</Text>
          </View>
          {activeBattles.length > 0 ? (
            <View style={s.livePill}><View style={s.liveDot} /><Text style={s.livePillText}>LIVE</Text></View>
          ) : null}
        </View>

        {activeBattles.length > 0 ? (
          activeBattles.map((battle, index) => (
            <ActiveBattleCard
              key={battle.id}
              battle={battle}
              index={index}
              myVote={myVotes.find(voteRow => voteRow.battle_id === battle.id)}
              voting={votingId === battle.id}
              onVote={vote}
            />
          ))
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyStamp}><Swords color={INK} size={28} strokeWidth={2.8} /></View>
            <Text style={s.emptyTitle}>NO LIVE BATTLES</Text>
            <Text style={s.emptyText}>Nothing fake is filled in here. Start a real crew battle when your crew is ready.</Text>
            {myCrew ? (
              <TouchableOpacity style={s.emptyButton} onPress={() => setShowCreate(true)}>
                <Plus color={INK} size={16} strokeWidth={3} />
                <Text style={s.emptyButtonText}>START A BATTLE</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {completedBattles.length > 0 ? (
          <>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>RECENT HISTORY</Text>
                <Text style={s.sectionTitle}>FINAL RESULTS</Text>
              </View>
            </View>
            {completedBattles.slice(0, 12).map((battle, index) => (
              <CompletedBattleCard key={battle.id} battle={battle} index={index} />
            ))}
          </>
        ) : null}
      </ScrollView>

      <CreateBattleModal
        visible={showCreate}
        myCrew={myCrew}
        opponents={opponents}
        onClose={() => setShowCreate(false)}
        onCreated={() => void load()}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  content: { paddingBottom: 118 },

  hero: { minHeight: 303, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 96, right: -105, top: 60, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 225, height: 28, left: -73, bottom: 36, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  heroStamp: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  addButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ORANGE, borderRadius: 13, borderWidth: 2, borderColor: INK, paddingHorizontal: 11 },
  addText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 24 },
  title: { color: PAPER, fontSize: 50, lineHeight: 46, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 310, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 1 },

  myCrewBanner: { marginHorizontal: 14, marginTop: 14, minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#15181E', borderRadius: 17, borderWidth: 1.5, borderColor: '#30343D', paddingHorizontal: 11 },
  myCrewIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  myCrewBannerCopy: { flex: 1 },
  myCrewBannerLabel: { color: '#7E8794', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 },
  myCrewBannerName: { color: PAPER, fontSize: 14, fontWeight: '900', marginTop: 2 },
  readyPill: { backgroundColor: ACID, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  readyPillText: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  lockedPill: { backgroundColor: '#2B3038', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  lockedPillText: { color: '#8B929D', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },

  sectionHeader: { marginHorizontal: 18, marginTop: 27, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  livePillText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },

  battleCard: { marginHorizontal: 14, marginBottom: 14, backgroundColor: PAPER, borderRadius: 23, borderWidth: 2, borderColor: INK, padding: 15, overflow: 'hidden', position: 'relative' },
  cardTilt: { transform: [{ rotate: '0.35deg' }] },
  cardTape: { position: 'absolute', right: -24, top: 20, minWidth: 110, height: 26, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '12deg' }] },
  cardTapeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  battleTop: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 66 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  liveBadgeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 8, paddingVertical: 5 },
  timeText: { color: INK, fontSize: 7, fontWeight: '900' },
  battleKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 1, marginTop: 15 },
  trick: { color: INK, fontSize: 28, lineHeight: 31, fontWeight: '900', letterSpacing: -1.1, marginTop: 2 },
  matchup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  crewSide: { flex: 1, minWidth: 0 },
  crewSideRight: { alignItems: 'flex-end' },
  crewNumber: { width: 31, height: 31, borderRadius: 9, backgroundColor: ORANGE, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  crewNumberB: { backgroundColor: BLUE },
  crewNumberText: { color: INK, fontSize: 9, fontWeight: '900' },
  crewName: { color: INK, fontSize: 14, lineHeight: 17, fontWeight: '900' },
  rightText: { textAlign: 'right' },
  voteCount: { color: '#7B7E78', fontSize: 7, fontWeight: '900', letterSpacing: 0.65, marginTop: 3 },
  vsStamp: { width: 52, height: 57, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  vsText: { color: INK, fontSize: 7, fontWeight: '900', marginTop: 1 },
  voteTrack: { height: 12, flexDirection: 'row', backgroundColor: '#D8D2C7', borderRadius: 999, overflow: 'hidden', borderWidth: 1.5, borderColor: INK, marginTop: 15 },
  voteA: { height: '100%', backgroundColor: ORANGE },
  voteB: { flex: 1, backgroundColor: BLUE },
  voteLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  votePercent: { color: INK, fontSize: 8, fontWeight: '900' },
  totalVotes: { color: '#7A7D77', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.65 },
  rewardTicket: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 10, marginTop: 13 },
  rewardCopy: { flex: 1 },
  rewardKicker: { color: '#626A22', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.75 },
  rewardText: { color: INK, fontSize: 11, fontWeight: '900', marginTop: 1 },
  lockedVote: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, marginTop: 12, paddingHorizontal: 9 },
  lockedVoteText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center', flexShrink: 1 },
  closedVote: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: INK, borderRadius: 13, marginTop: 12, paddingHorizontal: 9 },
  closedVoteText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  voteButtons: { flexDirection: 'row', gap: 7, marginTop: 12 },
  voteButton: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  voteButtonA: { backgroundColor: ORANGE },
  voteButtonB: { backgroundColor: BLUE },
  voteButtonText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },

  completedCard: { marginHorizontal: 14, marginBottom: 11, backgroundColor: PAPER, borderRadius: 19, borderWidth: 2, borderColor: INK, padding: 13 },
  completedTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  completedStamp: { width: 43, height: 43, borderRadius: 12, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  completedCopy: { flex: 1 },
  completedKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  completedTrick: { color: INK, fontSize: 15, fontWeight: '900', marginTop: 2 },
  finalScore: { color: INK, fontSize: 20, fontWeight: '900', letterSpacing: -0.6 },
  completedMatch: { color: '#6C706B', fontSize: 9, fontWeight: '800', marginTop: 8 },
  resultNote: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E9E4DA', borderRadius: 11, paddingHorizontal: 9, marginTop: 10 },
  resultNoteText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  winnerTicket: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACID, borderRadius: 11, borderWidth: 1, borderColor: INK, paddingHorizontal: 9, marginTop: 10 },
  winnerText: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.55, flex: 1 },

  emptyCard: { marginHorizontal: 14, minHeight: 225, borderRadius: 23, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 23 },
  emptyStamp: { width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyTitle: { color: PAPER, fontSize: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: 13 },
  emptyText: { color: '#7F8793', fontSize: 10.5, lineHeight: 16, textAlign: 'center', maxWidth: 280, marginTop: 5 },
  emptyButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 12, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, marginTop: 14 },
  emptyButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.45 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '91%', backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, paddingHorizontal: 16, paddingBottom: 28 },
  modalHandle: { width: 47, height: 5, borderRadius: 999, backgroundColor: '#C6C0B6', alignSelf: 'center', marginTop: 9, marginBottom: 13 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  modalStamp: { width: 50, height: 50, borderRadius: 14, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  modalHeaderCopy: { flex: 1 },
  modalEyebrow: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { color: INK, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  closeButton: { width: 41, height: 41, borderRadius: 12, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 8 },
  fieldLabel: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  myCrewBox: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 11 },
  myCrewText: { color: INK, fontSize: 11, fontWeight: '900', flex: 1 },
  chipsRow: { gap: 7, paddingRight: 8 },
  chip: { minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: INK, backgroundColor: '#E9E4DA', paddingHorizontal: 11 },
  chipActive: { backgroundColor: ORANGE },
  chipText: { color: '#666A65', fontSize: 8, fontWeight: '900' },
  chipTextActive: { color: INK },
  noOpponents: { color: '#777B76', fontSize: 10, lineHeight: 15, fontWeight: '700' },
  input: { minHeight: 49, backgroundColor: '#E9E4DA', borderRadius: 13, borderWidth: 1.5, borderColor: '#CCC4B8', color: INK, paddingHorizontal: 12, fontSize: 12, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  quickChip: { borderRadius: 999, borderWidth: 1.5, borderColor: '#C8C0B5', backgroundColor: '#E9E4DA', paddingHorizontal: 9, paddingVertical: 6 },
  quickChipActive: { backgroundColor: ACID, borderColor: INK },
  quickText: { color: '#747873', fontSize: 7.5, fontWeight: '900' },
  quickTextActive: { color: INK },
  durationRow: { flexDirection: 'row', gap: 7 },
  durationButton: { flex: 1, minHeight: 45, borderRadius: 12, backgroundColor: '#E9E4DA', borderWidth: 1.5, borderColor: '#CCC4B8', alignItems: 'center', justifyContent: 'center' },
  durationActive: { backgroundColor: BLUE, borderColor: INK },
  durationText: { color: '#777A74', fontSize: 9, fontWeight: '900' },
  durationTextActive: { color: INK },
  secureNote: { minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACID, borderRadius: 13, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 10, marginTop: 16 },
  secureNoteText: { color: '#59601F', fontSize: 8.5, lineHeight: 13, fontWeight: '800', flex: 1 },
  startButton: { minHeight: 50, backgroundColor: ORANGE, borderRadius: 14, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 15 },
  startText: { color: INK, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.75 },
});
