import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gem, LockKeyhole, MapPin, Sparkles } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#777D87';

type HiddenGem = {
  id: string;
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unlock_xp_required: number;
};

export default function HiddenGemsScreen() {
  const { user } = useAuthStore();
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setGems([]);
      setUserXP(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [{ data: profile, error: profileError }, { data: gemRows, error: gemsError }] =
        await Promise.all([
          supabase.from('profiles').select('xp').eq('id', user.id).single(),
          supabase.from('hidden_gems').select('*').order('unlock_xp_required'),
        ]);

      if (profileError) throw profileError;
      if (gemsError) throw gemsError;

      setUserXP(profile?.xp ?? 0);
      setGems((gemRows ?? []) as HiddenGem[]);
    } catch (loadError) {
      console.error('Hidden Gems load failed:', loadError);
      setError('Hidden Gems could not be loaded right now.');
      setGems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const unlocked = useMemo(
    () => gems.filter(gem => userXP >= gem.unlock_xp_required),
    [gems, userXP]
  );
  const locked = useMemo(
    () => gems.filter(gem => userXP < gem.unlock_xp_required),
    [gems, userXP]
  );
  const nextUnlock = locked[0]?.unlock_xp_required ?? null;
  const nextProgress = nextUnlock
    ? Math.min(100, Math.round((userXP / Math.max(1, nextUnlock)) * 100))
    : 100;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <FlatList
        data={[...unlocked, ...locked]}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.hero}>
              <View style={s.heroOrangeSlash} />
              <View style={s.heroAcidSlash} />
              <View style={s.heroBlueOrb} />

              <View style={s.heroTopRow}>
                <View style={s.stamp}>
                  <Gem color={INK} size={27} strokeWidth={2.7} />
                </View>
                <View style={s.liveChip}>
                  <Sparkles color={INK} size={12} strokeWidth={3} />
                  <Text style={s.liveChipText}>XP UNLOCKS</Text>
                </View>
              </View>

              <Text style={s.heroKicker}>SECRET SPOT ARCHIVE</Text>
              <Text style={s.heroTitle}>HIDDEN{`\n`}GEMS.</Text>
              <Text style={s.heroSub}>Earn XP. Reveal spots. Keep the coordinates off the public feed.</Text>
            </View>

            <View style={s.progressTicket}>
              <View style={s.progressTop}>
                <View>
                  <Text style={s.ticketKicker}>YOUR DISCOVERY LEVEL</Text>
                  <Text style={s.xpValue}>{userXP.toLocaleString()} XP</Text>
                </View>
                <View style={s.countStamp}>
                  <Text style={s.countBig}>{unlocked.length}</Text>
                  <Text style={s.countSmall}>OPEN</Text>
                </View>
              </View>

              <View style={s.meterTrack}>
                <View style={[s.meterFill, { width: `${nextProgress}%` as any }]} />
              </View>
              <View style={s.meterMeta}>
                <Text style={s.meterMetaText}>{unlocked.length} OF {gems.length} REVEALED</Text>
                <Text style={s.meterMetaText}>
                  {nextUnlock ? `${Math.max(0, nextUnlock - userXP).toLocaleString()} XP TO NEXT` : 'ARCHIVE CLEARED'}
                </Text>
              </View>
            </View>

            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>THE ARCHIVE</Text>
              <Text style={s.sectionMeta}>{gems.length} SPOTS</Text>
            </View>

            {error ? (
              <View style={s.errorCard}>
                <Text style={s.errorTitle}>ARCHIVE OFFLINE</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => {
          const isUnlocked = userXP >= item.unlock_xp_required;
          const progress = Math.min(
            100,
            Math.round((userXP / Math.max(1, item.unlock_xp_required)) * 100)
          );

          if (isUnlocked) {
            return (
              <View style={[s.gemCard, index % 2 === 1 && s.tiltRight]}>
                <View style={s.gemIndex}>
                  <Text style={s.gemIndexText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={s.gemCopy}>
                  <View style={s.unlockedRow}>
                    <View style={s.unlockedPill}>
                      <Gem color={INK} size={12} strokeWidth={3} />
                      <Text style={s.unlockedPillText}>REVEALED</Text>
                    </View>
                    <Text style={s.unlockCost}>{item.unlock_xp_required.toLocaleString()} XP</Text>
                  </View>
                  <Text style={s.gemName}>{item.name}</Text>
                  {item.description ? <Text style={s.gemDescription}>{item.description}</Text> : null}
                  {typeof item.latitude === 'number' && typeof item.longitude === 'number' ? (
                    <View style={s.coordinatesRow}>
                      <MapPin color={ORANGE} size={14} strokeWidth={2.6} />
                      <Text style={s.coordinatesText}>
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }

          return (
            <View style={[s.lockedCard, index % 2 === 0 && s.tiltLeft]}>
              <View style={s.lockStamp}>
                <LockKeyhole color={PAPER} size={22} strokeWidth={2.6} />
              </View>
              <View style={s.lockCopy}>
                <View style={s.lockTopRow}>
                  <Text style={s.lockedName}>CLASSIFIED</Text>
                  <Text style={s.lockRequirement}>{item.unlock_xp_required.toLocaleString()} XP</Text>
                </View>
                <Text style={s.lockedSub}>Keep skating to reveal the spot name and coordinates.</Text>
                <View style={s.lockMeter}>
                  <View style={[s.lockMeterFill, { width: `${progress}%` as any }]} />
                </View>
                <Text style={s.lockPercent}>{progress}% DECODED</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={s.emptyCard}>
              <ActivityIndicator color={ORANGE} />
              <Text style={s.emptyTitle}>OPENING THE ARCHIVE</Text>
            </View>
          ) : !error ? (
            <View style={s.emptyCard}>
              <Gem color={ORANGE} size={30} strokeWidth={2.4} />
              <Text style={s.emptyTitle}>NO GEMS LOGGED YET</Text>
              <Text style={s.emptyText}>The archive is empty. Real hidden spots will appear here when they are added.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  listContent: { paddingBottom: 118 },

  hero: { minHeight: 300, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 30, overflow: 'hidden', position: 'relative' },
  heroOrangeSlash: { position: 'absolute', width: 300, height: 94, right: -105, top: 54, backgroundColor: ORANGE, transform: [{ rotate: '32deg' }] },
  heroAcidSlash: { position: 'absolute', width: 220, height: 28, left: -66, bottom: 34, backgroundColor: ACID, transform: [{ rotate: '-9deg' }] },
  heroBlueOrb: { position: 'absolute', width: 165, height: 165, borderRadius: 83, right: 14, bottom: -62, backgroundColor: BLUE, opacity: 0.12 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stamp: { width: 58, height: 58, borderRadius: 17, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PAPER, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 2, borderColor: INK },
  liveChipText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.15 },
  heroKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginTop: 27 },
  heroTitle: { color: PAPER, fontSize: 53, lineHeight: 47, fontWeight: '900', letterSpacing: -3, marginTop: 3 },
  heroSub: { color: '#A8AFBA', fontSize: 12, lineHeight: 18, fontWeight: '700', maxWidth: 265, marginTop: 10 },

  progressTicket: { marginHorizontal: 14, marginTop: -10, backgroundColor: PAPER, borderRadius: 25, borderWidth: 2, borderColor: INK, padding: 17, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 7, transform: [{ rotate: '-0.6deg' }] },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketKicker: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.35 },
  xpValue: { color: INK, fontSize: 29, lineHeight: 33, fontWeight: '900', letterSpacing: -1.2, marginTop: 2 },
  countStamp: { width: 58, height: 58, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }] },
  countBig: { color: INK, fontSize: 24, lineHeight: 25, fontWeight: '900' },
  countSmall: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 1.1 },
  meterTrack: { height: 11, backgroundColor: '#D8D2C6', borderRadius: 999, overflow: 'hidden', marginTop: 15, borderWidth: 1, borderColor: '#C7BFB1' },
  meterFill: { height: '100%', backgroundColor: ACID, borderRightWidth: 2, borderColor: INK },
  meterMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 7 },
  meterMetaText: { color: '#666A66', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginTop: 27, marginBottom: 10 },
  sectionTitle: { color: PAPER, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  sectionMeta: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },

  errorCard: { marginHorizontal: 14, marginBottom: 10, borderRadius: 17, borderWidth: 1, borderColor: '#63362A', backgroundColor: '#20110E', padding: 14 },
  errorTitle: { color: ORANGE, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  errorText: { color: '#C6A99F', fontSize: 11, lineHeight: 16, marginTop: 4 },

  gemCard: { marginHorizontal: 14, marginBottom: 11, backgroundColor: PAPER, borderRadius: 21, borderWidth: 2, borderColor: INK, padding: 14, flexDirection: 'row', gap: 12 },
  tiltRight: { transform: [{ rotate: '0.5deg' }] },
  gemIndex: { width: 43, height: 43, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  gemIndexText: { color: INK, fontSize: 12, fontWeight: '900' },
  gemCopy: { flex: 1 },
  unlockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  unlockedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACID, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  unlockedPillText: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  unlockCost: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  gemName: { color: INK, fontSize: 19, fontWeight: '900', letterSpacing: -0.7, marginTop: 7 },
  gemDescription: { color: '#656A66', fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 4 },
  coordinatesRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9 },
  coordinatesText: { color: '#4C504D', fontSize: 9, fontWeight: '900', letterSpacing: 0.35 },

  lockedCard: { marginHorizontal: 14, marginBottom: 11, backgroundColor: '#14171D', borderRadius: 21, borderWidth: 1.5, borderColor: '#30343D', padding: 14, flexDirection: 'row', gap: 12, overflow: 'hidden' },
  tiltLeft: { transform: [{ rotate: '-0.45deg' }] },
  lockStamp: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#2A2E36', borderWidth: 1, borderColor: '#3B404A', alignItems: 'center', justifyContent: 'center' },
  lockCopy: { flex: 1 },
  lockTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lockedName: { color: PAPER, fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  lockRequirement: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  lockedSub: { color: '#848B97', fontSize: 10, lineHeight: 15, fontWeight: '600', marginTop: 5 },
  lockMeter: { height: 6, backgroundColor: '#2A2E36', borderRadius: 999, overflow: 'hidden', marginTop: 11 },
  lockMeterFill: { height: '100%', backgroundColor: ORANGE },
  lockPercent: { color: '#737B88', fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 5 },

  emptyCard: { marginHorizontal: 14, marginTop: 8, minHeight: 155, borderRadius: 22, borderWidth: 1.5, borderColor: '#30343D', backgroundColor: '#12151B', padding: 20, alignItems: 'center', justifyContent: 'center', gap: 9 },
  emptyTitle: { color: PAPER, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  emptyText: { color: '#737B88', fontSize: 11, lineHeight: 16, textAlign: 'center', maxWidth: 260 },
});
