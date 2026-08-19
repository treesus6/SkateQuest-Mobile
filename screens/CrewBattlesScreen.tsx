import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Plus,
  Radio,
  ShieldCheck,
  Swords,
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

const ACCENT = '#D2673D';
const BG = '#05070B';
const CARD = '#101722';
const BORDER = '#202B3A';
const DURATIONS = [24, 48, 72] as const;
const QUICK_TRICKS = ['Kickflip', 'Heelflip', '360 Flip', 'Backside 180', 'Nosegrind', 'Crooked Grind', 'Manual'];

function countdownLabel(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Finalizing';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

function VoteBar({ a, b }: { a: number; b: number }) {
  const total = a + b;
  const pctA = total > 0 ? (a / total) * 100 : 50;
  return (
    <View style={s.voteTrack}>
      <View style={[s.voteA, { width: `${pctA}%` }]} />
      <View style={s.voteB} />
    </View>
  );
}

function ActiveBattleCard({
  battle,
  myVote,
  voting,
  onVote,
}: {
  battle: CrewBattle;
  myVote?: CrewBattleVote;
  voting: boolean;
  onVote: (battleId: string, side: 'a' | 'b') => void;
}) {
  const ended = new Date(battle.ends_at).getTime() <= Date.now();
  return (
    <View style={s.battleCard}>
      <View style={s.battleTop}>
        <View style={s.liveBadge}>
          <Radio color="#72E39C" size={12} />
          <Text style={s.liveBadgeText}>{ended ? 'FINALIZING' : 'LIVE BATTLE'}</Text>
        </View>
        <View style={s.timeBadge}>
          <Clock color="#A9B4C4" size={12} />
          <Text style={s.timeText}>{countdownLabel(battle.ends_at)}</Text>
        </View>
      </View>

      <Text style={s.trick}>{battle.trick_name}</Text>
      <View style={s.crewsRow}>
        <View style={s.crewSide}>
          <Text style={s.crewName} numberOfLines={1}>{battle.crew_a?.name ?? 'Crew A'}</Text>
          <Text style={s.voteCount}>{battle.votes_a} votes</Text>
        </View>
        <View style={s.vsBadge}><Text style={s.vsText}>VS</Text></View>
        <View style={[s.crewSide, { alignItems: 'flex-end' }]}>
          <Text style={[s.crewName, { textAlign: 'right' }]} numberOfLines={1}>{battle.crew_b?.name ?? 'Crew B'}</Text>
          <Text style={s.voteCount}>{battle.votes_b} votes</Text>
        </View>
      </View>
      <VoteBar a={battle.votes_a} b={battle.votes_b} />

      <View style={s.rewardRow}>
        <Zap color={ACCENT} size={16} />
        <Text style={s.rewardText}>Winner adds <Text style={s.rewardStrong}>{battle.reward_xp} crew XP</Text></Text>
      </View>

      {myVote ? (
        <View style={s.votedBox}>
          <CheckCircle2 color="#72E39C" size={17} />
          <Text style={s.votedText}>
            Vote locked: {myVote.crew_voted === 'a' ? battle.crew_a?.name : battle.crew_b?.name}
          </Text>
        </View>
      ) : ended ? (
        <View style={s.votedBox}>
          <Clock color="#A9B4C4" size={17} />
          <Text style={s.votedText}>Voting closed. Server is finalizing the result.</Text>
        </View>
      ) : (
        <View style={s.voteButtons}>
          <TouchableOpacity
            style={s.voteButton}
            disabled={voting}
            onPress={() => onVote(battle.id, 'a')}
          >
            <Text style={s.voteButtonText}>VOTE {battle.crew_a?.name?.toUpperCase() ?? 'A'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.voteButton}
            disabled={voting}
            onPress={() => onVote(battle.id, 'b')}
          >
            <Text style={s.voteButtonText}>VOTE {battle.crew_b?.name?.toUpperCase() ?? 'B'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CompletedBattleCard({ battle }: { battle: CrewBattle }) {
  const winner = battle.winner_crew;
  const tied = !battle.winner_crew_id;
  return (
    <View style={s.completedCard}>
      <View style={s.completedTop}>
        <View style={s.completedIcon}><Trophy color="#F7B955" size={18} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.completedTrick}>{battle.trick_name}</Text>
          <Text style={s.completedMatch}>{battle.crew_a?.name} {battle.votes_a} — {battle.votes_b} {battle.crew_b?.name}</Text>
        </View>
      </View>
      {tied ? (
        <Text style={s.drawText}>Draw — no crew XP awarded.</Text>
      ) : (
        <View style={s.winnerRow}>
          <ShieldCheck color="#72E39C" size={17} />
          <Text style={s.winnerText}>{winner?.name ?? 'Winner'} +{battle.reward_xp} crew XP</Text>
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
      setOpponentId('');
      setTrick('');
      setDuration(24);
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
          <View style={s.modalHeader}>
            <View>
              <Text style={s.modalEyebrow}>CREW VS CREW</Text>
              <Text style={s.modalTitle}>Start a battle</Text>
            </View>
            <TouchableOpacity style={s.closeButton} onPress={onClose}><X color="#D8DEE8" size={20} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.fieldLabel}>Your crew</Text>
            <View style={s.myCrewBox}>
              <Users color={ACCENT} size={18} />
              <Text style={s.myCrewText}>{myCrew?.name ?? 'Join or create a crew first'}</Text>
            </View>

            <Text style={s.fieldLabel}>Opponent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
              {opponents.map(crew => (
                <TouchableOpacity
                  key={crew.id}
                  style={[s.chip, opponentId === crew.id && s.chipActive]}
                  onPress={() => setOpponentId(crew.id)}
                >
                  <Text style={[s.chipText, opponentId === crew.id && s.chipTextActive]}>{crew.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Trick</Text>
            <TextInput
              value={trick}
              onChangeText={setTrick}
              placeholder="Kickflip, crook, line..."
              placeholderTextColor="#596577"
              style={s.input}
              maxLength={80}
            />
            <View style={s.quickGrid}>
              {QUICK_TRICKS.map(item => (
                <TouchableOpacity key={item} style={[s.quickChip, trick === item && s.quickChipActive]} onPress={() => setTrick(item)}>
                  <Text style={[s.quickText, trick === item && s.quickTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Duration</Text>
            <View style={s.durationRow}>
              {DURATIONS.map(hours => (
                <TouchableOpacity key={hours} style={[s.durationButton, duration === hours && s.durationActive]} onPress={() => setDuration(hours)}>
                  <Text style={[s.durationText, duration === hours && s.durationTextActive]}>{hours}H</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.secureNote}>
              <ShieldCheck color="#72E39C" size={18} />
              <Text style={s.secureNoteText}>Votes and the 500 XP payout are verified by SkateQuest servers.</Text>
            </View>

            <TouchableOpacity style={[s.startButton, saving && { opacity: 0.55 }]} disabled={saving || !myCrew} onPress={() => void submit()}>
              {saving ? <ActivityIndicator color="#fff" /> : <><Swords color="#fff" size={18} /><Text style={s.startText}>START BATTLE</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function CrewBattlesScreen() {
  const navigation = useNavigation();
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
        user?.id ? crewsService.getUserCrew(user.id) : Promise.resolve({ data: null, error: null } as any),
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
  const activeBattles = useMemo(() => battles.filter(b => b.status === 'active'), [battles]);
  const completedBattles = useMemo(() => battles.filter(b => b.status === 'completed'), [battles]);

  const vote = async (battleId: string, side: 'a' | 'b') => {
    if (!user) {
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

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}><ChevronLeft color="#E8EDF4" size={23} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>CREW REP ON THE LINE</Text>
          <Text style={s.title}>Crew Battles</Text>
        </View>
        <TouchableOpacity
          style={[s.addButton, !myCrew && { opacity: 0.45 }]}
          onPress={() => myCrew ? setShowCreate(true) : Alert.alert('Join a crew first', 'Create or join a crew before starting a battle.')}
        >
          <Plus color="#fff" size={18} strokeWidth={3} />
          <Text style={s.addText}>BATTLE</Text>
        </TouchableOpacity>
      </View>

      {myCrew ? (
        <View style={s.myCrewBanner}>
          <Users color={ACCENT} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={s.myCrewBannerLabel}>YOUR CREW</Text>
            <Text style={s.myCrewBannerName}>{myCrew.name}</Text>
          </View>
          <View style={s.xpPill}><Zap color="#F7B955" size={14} /><Text style={s.xpPillText}>{(myCrew.total_xp || 0).toLocaleString()} XP</Text></View>
        </View>
      ) : (
        <View style={s.noCrewBanner}><Text style={s.noCrewText}>Join or create a crew to start battles. You can still vote on live matchups.</Text></View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={ACCENT} />}
          contentContainerStyle={s.content}
        >
          <View style={s.sectionHeading}>
            <View><Text style={s.sectionTitle}>Live matchups</Text><Text style={s.sectionSub}>One vote per skater. Server-counted.</Text></View>
            <View style={s.countPill}><Text style={s.countText}>{activeBattles.length}</Text></View>
          </View>

          {activeBattles.length ? activeBattles.map(battle => (
            <ActiveBattleCard
              key={battle.id}
              battle={battle}
              myVote={myVotes.find(v => v.battle_id === battle.id)}
              voting={votingId === battle.id}
              onVote={(id, side) => void vote(id, side)}
            />
          )) : (
            <View style={s.emptyCard}><Swords color="#3B4655" size={32} /><Text style={s.emptyTitle}>No live battles</Text><Text style={s.emptyText}>Start one from your crew and put some rep on the line.</Text></View>
          )}

          {completedBattles.length > 0 && (
            <>
              <View style={[s.sectionHeading, { marginTop: 24 }]}>
                <View><Text style={s.sectionTitle}>Settled battles</Text><Text style={s.sectionSub}>Results finalized by the server.</Text></View>
              </View>
              {completedBattles.map(battle => <CompletedBattleCard key={battle.id} battle={battle} />)}
            </>
          )}
        </ScrollView>
      )}

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
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#151D28' },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#101722', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#F7F4EF', fontSize: 23, fontWeight: '900', marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 13, height: 40, borderRadius: 13 },
  addText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  myCrewBanner: { margin: 16, marginBottom: 4, backgroundColor: '#11151D', borderWidth: 1, borderColor: 'rgba(210,103,61,.35)', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  myCrewBannerLabel: { color: '#778395', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  myCrewBannerName: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 2 },
  xpPill: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#201A10', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  xpPillText: { color: '#F7B955', fontSize: 11, fontWeight: '900' },
  noCrewBanner: { margin: 16, marginBottom: 4, borderRadius: 14, padding: 12, backgroundColor: '#111722', borderWidth: 1, borderColor: BORDER },
  noCrewText: { color: '#9CA7B7', fontSize: 12, lineHeight: 18 },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#F7F4EF', fontSize: 18, fontWeight: '900' },
  sectionSub: { color: '#677486', fontSize: 11, marginTop: 2 },
  countPill: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: '#1A2432', alignItems: 'center', justifyContent: 'center' },
  countText: { color: ACCENT, fontWeight: '900' },
  battleCard: { backgroundColor: CARD, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  battleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#0E251A', borderRadius: 999 },
  liveBadgeText: { color: '#72E39C', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { color: '#A9B4C4', fontSize: 11, fontWeight: '700' },
  trick: { color: '#F7F4EF', fontSize: 21, fontWeight: '900', marginTop: 16, marginBottom: 15 },
  crewsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crewSide: { flex: 1 },
  crewName: { color: '#E9EDF3', fontSize: 14, fontWeight: '900' },
  voteCount: { color: '#697689', fontSize: 11, marginTop: 3 },
  vsBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1B2532', alignItems: 'center', justifyContent: 'center' },
  vsText: { color: ACCENT, fontSize: 10, fontWeight: '900' },
  voteTrack: { height: 8, borderRadius: 999, backgroundColor: '#263141', overflow: 'hidden', flexDirection: 'row', marginTop: 13 },
  voteA: { height: '100%', backgroundColor: ACCENT },
  voteB: { flex: 1, backgroundColor: '#6FC3FF' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 },
  rewardText: { color: '#8592A4', fontSize: 11 },
  rewardStrong: { color: '#F7B955', fontWeight: '900' },
  voteButtons: { flexDirection: 'row', gap: 9, marginTop: 14 },
  voteButton: { flex: 1, minHeight: 42, backgroundColor: '#172130', borderWidth: 1, borderColor: '#2B3A4E', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  voteButtonText: { color: '#E7EDF5', fontSize: 10, fontWeight: '900' },
  votedBox: { marginTop: 14, minHeight: 42, borderRadius: 12, backgroundColor: '#12231C', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  votedText: { color: '#A7CDB6', fontSize: 11, fontWeight: '700', flex: 1 },
  completedCard: { backgroundColor: '#0D141E', borderRadius: 17, padding: 14, borderWidth: 1, borderColor: '#1C2938', marginBottom: 10 },
  completedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  completedIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#211B10', alignItems: 'center', justifyContent: 'center' },
  completedTrick: { color: '#E9EDF3', fontSize: 14, fontWeight: '900' },
  completedMatch: { color: '#667486', fontSize: 11, marginTop: 3 },
  winnerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  winnerText: { color: '#72E39C', fontSize: 12, fontWeight: '900' },
  drawText: { color: '#8592A4', fontSize: 12, fontWeight: '700', marginTop: 12 },
  emptyCard: { minHeight: 150, borderRadius: 18, backgroundColor: '#0D141E', borderWidth: 1, borderColor: '#1C2938', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: '#DDE4EC', fontSize: 16, fontWeight: '900', marginTop: 10 },
  emptyText: { color: '#647184', fontSize: 12, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#080D14', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, borderWidth: 1, borderColor: BORDER },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalEyebrow: { color: ACCENT, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: '#F7F4EF', fontSize: 23, fontWeight: '900', marginTop: 3 },
  closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#151E2A', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: '#A5AFBD', fontSize: 11, fontWeight: '800', marginBottom: 8, marginTop: 10 },
  myCrewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, borderRadius: 13, backgroundColor: '#111923', borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12 },
  myCrewText: { color: '#E6EBF2', fontWeight: '800', flex: 1 },
  chipsRow: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: '#111923', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { color: '#A7B1C0', fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  input: { minHeight: 48, borderRadius: 13, backgroundColor: '#111923', borderWidth: 1, borderColor: BORDER, color: '#fff', paddingHorizontal: 13, fontSize: 14 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  quickChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#111923' },
  quickChipActive: { backgroundColor: '#2A1812' },
  quickText: { color: '#7D8999', fontSize: 11, fontWeight: '700' },
  quickTextActive: { color: '#F09A78' },
  durationRow: { flexDirection: 'row', gap: 9 },
  durationButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#111923', borderWidth: 1, borderColor: BORDER },
  durationActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  durationText: { color: '#95A1B1', fontWeight: '900' },
  durationTextActive: { color: '#fff' },
  secureNote: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10221A', borderRadius: 13, padding: 12 },
  secureNoteText: { color: '#9EC5AD', fontSize: 11, lineHeight: 16, flex: 1 },
  startButton: { marginTop: 16, marginBottom: 8, minHeight: 50, backgroundColor: ACCENT, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.7 },
});
