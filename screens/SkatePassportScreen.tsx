import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, Check, Compass, MapPin, Stamp, Trophy } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';
const MUTED = '#828A96';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

type PassportStamp = {
  location_code: string;
  location_name?: string | null;
  stamped_at?: string | null;
};

export default function SkatePassportScreen() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const [passportStamps, setPassportStamps] = useState<PassportStamp[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStamps = useCallback(async () => {
    if (!user?.id) {
      setPassportStamps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('skate_passport_stamps')
      .select('location_code,location_name,stamped_at')
      .eq('user_id', user.id)
      .eq('location_type', 'state')
      .order('stamped_at', { ascending: false });

    setPassportStamps((data ?? []) as PassportStamp[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void loadStamps();
  }, [loadStamps]);

  const stampCodes = useMemo(
    () => new Set(passportStamps.map(item => String(item.location_code || '').toUpperCase())),
    [passportStamps]
  );

  const stamped = US_STATES.filter(state => stampCodes.has(state)).length;
  const total = US_STATES.length;
  const pct = Math.round((stamped / total) * 100);
  const remaining = total - stamped;
  const latest = passportStamps[0];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroOrangeSlash} />
          <View style={s.heroAcidSlash} />
          <View style={s.heroTop}>
            <View style={s.passportStamp}>
              <Stamp color={INK} size={24} strokeWidth={2.7} />
              <Text style={s.passportStampText}>SQ</Text>
            </View>
            <View style={s.liveChip}>
              <View style={s.liveDot} />
              <Text style={s.liveChipText}>VERIFIED TRAVEL</Text>
            </View>
          </View>

          <Text style={s.heroKicker}>SKATE PASSPORT // USA</Text>
          <Text style={s.heroTitle}>SKATE THE{`\n`}WHOLE MAP.</Text>
          <Text style={s.heroSub}>Verified park check-ins stamp each U.S. state once.</Text>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{stamped}</Text>
              <Text style={s.heroStatLabel}>STAMPED</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{remaining}</Text>
              <Text style={s.heroStatLabel}>LEFT</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{pct}%</Text>
              <Text style={s.heroStatLabel}>COMPLETE</Text>
            </View>
          </View>
        </View>

        <View style={s.progressTicket}>
          <View style={s.progressTop}>
            <View>
              <Text style={s.progressKicker}>NATIONAL RUN</Text>
              <Text style={s.progressTitle}>{stamped} / {total} STATES</Text>
            </View>
            <Trophy color={ORANGE} size={25} />
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressCaption}>
            {stamped === total ? 'Every state stamped. Full map complete.' : `${remaining} states still waiting for a verified session.`}
          </Text>
        </View>

        {latest ? (
          <View style={s.latestBand}>
            <View style={s.latestIcon}><Check color={INK} size={21} strokeWidth={3} /></View>
            <View style={s.latestCopy}>
              <Text style={s.latestKicker}>LATEST STAMP</Text>
              <Text style={s.latestState}>{latest.location_code}</Text>
            </View>
            <Text style={s.latestDate}>
              {latest.stamped_at ? new Date(latest.stamped_at).toLocaleDateString() : 'VERIFIED'}
            </Text>
          </View>
        ) : null}

        <View style={s.boardHeader}>
          <View>
            <Text style={s.boardKicker}>COLLECTION BOARD</Text>
            <Text style={s.boardTitle}>50 state run</Text>
          </View>
          <Pressable style={s.mapButton} onPress={() => navigation.navigate('Map')}>
            <Compass color={INK} size={17} strokeWidth={2.8} />
            <Text style={s.mapButtonText}>FIND PARK</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.loadingBlock}>
            <ActivityIndicator color={ORANGE} />
            <Text style={s.loadingText}>CHECKING YOUR STAMPS</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {US_STATES.map((state, index) => {
              const done = stampCodes.has(state);
              return (
                <View
                  key={state}
                  style={[
                    s.stateStamp,
                    done && s.stateStampDone,
                    index % 5 === 1 && s.rotateRight,
                    index % 5 === 3 && s.rotateLeft,
                  ]}
                >
                  <Text style={[s.stateCode, done && s.stateCodeDone]}>{state}</Text>
                  {done ? (
                    <View style={s.checkBadge}><Check color={INK} size={11} strokeWidth={3.4} /></View>
                  ) : (
                    <View style={s.emptyDot} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={s.howItWorks}>
          <View style={s.howIcon}><MapPin color={INK} size={25} strokeWidth={2.8} /></View>
          <View style={s.howCopy}>
            <Text style={s.howKicker}>HOW A STAMP COUNTS</Text>
            <Text style={s.howTitle}>Check in for real.</Text>
            <Text style={s.howText}>
              SkateQuest verifies that you are at the mapped park. If that park has a valid U.S. state in the park database, the state is stamped automatically once.
            </Text>
          </View>
        </View>

        <Pressable style={s.cta} onPress={() => navigation.navigate('Map')}>
          <View>
            <Text style={s.ctaKicker}>NEXT STAMP</Text>
            <Text style={s.ctaTitle}>GO FIND A PARK.</Text>
          </View>
          <View style={s.ctaArrow}><ArrowUpRight color={INK} size={23} strokeWidth={3} /></View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 150 },

  hero: { margin: 14, minHeight: 342, borderRadius: 30, backgroundColor: '#11141A', borderWidth: 1, borderColor: '#2A2E36', padding: 20, overflow: 'hidden', position: 'relative' },
  heroOrangeSlash: { position: 'absolute', width: 270, height: 88, right: -92, top: 31, backgroundColor: ORANGE, transform: [{ rotate: '34deg' }] },
  heroAcidSlash: { position: 'absolute', width: 210, height: 24, left: -72, bottom: 73, backgroundColor: ACID, transform: [{ rotate: '-11deg' }] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passportStamp: { width: 59, height: 59, borderRadius: 17, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  passportStampText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 1 },
  liveChip: { minHeight: 33, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 9 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  liveChipText: { color: PAPER, fontSize: 7.5, fontWeight: '900', letterSpacing: 1 },
  heroKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 28 },
  heroTitle: { color: PAPER, fontSize: 43, lineHeight: 39, fontWeight: '900', letterSpacing: -2.4, marginTop: 4 },
  heroSub: { color: '#B1B7C1', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 10, maxWidth: 295 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 20 },
  heroStat: { flex: 1, minHeight: 63, backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 10, justifyContent: 'center' },
  heroStatValue: { color: PAPER, fontSize: 19, fontWeight: '900' },
  heroStatLabel: { color: '#8F96A1', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  progressTicket: { marginHorizontal: 14, marginTop: -3, backgroundColor: PAPER, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 16, transform: [{ rotate: '-0.4deg' }] },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressKicker: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  progressTitle: { color: INK, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  progressTrack: { height: 11, borderRadius: 999, backgroundColor: '#D6D0C4', overflow: 'hidden', marginTop: 13 },
  progressFill: { height: '100%', backgroundColor: ACID, borderRadius: 999, borderRightWidth: 2, borderColor: INK },
  progressCaption: { color: '#666B6A', fontSize: 10.5, lineHeight: 15, fontWeight: '700', marginTop: 9 },

  latestBand: { marginTop: 17, backgroundColor: ORANGE, minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 11 },
  latestIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  latestCopy: { flex: 1 },
  latestKicker: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2 },
  latestState: { color: INK, fontSize: 25, fontWeight: '900', lineHeight: 27 },
  latestDate: { color: INK, fontSize: 9, fontWeight: '900' },

  boardHeader: { marginTop: 28, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  boardKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.5 },
  boardTitle: { color: PAPER, fontSize: 27, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  mapButton: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACID, borderRadius: 12, paddingHorizontal: 10, borderWidth: 2, borderColor: INK },
  mapButtonText: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  loadingBlock: { margin: 18, minHeight: 120, borderRadius: 18, backgroundColor: '#12161D', borderWidth: 1, borderColor: '#2A3039', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: MUTED, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 16, gap: 7 },
  stateStamp: { width: 57, height: 62, borderRadius: 13, backgroundColor: '#151921', borderWidth: 1.5, borderColor: '#2D333D', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  stateStampDone: { backgroundColor: PAPER, borderWidth: 2, borderColor: INK },
  rotateRight: { transform: [{ rotate: '1.5deg' }] },
  rotateLeft: { transform: [{ rotate: '-1.5deg' }] },
  stateCode: { color: '#5D6570', fontSize: 13, fontWeight: '900' },
  stateCodeDone: { color: INK, fontSize: 15 },
  checkBadge: { position: 'absolute', right: -3, top: -4, width: 22, height: 22, borderRadius: 7, backgroundColor: ACID, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '7deg' }] },
  emptyDot: { position: 'absolute', bottom: 7, width: 5, height: 5, borderRadius: 3, backgroundColor: '#303640' },

  howItWorks: { margin: 14, marginTop: 28, minHeight: 148, backgroundColor: BLUE, borderRadius: 22, borderWidth: 2, borderColor: INK, padding: 16, flexDirection: 'row', gap: 13, transform: [{ rotate: '0.4deg' }] },
  howIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: PAPER, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  howCopy: { flex: 1 },
  howKicker: { color: INK, fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2 },
  howTitle: { color: INK, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, marginTop: 3 },
  howText: { color: 'rgba(7,8,11,0.7)', fontSize: 10.5, lineHeight: 15.5, fontWeight: '700', marginTop: 5 },

  cta: { marginHorizontal: 14, minHeight: 88, borderRadius: 20, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', transform: [{ rotate: '-0.5deg' }] },
  ctaKicker: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  ctaTitle: { color: INK, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  ctaArrow: { width: 44, height: 44, borderRadius: 14, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
});
