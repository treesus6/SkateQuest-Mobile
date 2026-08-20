import React, { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowRight, Camera, Crosshair, MapPinned, ShieldCheck, Users, Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  surface: string;
  ink: string;
  accent: string;
  icon: 'map' | 'quest' | 'crew' | 'clip';
  stamp: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    eyebrow: 'THE MAP IS THE GAME',
    title: 'FIND THE\nREAL SCENE.',
    sub: 'Open the map, use your location, find real skate spots, check conditions, and add the places skaters are missing.',
    surface: PAPER,
    ink: INK,
    accent: ORANGE,
    icon: 'map',
    stamp: 'SPOTS',
  },
  {
    id: '2',
    eyebrow: 'NO FREE XP BUTTONS',
    title: 'DO IT.\nPROVE IT.',
    sub: 'Daily quests, bounties, check-ins, and trick challenges use real proof and server-verified rewards.',
    surface: ORANGE,
    ink: INK,
    accent: ACID,
    icon: 'quest',
    stamp: 'PROOF',
  },
  {
    id: '3',
    eyebrow: 'ROLL WITH HOMIES',
    title: 'BUILD A\nCREW.',
    sub: 'Link up, invite skaters, battle other crews, and claim territory through real location and trick verification.',
    surface: BLUE,
    ink: INK,
    accent: PAPER,
    icon: 'crew',
    stamp: 'CREW',
  },
  {
    id: '4',
    eyebrow: 'YOUR CLIPS. YOUR SPOTS.',
    title: 'MAKE THE\nSCENE MOVE.',
    sub: 'Drop skate clips, call out other skaters, start sessions, judge verified proof, and keep the local scene active.',
    surface: ACID,
    ink: INK,
    accent: ORANGE,
    icon: 'clip',
    stamp: 'LIVE',
  },
];

function SlideIcon({ name, color }: { name: Slide['icon']; color: string }) {
  if (name === 'map') return <MapPinned color={color} size={54} strokeWidth={2.4} />;
  if (name === 'quest') return <ShieldCheck color={color} size={55} strokeWidth={2.4} />;
  if (name === 'crew') return <Users color={color} size={55} strokeWidth={2.4} />;
  return <Camera color={color} size={55} strokeWidth={2.4} />;
}

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList<Slide>>(null);

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
  };

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
      return;
    }
    void finish();
  };

  const current = SLIDES[activeIndex];

  return (
    <View style={s.container}>
      <StatusBar hidden />

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={[s.slide, { backgroundColor: item.surface }]}>
            <View style={[s.bigCircle, { borderColor: item.ink, opacity: 0.08 }]} />
            <View style={[s.slash, { backgroundColor: item.accent }]} />
            <View style={[s.slashSmall, { backgroundColor: item.ink, opacity: 0.12 }]} />

            <View style={s.slideTop}>
              <View style={[s.stepStamp, { backgroundColor: item.ink }]}>
                <Text style={[s.stepText, { color: item.surface }]}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <View style={[s.liveChip, { borderColor: item.ink }]}>
                <View style={[s.liveDot, { backgroundColor: item.accent }]} />
                <Text style={[s.liveText, { color: item.ink }]}>{item.stamp}</Text>
              </View>
            </View>

            <View style={[s.iconCard, { backgroundColor: item.ink, borderColor: item.ink }]}>
              <SlideIcon name={item.icon} color={item.accent} />
              <View style={[s.iconCorner, { backgroundColor: item.accent }]} />
            </View>

            <View style={s.copyWrap}>
              <Text style={[s.eyebrow, { color: item.ink }]}>{item.eyebrow}</Text>
              <Text style={[s.title, { color: item.ink }]}>{item.title}</Text>
              <Text style={[s.sub, { color: item.ink }]}>{item.sub}</Text>
            </View>
          </View>
        )}
        onMomentumScrollEnd={event => {
          const idx = Math.round(event.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        scrollEventThrottle={16}
      />

      <View style={s.bottomUI}>
        <View style={s.bottomTop}>
          <View style={s.dots}>
            {SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={[
                  s.dot,
                  index === activeIndex && [s.dotActive, { backgroundColor: current.accent }],
                ]}
              />
            ))}
          </View>
          <Text style={s.progressText}>{activeIndex + 1} / {SLIDES.length}</Text>
        </View>

        <Pressable style={[s.nextButton, { backgroundColor: current.accent }]} onPress={goNext}>
          <View style={s.nextButtonCopy}>
            {activeIndex === SLIDES.length - 1 ? <Crosshair color={INK} size={19} strokeWidth={3} /> : <Zap color={INK} size={18} fill={INK} />}
            <Text style={s.nextText}>{activeIndex === SLIDES.length - 1 ? "LET'S SKATE" : 'NEXT SCENE'}</Text>
          </View>
          <View style={s.nextArrow}><ArrowRight color={INK} size={20} strokeWidth={3} /></View>
        </Pressable>

        {activeIndex < SLIDES.length - 1 ? (
          <Pressable onPress={() => void finish()}>
            <Text style={s.skip}>SKIP INTRO</Text>
          </Pressable>
        ) : (
          <View style={s.skipSpacer} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: INK },
  slide: { width, height, paddingHorizontal: 22, paddingTop: 38, paddingBottom: 205, overflow: 'hidden' },
  bigCircle: { position: 'absolute', width: 380, height: 380, borderRadius: 190, borderWidth: 70, right: -160, top: -90 },
  slash: { position: 'absolute', width: width * 0.95, height: 42, left: -width * 0.28, bottom: 235, transform: [{ rotate: '-11deg' }] },
  slashSmall: { position: 'absolute', width: width * 0.8, height: 14, right: -width * 0.3, top: 186, transform: [{ rotate: '20deg' }] },
  slideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepStamp: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  stepText: { fontSize: 15, fontWeight: '900' },
  liveChip: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.2 },
  iconCard: { width: 112, height: 112, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 48, borderWidth: 3, transform: [{ rotate: '-5deg' }], overflow: 'hidden' },
  iconCorner: { position: 'absolute', width: 52, height: 52, right: -23, bottom: -22, transform: [{ rotate: '35deg' }] },
  copyWrap: { marginTop: 34, maxWidth: width - 44 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.7, opacity: 0.72 },
  title: { fontSize: 45, lineHeight: 41, fontWeight: '900', letterSpacing: -2.5, marginTop: 6 },
  sub: { fontSize: 14, lineHeight: 21, fontWeight: '700', opacity: 0.72, marginTop: 16, maxWidth: 340 },

  bottomUI: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 190, backgroundColor: INK, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: '#2B3039' },
  bottomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#343943' },
  dotActive: { width: 29 },
  progressText: { color: '#7F8793', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  nextButton: { minHeight: 59, borderRadius: 17, borderWidth: 2, borderColor: INK, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ rotate: '-0.5deg' }] },
  nextButtonCopy: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextText: { color: INK, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  nextArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  skip: { color: '#6D7580', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginTop: 14 },
  skipSpacer: { height: 25 },
});
