import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, FlatList, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🗺',
    title: 'THE WORLD\nIS YOUR PARK',
    sub: '27,000+ skateparks mapped worldwide. Find spots near you, discover hidden gems, and never skate the same place twice.',
    bg: '#05070B',
    accent: '#d2673d',
  },
  {
    id: '2',
    emoji: '⚡',
    title: 'EARN XP.\nLEVEL UP.',
    sub: 'Every session counts. Complete daily quests, land tricks, join crew battles. Submit proof. Claim your XP.',
    bg: '#0a0514',
    accent: '#8b5cf6',
  },
  {
    id: '3',
    emoji: '👥',
    title: 'BUILD YOUR\nCREW',
    sub: 'Form a crew with your local homies. Battle other crews for territory. Dominate your city\'s skate scene.',
    bg: '#05100a',
    accent: '#4ade80',
  },
  {
    id: '4',
    emoji: '🛹',
    title: 'BORN TO LURK.\nFORCED TO WORK.',
    sub: 'No ads. No corporate BS. Built by skaters for skaters. 10% of profits go to kids who can\'t afford boards.',
    bg: '#1a0805',
    accent: '#d2673d',
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(prev => prev + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    onDone();
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
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => (
          <View style={[s.slide, { backgroundColor: item.bg }]}>
            {/* Background pattern */}
            <View style={[s.bgPattern, { borderColor: item.accent + '15' }]} />
            <View style={[s.bgPattern2, { borderColor: item.accent + '10' }]} />

            {/* Big emoji */}
            <Text style={s.slideEmoji}>{item.emoji}</Text>

            {/* Title */}
            <Text style={[s.slideTitle, { color: item.accent }]}>{item.title}</Text>

            {/* Sub */}
            <Text style={s.slideSub}>{item.sub}</Text>

            {/* Bottom gradient area */}
            <View style={s.slideBottom} />
          </View>
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom UI */}
      <View style={[s.bottomUI, { backgroundColor: current.bg }]}>
        {/* Dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[
              s.dot,
              i === activeIndex && [s.dotActive, { backgroundColor: current.accent }]
            ]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: current.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={s.btnTxt}>
            {activeIndex === SLIDES.length - 1 ? "LET'S SKATE 🛹" : 'NEXT →'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish}>
            <Text style={s.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070B' },
  slide: { width, height, justifyContent: 'center', alignItems: 'center', padding: 40, paddingTop: 100, paddingBottom: 240 },
  bgPattern: { position: 'absolute', width: 500, height: 500, borderRadius: 250, borderWidth: 60, top: -100, right: -150 },
  bgPattern2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 40, bottom: 100, left: -80 },
  slideEmoji: { fontSize: 100, marginBottom: 32, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
  slideTitle: { fontSize: 42, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 20, lineHeight: 50 },
  slideSub: { color: '#9CA3AF', fontSize: 16, textAlign: 'center', lineHeight: 26, maxWidth: 300 },
  slideBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 },
  bottomUI: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, paddingBottom: 48, alignItems: 'center', gap: 16 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1F2937' },
  dotActive: { width: 28, height: 8, borderRadius: 4 },
  btn: { width: '100%', padding: 18, borderRadius: 14, alignItems: 'center' },
  btnTxt: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 2 },
  skip: { color: '#4B5563', fontSize: 14 },
});
