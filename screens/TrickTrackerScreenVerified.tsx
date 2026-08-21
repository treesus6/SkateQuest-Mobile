import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  Plus,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  Zap,
} from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { userTricksService } from '../lib/userTricksService';
import { feedService } from '../lib/feedService';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

const COMMON_TRICKS = [
  'Ollie',
  'Kickflip',
  'Heelflip',
  'Pop Shove-it',
  'Frontside 180',
  'Backside 180',
  'Varial Kickflip',
  'Hardflip',
  'Treflip',
  '50-50 Grind',
  'Boardslide',
  'Noseslide',
  'Tailslide',
  'Feeble Grind',
  'Smith Grind',
];

function getDailyTrick() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return COMMON_TRICKS[seed % COMMON_TRICKS.length];
}

const STATUS = {
  trying: { label: 'TRYING', color: ORANGE, Icon: Zap },
  landed: { label: 'LANDED', color: BLUE, Icon: Target },
  consistent: { label: 'CONSISTENT', color: ACID, Icon: Star },
} as const;

export default function TrickTrackerScreenVerified() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');

  const { data: tricks, refetch } = useSupabaseQuery<any[]>(
    () => userTricksService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `tricks-${user?.id}`, enabled: !!user }
  );

  const allTricks = tricks || [];
  const daily = getDailyTrick();
  const dailyDone = allTricks.some(
    trick =>
      trick.trick_name?.toLowerCase() === daily.toLowerCase() &&
      ['landed', 'consistent'].includes(trick.status)
  );

  const landedCount = useMemo(
    () => allTricks.filter(trick => ['landed', 'consistent'].includes(trick.status)).length,
    [allTricks]
  );
  const consistentCount = useMemo(
    () => allTricks.filter(trick => trick.status === 'consistent').length,
    [allTricks]
  );
  const totalAttempts = useMemo(
    () => allTricks.reduce((sum, trick) => sum + Number(trick.attempts || 0), 0),
    [allTricks]
  );

  const addTrick = async () => {
    if (!user || !name.trim()) return;
    try {
      const { error } = await userTricksService.create({
        user_id: user.id,
        trick_name: name.trim(),
        status: 'trying',
      });
      if (error) throw error;
      setName('');
      setShowAdd(false);
      refetch();
    } catch (error: any) {
      Alert.alert('Could not add trick', error?.message || 'Please try again.');
    }
  };

  const setStatus = async (
    trick: any,
    status: 'trying' | 'landed' | 'consistent'
  ) => {
    if (!user) return;
    try {
      const { error } = await userTricksService.updateStatus(trick.id, status);
      if (error) throw error;
      if (status === 'landed' && trick.status === 'trying') {
        await feedService
          .create({
            user_id: user.id,
            activity_type: 'trick_landed',
            title: `Logged ${trick.trick_name} as landed`,
            description:
              'Self-reported trick log — no XP awarded until a verified SkateQuest activity earns it.',
            xp_earned: 0,
          })
          .catch(() => undefined);
        Alert.alert(
          'Trick logged',
          `${trick.trick_name} is marked landed. XP is only awarded through verified activity.`
        );
      }
      refetch();
    } catch (error: any) {
      Alert.alert('Could not update trick', error?.message || 'Please try again.');
    }
  };

  const addAttempt = async (trick: any) => {
    try {
      const { error } = await userTricksService.incrementAttempts(trick.id);
      if (error) throw error;
      refetch();
    } catch (error: any) {
      Alert.alert('Could not log attempt', error?.message || 'Please try again.');
    }
  };

  const remove = (trick: any) =>
    Alert.alert('Delete trick', `Remove ${trick.trick_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await userTricksService.delete(trick.id);
          refetch();
        },
      },
    ]);

  return (
    <View style={s.container}>
      <FlatList
        data={allTricks}
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
                  <Target color={INK} size={29} strokeWidth={2.8} />
                </View>
                <TouchableOpacity style={s.addButtonTop} onPress={() => setShowAdd(true)}>
                  <Plus color={INK} size={16} strokeWidth={3} />
                  <Text style={s.addButtonTopText}>ADD TRICK</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.eyebrow}>YOUR PERSONAL SKATE PROGRESSION NOTEBOOK</Text>
              <Text style={s.title}>TRICK{`\n`}TRACKER.</Text>
              <Text style={s.subtitle}>
                Log attempts, mark progress, and build consistency without pretending a self-report is verified XP.
              </Text>
            </View>

            <View style={s.statsTicket}>
              <View style={s.statCell}>
                <BarChart3 color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{allTricks.length}</Text>
                <Text style={s.statLabel}>TRACKED</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Target color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{landedCount}</Text>
                <Text style={s.statLabel}>LANDED</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Star color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{consistentCount}</Text>
                <Text style={s.statLabel}>CONSISTENT</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Zap color={INK} size={18} strokeWidth={2.8} />
                <Text style={s.statValue}>{totalAttempts}</Text>
                <Text style={s.statLabel}>TRIES</Text>
              </View>
            </View>

            <View style={s.dailyWrap}>
              <View style={s.dailyPoster}>
                <View style={s.dailyTape}>
                  <Text style={s.dailyTapeText}>TODAY</Text>
                </View>
                <View style={s.dailyTopRow}>
                  <View>
                    <Text style={s.dailyKicker}>TRICK OF THE DAY</Text>
                    <Text style={s.dailyTitle}>{daily}</Text>
                  </View>
                  <View style={s.dailyStamp}>
                    {dailyDone ? (
                      <CheckCircle color={INK} size={28} strokeWidth={2.8} />
                    ) : (
                      <Zap color={INK} size={28} strokeWidth={2.8} />
                    )}
                  </View>
                </View>
                <Text style={s.dailyText}>
                  {dailyDone
                    ? 'Already in your landed/consistent tracker history.'
                    : 'Add it to your tracker and start stacking real attempts.'}
                </Text>
                <View style={s.dailyActions}>
                  {!dailyDone ? (
                    <TouchableOpacity
                      style={s.dailyPrimary}
                      onPress={() => {
                        setName(daily);
                        setShowAdd(true);
                      }}
                    >
                      <Plus color={INK} size={16} strokeWidth={3} />
                      <Text style={s.dailyPrimaryText}>ADD TO TRACKER</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.dailyDoneButton}>
                      <CheckCircle color={INK} size={16} strokeWidth={3} />
                      <Text style={s.dailyPrimaryText}>LOGGED</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={s.dailySecondary}
                    onPress={() => navigation.navigate('TrickTutorials', { initialSearch: daily })}
                  >
                    <BookOpen color={INK} size={16} strokeWidth={2.8} />
                    <Text style={s.dailySecondaryText}>TUTORIAL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={s.verificationRail}>
              <ShieldCheck color={INK} size={18} strokeWidth={2.8} />
              <View style={s.verificationCopy}>
                <Text style={s.verificationTitle}>TRACKER ≠ VERIFIED XP</Text>
                <Text style={s.verificationText}>
                  This notebook is self-reported. XP still comes only from verified SkateQuest activity.
                </Text>
              </View>
            </View>

            {allTricks.length > 0 ? (
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionKicker}>YOUR CURRENT WORKLIST</Text>
                  <Text style={s.sectionTitle}>PROGRESSION FILES</Text>
                </View>
                <View style={s.fileCountBadge}>
                  <Text style={s.fileCountText}>{allTricks.length} FILES</Text>
                </View>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => {
          const cfg = STATUS[item.status as keyof typeof STATUS] || STATUS.trying;
          const Icon = cfg.Icon;
          return (
            <View style={[s.card, index % 2 === 1 && s.cardTilt]}>
              <View style={[s.cardStripe, { backgroundColor: cfg.color }]} />
              <View style={s.cardTop}>
                <View style={[s.statusStamp, { backgroundColor: cfg.color }]}>
                  <Icon color={INK} size={22} strokeWidth={2.8} />
                </View>
                <View style={s.cardCopy}>
                  <Text style={s.statusKicker}>{cfg.label}</Text>
                  <Text style={s.trickName}>{item.trick_name}</Text>
                  <Text style={s.attemptsText}>{item.attempts || 0} logged attempts</Text>
                </View>
                <TouchableOpacity style={s.deleteButton} onPress={() => remove(item)}>
                  <Trash2 color="#A84632" size={16} strokeWidth={2.7} />
                </TouchableOpacity>
              </View>

              <View style={s.progressRail}>
                {(['trying', 'landed', 'consistent'] as const).map((status, statusIndex) => {
                  const reached =
                    status === 'trying' ||
                    (status === 'landed' && ['landed', 'consistent'].includes(item.status)) ||
                    (status === 'consistent' && item.status === 'consistent');
                  return (
                    <React.Fragment key={status}>
                      <View style={[s.progressDot, reached && s.progressDotReached]}>
                        <Text style={[s.progressDotText, reached && s.progressDotTextReached]}>
                          {statusIndex + 1}
                        </Text>
                      </View>
                      {statusIndex < 2 ? (
                        <View style={[s.progressLine, reached && item.status !== status && s.progressLineReached]} />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </View>
              <View style={s.progressLabels}>
                <Text style={s.progressLabel}>TRYING</Text>
                <Text style={s.progressLabel}>LANDED</Text>
                <Text style={s.progressLabel}>CONSISTENT</Text>
              </View>

              <View style={s.actionRow}>
                <TouchableOpacity style={s.tryButton} onPress={() => addAttempt(item)}>
                  <Zap color={INK} size={15} strokeWidth={2.8} />
                  <Text style={s.tryButtonText}>+1 TRY</Text>
                </TouchableOpacity>
                {item.status === 'trying' ? (
                  <TouchableOpacity
                    style={s.advanceButton}
                    onPress={() => setStatus(item, 'landed')}
                  >
                    <Target color={INK} size={15} strokeWidth={2.8} />
                    <Text style={s.advanceButtonText}>MARK LANDED</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status === 'landed' ? (
                  <TouchableOpacity
                    style={s.advanceButton}
                    onPress={() => setStatus(item, 'consistent')}
                  >
                    <Star color={INK} size={15} strokeWidth={2.8} />
                    <Text style={s.advanceButtonText}>CONSISTENT</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status === 'consistent' ? (
                  <View style={s.lockedStateButton}>
                    <CheckCircle color={INK} size={15} strokeWidth={2.8} />
                    <Text style={s.lockedStateText}>LOCKED IN</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyStamp}>
              <Target color={INK} size={30} strokeWidth={2.8} />
            </View>
            <Text style={s.emptyKicker}>EMPTY NOTEBOOK</Text>
            <Text style={s.emptyTitle}>NO TRICKS TRACKED YET</Text>
            <Text style={s.emptyText}>
              Add what you are actually working on and start logging attempts.
            </Text>
            <TouchableOpacity style={s.emptyButton} onPress={() => setShowAdd(true)}>
              <Plus color={INK} size={16} strokeWidth={3} />
              <Text style={s.emptyButtonText}>ADD FIRST TRICK</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <View style={s.modalTopRow}>
              <View style={s.modalStamp}>
                <Plus color={INK} size={25} strokeWidth={3} />
              </View>
              <View style={s.modalCopy}>
                <Text style={s.modalKicker}>ADD TO YOUR PROGRESSION BOOK</Text>
                <Text style={s.modalTitle}>NEW TRICK FILE</Text>
              </View>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Trick name"
              placeholderTextColor="#8A8D86"
              style={s.modalInput}
              autoFocus
            />

            <Text style={s.commonLabel}>COMMON TRICKS</Text>
            <ScrollView style={s.commonScroll} showsVerticalScrollIndicator={false}>
              <View style={s.commonWrap}>
                {COMMON_TRICKS.map(trick => (
                  <TouchableOpacity
                    key={trick}
                    style={[s.commonChip, name === trick && s.commonChipActive]}
                    onPress={() => setName(trick)}
                  >
                    <Text style={s.commonChipText}>{trick}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelButton}
                onPress={() => {
                  setShowAdd(false);
                  setName('');
                }}
              >
                <Text style={s.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveButton, !name.trim() && s.disabled]}
                onPress={() => void addTrick()}
                disabled={!name.trim()}
              >
                <Plus color={INK} size={16} strokeWidth={3} />
                <Text style={s.saveButtonText}>ADD TRICK</Text>
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

  hero: { minHeight: 300, paddingHorizontal: 18, paddingTop: 46, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 94, right: -105, top: 70, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 35, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  addButtonTop: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 11, paddingVertical: 8 },
  addButtonTopText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.45, marginTop: 27 },
  title: { color: PAPER, fontSize: 50, lineHeight: 46, fontWeight: '900', letterSpacing: -2.9, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 96, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 13, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 18, lineHeight: 21, fontWeight: '900', marginTop: 4 },
  statLabel: { color: '#74766F', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.65, marginTop: 1 },

  dailyWrap: { marginHorizontal: 14, marginTop: 20 },
  dailyPoster: { backgroundColor: ORANGE, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 15, position: 'relative', overflow: 'hidden', transform: [{ rotate: '-0.45deg' }] },
  dailyTape: { position: 'absolute', right: -20, top: 14, minWidth: 85, height: 25, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }] },
  dailyTapeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  dailyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingRight: 45 },
  dailyKicker: { color: '#763A24', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  dailyTitle: { color: INK, fontSize: 27, fontWeight: '900', letterSpacing: -0.9, marginTop: 2 },
  dailyStamp: { width: 55, height: 55, borderRadius: 16, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  dailyText: { color: '#543022', fontSize: 10, lineHeight: 15, fontWeight: '700', marginTop: 11 },
  dailyActions: { flexDirection: 'row', gap: 8, marginTop: 13 },
  dailyPrimary: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ACID, borderRadius: 13, borderWidth: 2, borderColor: INK },
  dailyDoneButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: ACID, borderRadius: 13, borderWidth: 2, borderColor: INK },
  dailyPrimaryText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  dailySecondary: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PAPER, borderRadius: 13, borderWidth: 2, borderColor: INK },
  dailySecondaryText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },

  verificationRail: { marginHorizontal: 14, marginTop: 11, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: ACID, borderRadius: 16, borderWidth: 2, borderColor: INK, paddingHorizontal: 12 },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  verificationText: { color: '#5D641F', fontSize: 8.5, lineHeight: 13, fontWeight: '700', marginTop: 2 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 25, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  fileCountBadge: { minHeight: 31, borderRadius: 999, backgroundColor: '#171A20', borderWidth: 1.5, borderColor: '#30343D', paddingHorizontal: 10, justifyContent: 'center' },
  fileCountText: { color: '#8B929E', fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },

  card: { marginHorizontal: 14, marginBottom: 12, backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14, overflow: 'hidden', position: 'relative' },
  cardTilt: { transform: [{ rotate: '0.35deg' }] },
  cardStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 3 },
  statusStamp: { width: 46, height: 46, borderRadius: 13, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  cardCopy: { flex: 1 },
  statusKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  trickName: { color: INK, fontSize: 17, lineHeight: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  attemptsText: { color: '#747871', fontSize: 8.5, fontWeight: '800', marginTop: 3 },
  deleteButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F0D4CC', borderWidth: 1, borderColor: '#D6AAA0', alignItems: 'center', justifyContent: 'center' },
  progressRail: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginTop: 16 },
  progressDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#D8D2C6', borderWidth: 1.5, borderColor: '#BFB7AA', alignItems: 'center', justifyContent: 'center' },
  progressDotReached: { backgroundColor: ACID, borderColor: INK },
  progressDotText: { color: '#8A8D86', fontSize: 8, fontWeight: '900' },
  progressDotTextReached: { color: INK },
  progressLine: { flex: 1, height: 4, backgroundColor: '#D8D2C6' },
  progressLineReached: { backgroundColor: ACID },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingHorizontal: 2 },
  progressLabel: { color: '#8A8D86', fontSize: 6, fontWeight: '900', letterSpacing: 0.5 },
  actionRow: { flexDirection: 'row', gap: 7, marginTop: 14 },
  tryButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: ORANGE, borderRadius: 12, borderWidth: 1.5, borderColor: INK },
  tryButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  advanceButton: { flex: 1.3, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: ACID, borderRadius: 12, borderWidth: 1.5, borderColor: INK },
  advanceButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },
  lockedStateButton: { flex: 1.3, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: BLUE, borderRadius: 12, borderWidth: 1.5, borderColor: INK },
  lockedStateText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.65 },

  empty: { marginHorizontal: 14, marginTop: 28, minHeight: 235, borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#13161C', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  emptyKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 14 },
  emptyTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  emptyText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 275 },
  emptyButton: { minHeight: 45, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, borderRadius: 12, borderWidth: 2, borderColor: INK, paddingHorizontal: 15 },
  emptyButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '82%', backgroundColor: PAPER, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderBottomWidth: 0, borderColor: INK, padding: 18, paddingBottom: 28 },
  modalHandle: { width: 48, height: 5, borderRadius: 999, backgroundColor: '#C8C1B5', alignSelf: 'center', marginBottom: 15 },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  modalStamp: { width: 50, height: 50, borderRadius: 15, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  modalCopy: { flex: 1 },
  modalKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  modalTitle: { color: INK, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  modalInput: { minHeight: 52, marginTop: 15, backgroundColor: '#EAE5DB', borderRadius: 14, borderWidth: 1.5, borderColor: '#CFC7BB', color: INK, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' },
  commonLabel: { color: '#7D817A', fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 14, marginBottom: 7 },
  commonScroll: { maxHeight: 240 },
  commonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingBottom: 4 },
  commonChip: { borderRadius: 999, borderWidth: 1.5, borderColor: '#C8C0B4', backgroundColor: '#EAE5DB', paddingHorizontal: 10, paddingVertical: 7 },
  commonChipActive: { backgroundColor: ACID, borderColor: INK },
  commonChipText: { color: INK, fontSize: 8, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelButton: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  saveButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, borderWidth: 2, borderColor: INK, backgroundColor: ORANGE },
  saveButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  disabled: { opacity: 0.45 },
});
