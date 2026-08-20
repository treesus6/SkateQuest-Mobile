import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, Flame, ShieldCheck, Target, Users } from 'lucide-react-native';
import { useNavigation } from '../lib/useNavigation';

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function MessagesScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.orangeSlash} />
          <View style={s.acidSlash} />
          <View style={s.heroTop}>
            <View style={s.shieldStamp}><ShieldCheck color={INK} size={29} strokeWidth={2.7} /></View>
            <View style={s.safetyChip}>
              <View style={s.liveDot} />
              <Text style={s.safetyChipText}>SAFER SOCIAL</Text>
            </View>
          </View>
          <Text style={s.heroKicker}>LINK UP // IN THE SCENE</Text>
          <Text style={s.heroTitle}>SKATE{`\n`}TOGETHER.</Text>
          <Text style={s.heroText}>
            Direct messaging is not a public SkateQuest feature. Meet skaters through crews, verified challenges, and live park sessions instead.
          </Text>
        </View>

        <View style={s.paperBand}>
          <Text style={s.bandKicker}>WAYS TO CONNECT</Text>
          <Text style={s.bandTitle}>Don’t just sit in an inbox.</Text>
          <Text style={s.bandText}>Pick a real SkateQuest activity and get into the scene.</Text>
        </View>

        <View style={s.grid}>
          <ConnectionCard
            accent={ACID}
            icon={<Users color={INK} size={27} strokeWidth={2.7} />}
            number="01"
            title="CREWS"
            text="Build a crew, invite homies, battle, and claim territory."
            onPress={() => navigation.navigate('Crews')}
          />
          <ConnectionCard
            accent={ORANGE}
            icon={<Flame color={INK} size={27} strokeWidth={2.7} />}
            number="02"
            title="LIVE SCENE"
            text="Check in at a real spot and see who is actually out skating."
            onPress={() => navigation.navigate('LiveCheckIn')}
          />
          <ConnectionCard
            accent={BLUE}
            icon={<Target color={INK} size={27} strokeWidth={2.7} />}
            number="03"
            title="CHALLENGES"
            text="Send the energy through proof-based quests and call-outs."
            onPress={() => navigation.navigate('DailyQuests')}
          />
          <ConnectionCard
            accent={PAPER}
            icon={<ArrowUpRight color={INK} size={27} strokeWidth={2.7} />}
            number="04"
            title="FIND A SPOT"
            text="Open the map and go where the session is happening."
            onPress={() => navigation.navigate('Map')}
          />
        </View>

        <View style={s.ruleCard}>
          <ShieldCheck color={ACID} size={24} />
          <View style={s.ruleCopy}>
            <Text style={s.ruleKicker}>WHY NO OPEN DMS?</Text>
            <Text style={s.ruleTitle}>Keep the app skate-first.</Text>
            <Text style={s.ruleText}>
              SkateQuest is built for mixed ages. Public connection stays around crews, challenges, clips, and real sessions rather than an unrestricted inbox.
            </Text>
          </View>
        </View>

        <Pressable style={s.cta} onPress={() => navigation.navigate('Crews')}>
          <View>
            <Text style={s.ctaKicker}>START HERE</Text>
            <Text style={s.ctaTitle}>FIND YOUR CREW.</Text>
          </View>
          <View style={s.ctaArrow}><ArrowUpRight color={INK} size={24} strokeWidth={3} /></View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConnectionCard({ accent, icon, number, title, text, onPress }: { accent: string; icon: React.ReactNode; number: string; title: string; text: string; onPress: () => void }) {
  return (
    <Pressable style={[s.card, { backgroundColor: accent }]} onPress={onPress}>
      <View style={s.cardTop}>
        <View style={s.cardIcon}>{icon}</View>
        <Text style={s.cardNumber}>{number}</Text>
      </View>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardText}>{text}</Text>
      <ArrowUpRight color={INK} size={18} strokeWidth={2.8} style={s.cardArrow} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  content: { paddingBottom: 150 },
  hero: { margin: 14, minHeight: 340, borderRadius: 30, backgroundColor: '#11141A', borderWidth: 1, borderColor: '#2A2E36', padding: 20, overflow: 'hidden', position: 'relative' },
  orangeSlash: { position: 'absolute', width: 270, height: 88, right: -92, top: 33, backgroundColor: ORANGE, transform: [{ rotate: '34deg' }] },
  acidSlash: { position: 'absolute', width: 210, height: 24, left: -72, bottom: 62, backgroundColor: ACID, transform: [{ rotate: '-11deg' }] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shieldStamp: { width: 62, height: 62, borderRadius: 18, backgroundColor: ACID, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  safetyChip: { minHeight: 33, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 9 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  safetyChipText: { color: PAPER, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  heroKicker: { color: ORANGE, fontSize: 9, fontWeight: '900', letterSpacing: 1.6, marginTop: 28 },
  heroTitle: { color: PAPER, fontSize: 47, lineHeight: 42, fontWeight: '900', letterSpacing: -2.6, marginTop: 4 },
  heroText: { color: '#B0B6BF', fontSize: 12.5, lineHeight: 18.5, fontWeight: '700', marginTop: 13, maxWidth: 315 },

  paperBand: { backgroundColor: PAPER, marginTop: 8, paddingHorizontal: 19, paddingVertical: 20, borderTopWidth: 5, borderTopColor: ORANGE, transform: [{ rotate: '-0.25deg' }] },
  bandKicker: { color: ORANGE, fontSize: 8.5, fontWeight: '900', letterSpacing: 1.5 },
  bandTitle: { color: INK, fontSize: 25, fontWeight: '900', letterSpacing: -0.9, marginTop: 3 },
  bandText: { color: '#656A69', fontSize: 11.5, fontWeight: '700', marginTop: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, paddingTop: 22 },
  card: { width: '48%', minHeight: 185, borderRadius: 21, borderWidth: 2, borderColor: INK, padding: 14, position: 'relative' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  cardNumber: { color: INK, fontSize: 11, fontWeight: '900', opacity: 0.55 },
  cardTitle: { color: INK, fontSize: 17, fontWeight: '900', letterSpacing: -0.3, marginTop: 14 },
  cardText: { color: 'rgba(7,8,11,0.68)', fontSize: 10.5, lineHeight: 15, fontWeight: '700', paddingRight: 9, marginTop: 4 },
  cardArrow: { position: 'absolute', right: 12, bottom: 12 },

  ruleCard: { margin: 14, marginTop: 27, minHeight: 152, borderRadius: 22, backgroundColor: '#12161D', borderWidth: 1, borderColor: '#2A3039', padding: 16, flexDirection: 'row', gap: 12 },
  ruleCopy: { flex: 1 },
  ruleKicker: { color: ORANGE, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  ruleTitle: { color: PAPER, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 3 },
  ruleText: { color: '#929AA5', fontSize: 10.5, lineHeight: 15.5, fontWeight: '700', marginTop: 5 },

  cta: { marginHorizontal: 14, minHeight: 90, borderRadius: 20, backgroundColor: ACID, borderWidth: 2, borderColor: INK, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ rotate: '-0.5deg' }] },
  ctaKicker: { color: INK, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  ctaTitle: { color: INK, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  ctaArrow: { width: 45, height: 45, borderRadius: 14, backgroundColor: ORANGE, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
});
