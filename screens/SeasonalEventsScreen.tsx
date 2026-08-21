import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CalendarDays,
  Flame,
  Layers3,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSeasonalEventStore } from '../stores/useSeasonalEventStore';
import SeasonalProgressBar from '../components/SeasonalProgressBar';
import { Logger } from '../lib/logger';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function SeasonalEventsScreen() {
  const { user } = useAuthStore();
  const {
    activeEvent,
    allEvents,
    userProgress,
    loading,
    initialize,
    refreshUserProgress,
  } = useSeasonalEventStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const cleanup = initialize(user.id);
    return cleanup;
  }, [user?.id, initialize]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await refreshUserProgress(user.id);
    } catch (error) {
      Logger.error('Failed to refresh progress', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshUserProgress]);

  const daysRemaining = activeEvent
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activeEvent.end_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const activeTier = userProgress?.current_tier ?? 0;
  const maxTier = activeEvent?.tier_count ?? 0;
  const tierPercent = maxTier > 0 ? Math.round((activeTier / maxTier) * 100) : 0;
  const archiveCount = useMemo(
    () => allEvents.filter(event => event.id !== activeEvent?.id).length,
    [allEvents, activeEvent?.id]
  );

  if (loading && !activeEvent) {
    return (
      <SafeAreaView style={s.loading}>
        <View style={s.loadingStamp}>
          <Flame color={INK} size={30} strokeWidth={2.8} />
        </View>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={s.loadingText}>LOADING THE SKATE SEASON</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={s.content}
      >
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.blueOrb} />

          <View style={s.heroTopRow}>
            <View style={s.heroStamp}>
              <Flame color={INK} size={29} strokeWidth={2.8} />
            </View>
            <View style={s.liveChip}>
              <Sparkles color={INK} size={12} strokeWidth={3} />
              <Text style={s.liveChipText}>SEASON PASS</Text>
            </View>
          </View>

          <Text style={s.eyebrow}>LIMITED-TIME SKATEQUEST PROGRESSION</Text>
          <Text style={s.title}>SEASONAL{`\n`}EVENTS.</Text>
          <Text style={s.subtitle}>
            Chase live tiers, stack verified progress, and keep every finished season in your archive.
          </Text>
        </View>

        <View style={s.statsTicket}>
          <View style={s.statCell}>
            <CalendarDays color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{allEvents.length}</Text>
            <Text style={s.statLabel}>SEASONS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Layers3 color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{maxTier}</Text>
            <Text style={s.statLabel}>LIVE TIERS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Flame color={INK} size={18} strokeWidth={2.8} />
            <Text style={s.statValue}>{activeEvent ? daysRemaining : 0}</Text>
            <Text style={s.statLabel}>DAYS LEFT</Text>
          </View>
        </View>

        {activeEvent ? (
          <>
            <View style={s.sectionHeader}>
              <View>
                <Text style={s.sectionKicker}>CURRENT RUN</Text>
                <Text style={s.sectionTitle}>ACTIVE SEASON</Text>
              </View>
              <View style={s.activePill}>
                <View style={s.activeDot} />
                <Text style={s.activePillText}>LIVE</Text>
              </View>
            </View>

            <View style={s.activePoster}>
              <View style={s.posterTape}>
                <Text style={s.posterTapeText}>
                  {activeEvent.season.toUpperCase()} {activeEvent.year}
                </Text>
              </View>

              <View style={s.posterTopRow}>
                <View style={s.posterCopy}>
                  <Text style={s.posterKicker}>SKATEQUEST SEASON</Text>
                  <Text style={s.posterTitle}>{activeEvent.name}</Text>
                </View>
                <View style={s.daysSticker}>
                  <Text style={s.daysStickerValue}>{daysRemaining}</Text>
                  <Text style={s.daysStickerLabel}>DAYS</Text>
                </View>
              </View>

              {activeEvent.description ? (
                <Text style={s.posterDescription}>{activeEvent.description}</Text>
              ) : null}

              <View style={s.dateTicket}>
                <CalendarDays color={INK} size={17} strokeWidth={2.8} />
                <View style={s.dateCopy}>
                  <Text style={s.dateLabel}>SEASON WINDOW</Text>
                  <Text style={s.dateText}>
                    {new Date(activeEvent.start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {'  →  '}
                    {new Date(activeEvent.end_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <View style={s.tierSummaryRow}>
                <View style={s.tierSummaryBlock}>
                  <Text style={s.tierSummaryLabel}>YOUR TIER</Text>
                  <Text style={s.tierSummaryValue}>{activeTier}/{maxTier}</Text>
                </View>
                <View style={s.tierSummaryBlock}>
                  <Text style={s.tierSummaryLabel}>TIER COMPLETION</Text>
                  <Text style={s.tierSummaryValue}>{tierPercent}%</Text>
                </View>
                <View style={s.tierSummaryBlock}>
                  <Text style={s.tierSummaryLabel}>PROGRESS</Text>
                  <Text style={s.tierSummaryValue}>
                    {userProgress?.progress_value ?? 0}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.progressWrap}>
              {userProgress ? (
                <SeasonalProgressBar
                  currentTier={userProgress.current_tier}
                  maxTier={activeEvent.tier_count}
                  progressValue={userProgress.progress_value}
                />
              ) : (
                <View style={s.notStartedCard}>
                  <View style={s.notStartedStamp}>
                    <Trophy color={INK} size={25} strokeWidth={2.8} />
                  </View>
                  <View style={s.notStartedCopy}>
                    <Text style={s.notStartedKicker}>SEASON NOT STARTED YET</Text>
                    <Text style={s.notStartedTitle}>GO EARN YOUR FIRST MARK</Text>
                    <Text style={s.notStartedText}>
                      Verified challenges, spot visits, and real progression will start filling this season pass.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={s.noSeasonCard}>
            <View style={s.noSeasonStamp}>
              <CalendarDays color={INK} size={31} strokeWidth={2.8} />
            </View>
            <Text style={s.noSeasonKicker}>BETWEEN SEASONS</Text>
            <Text style={s.noSeasonTitle}>NO LIVE EVENT RIGHT NOW</Text>
            <Text style={s.noSeasonText}>
              Nothing fake is filled in here. The next real seasonal event will appear when it actually goes live.
            </Text>
          </View>
        )}

        {allEvents.length > 0 ? (
          <View style={s.archiveSection}>
            <View style={s.archiveHeader}>
              <View>
                <Text style={s.sectionKicker}>YOUR EVENT HISTORY</Text>
                <Text style={s.sectionTitle}>SEASON ARCHIVE</Text>
              </View>
              <View style={s.archiveCountBadge}>
                <Text style={s.archiveCountText}>{archiveCount} PAST</Text>
              </View>
            </View>

            {allEvents.map((event, index) => {
              const isActive = activeEvent?.id === event.id;
              const accent = isActive ? ACID : index % 3 === 0 ? ORANGE : index % 3 === 1 ? BLUE : '#A78BFA';
              return (
                <View
                  key={event.id}
                  style={[s.archiveCard, isActive && s.archiveCardActive, index % 2 === 1 && s.archiveCardTilt]}
                >
                  <View style={[s.archiveStripe, { backgroundColor: accent }]} />
                  <View style={s.archiveTop}>
                    <View style={[s.archiveStamp, { backgroundColor: accent }]}>
                      {isActive ? (
                        <Flame color={INK} size={21} strokeWidth={2.8} />
                      ) : (
                        <Trophy color={INK} size={21} strokeWidth={2.8} />
                      )}
                    </View>
                    <View style={s.archiveCopy}>
                      <Text style={s.archiveKicker}>
                        {event.season.toUpperCase()} {event.year}
                        {isActive ? ' • ACTIVE' : ''}
                      </Text>
                      <Text style={s.archiveTitle}>{event.name}</Text>
                    </View>
                    <View style={s.tierBadge}>
                      <Layers3 color={INK} size={13} strokeWidth={2.8} />
                      <Text style={s.tierBadgeText}>{event.tier_count}</Text>
                    </View>
                  </View>

                  {event.description ? (
                    <Text style={s.archiveDescription}>{event.description}</Text>
                  ) : null}

                  <View style={s.archiveFooter}>
                    <View style={s.archiveDateRow}>
                      <CalendarDays color={INK} size={13} strokeWidth={2.7} />
                      <Text style={s.archiveDateText}>
                        {new Date(event.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' — '}
                        {new Date(event.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={s.archiveTierRow}>
                      <Zap color={INK} size={13} strokeWidth={2.8} />
                      <Text style={s.archiveTierText}>{event.tier_count} TIERS</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  loading: { flex: 1, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  loadingText: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  content: { paddingBottom: 118 },

  hero: { minHeight: 300, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 310, height: 94, right: -105, top: 55, backgroundColor: ORANGE, transform: [{ rotate: '31deg' }] },
  acidSlash: { position: 'absolute', width: 220, height: 27, left: -70, bottom: 35, backgroundColor: ACID, transform: [{ rotate: '-10deg' }] },
  blueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 8, bottom: -58, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStamp: { width: 60, height: 60, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAPER, borderRadius: 999, borderWidth: 2, borderColor: INK, paddingHorizontal: 10, paddingVertical: 7 },
  liveChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 27 },
  title: { color: PAPER, fontSize: 49, lineHeight: 45, fontWeight: '900', letterSpacing: -2.8, marginTop: 3 },
  subtitle: { color: '#A3AAB5', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 305, marginTop: 8 },

  statsTicket: { marginHorizontal: 14, marginTop: -10, minHeight: 100, backgroundColor: PAPER, borderRadius: 24, borderWidth: 2, borderColor: INK, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.5deg' }] },
  statCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: '#D4CEC2' },
  statValue: { color: INK, fontSize: 19, lineHeight: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { color: '#74766F', fontSize: 7, fontWeight: '900', letterSpacing: 0.75, marginTop: 1 },

  sectionHeader: { paddingHorizontal: 18, paddingTop: 27, paddingBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 2 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#172317', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  activePillText: { color: ACID, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },

  activePoster: { marginHorizontal: 14, backgroundColor: ORANGE, borderRadius: 24, borderWidth: 2, borderColor: INK, padding: 16, position: 'relative', overflow: 'hidden', transform: [{ rotate: '-0.5deg' }] },
  posterTape: { position: 'absolute', right: -22, top: 16, minWidth: 118, height: 27, borderWidth: 1.5, borderColor: INK, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '10deg' }] },
  posterTapeText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  posterTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 58 },
  posterCopy: { flex: 1 },
  posterKicker: { color: '#7B3C25', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  posterTitle: { color: INK, fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1.1, marginTop: 3 },
  daysSticker: { width: 65, height: 65, borderRadius: 19, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  daysStickerValue: { color: INK, fontSize: 23, lineHeight: 25, fontWeight: '900' },
  daysStickerLabel: { color: INK, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  posterDescription: { color: '#4B2A1F', fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 13, paddingRight: 8 },
  dateTicket: { minHeight: 56, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PAPER, borderRadius: 14, borderWidth: 1.5, borderColor: INK, paddingHorizontal: 11 },
  dateCopy: { flex: 1 },
  dateLabel: { color: '#8A8178', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  dateText: { color: INK, fontSize: 10, fontWeight: '900', marginTop: 2 },
  tierSummaryRow: { flexDirection: 'row', gap: 7, marginTop: 13 },
  tierSummaryBlock: { flex: 1, minHeight: 62, borderRadius: 14, borderWidth: 1.5, borderColor: INK, backgroundColor: '#F18B61', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tierSummaryLabel: { color: '#6E3A27', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.55, textAlign: 'center' },
  tierSummaryValue: { color: INK, fontSize: 16, fontWeight: '900', marginTop: 3 },

  progressWrap: { marginHorizontal: 14, marginTop: 13 },
  notStartedCard: { minHeight: 120, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PAPER, borderRadius: 21, borderWidth: 2, borderColor: INK, padding: 14 },
  notStartedStamp: { width: 52, height: 52, borderRadius: 15, backgroundColor: ACID, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  notStartedCopy: { flex: 1 },
  notStartedKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.85 },
  notStartedTitle: { color: INK, fontSize: 15, fontWeight: '900', marginTop: 2 },
  notStartedText: { color: '#666A65', fontSize: 9.5, lineHeight: 14, fontWeight: '600', marginTop: 4 },

  noSeasonCard: { marginHorizontal: 14, marginTop: 25, minHeight: 230, backgroundColor: '#13161C', borderRadius: 24, borderWidth: 1.5, borderColor: '#30343D', alignItems: 'center', justifyContent: 'center', padding: 24 },
  noSeasonStamp: { width: 64, height: 64, borderRadius: 19, backgroundColor: ACID, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  noSeasonKicker: { color: ORANGE, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 14 },
  noSeasonTitle: { color: PAPER, fontSize: 15, fontWeight: '900', letterSpacing: 0.6, marginTop: 3, textAlign: 'center' },
  noSeasonText: { color: '#7F8793', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6, maxWidth: 285 },

  archiveSection: { paddingHorizontal: 14, marginTop: 28 },
  archiveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, paddingHorizontal: 4 },
  archiveCountBadge: { minHeight: 32, borderRadius: 999, backgroundColor: '#171A20', borderWidth: 1.5, borderColor: '#30343D', paddingHorizontal: 10, justifyContent: 'center' },
  archiveCountText: { color: '#8B929E', fontSize: 7, fontWeight: '900', letterSpacing: 0.75 },
  archiveCard: { marginBottom: 12, backgroundColor: PAPER, borderRadius: 20, borderWidth: 2, borderColor: INK, padding: 14, overflow: 'hidden', position: 'relative' },
  archiveCardActive: { borderColor: ACID, borderWidth: 3 },
  archiveCardTilt: { transform: [{ rotate: '0.35deg' }] },
  archiveStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  archiveTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 3 },
  archiveStamp: { width: 45, height: 45, borderRadius: 13, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  archiveCopy: { flex: 1 },
  archiveKicker: { color: ORANGE, fontSize: 6.5, fontWeight: '900', letterSpacing: 0.8 },
  archiveTitle: { color: INK, fontSize: 16, lineHeight: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  tierBadge: { minWidth: 43, height: 36, borderRadius: 11, borderWidth: 1.5, borderColor: INK, backgroundColor: ACID, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 6 },
  tierBadgeText: { color: INK, fontSize: 9, fontWeight: '900' },
  archiveDescription: { color: '#646963', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 11, paddingLeft: 3 },
  archiveFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: '#D8D1C6', paddingTop: 10 },
  archiveDateRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  archiveDateText: { color: '#71766F', fontSize: 7.5, fontWeight: '800' },
  archiveTierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  archiveTierText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.55 },
});
