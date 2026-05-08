import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, StatusBar, Pressable
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [stance, setStance] = useState<'regular' | 'goofy' | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideY = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animateIn();
    // Pulse the CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);
    slideY.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const goNext = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      animateIn();
    });
  };

  const finish = async () => {
    if (stance) await AsyncStorage.setItem('skate_stance', stance);
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  // SCREEN 0 — BIG SPLASH
  if (step === 0) return (
    <View style={[s.screen, { backgroundColor: '#05070B' }]}>
      <StatusBar hidden />
      {/* Gritty background pattern */}
      <View style={s.bgLines}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[s.bgLine, {
            top: `${10 + i * 12}%` as any,
            opacity: 0.03 + i * 0.01,
            transform: [{ rotate: '-8deg' }]
          }]} />
        ))}
      </View>

      <Animated.View style={[s.content0, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={s.bigEmoji}>🛹</Text>
        <Text style={s.word1}>SKATE</Text>
        <View style={s.orangeLine} />
        <Text style={s.word2}>QUEST</Text>
        <Text style={s.tagline}>FIND YOUR SPOT</Text>
      </Animated.View>

      <Animated.View style={[s.bottomCTA, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
        <Pressable style={s.bigBtn} onPress={goNext}>
          <Text style={s.bigBtnTxt}>LET'S GO →</Text>
        </Pressable>
      </Animated.View>
    </View>
  );

  // SCREEN 1 — THE MAP
  if (step === 1) return (
    <View style={[s.screen, { backgroundColor: '#05070B' }]}>
      <StatusBar hidden />
      <Animated.View style={[s.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideY }] }]}>
        <View style={s.featureIconWrap}>
          <Text style={s.featureEmoji}>🗺</Text>
        </View>
        <Text style={s.slideNum}>01 / 03</Text>
        <Text style={s.slideTitle}>27,000+{'\n'}SKATEPARKS</Text>
        <Text style={s.slideTitle2}>WORLDWIDE</Text>
        <View style={s.accentBar} />
        <Text style={s.slideSub}>
          Every park. Every spot. Every city.{'\n'}
          The biggest skateboarding map ever built.
        </Text>
        <View style={s.featurePills}>
          <View style={s.pill}><Text style={s.pillTxt}>🏙 Cities</Text></View>
          <View style={s.pill}><Text style={s.pillTxt}>🏖 Beaches</Text></View>
          <View style={s.pill}><Text style={s.pillTxt}>🔒 Hidden Gems</Text></View>
        </View>
      </Animated.View>
      <View style={s.navRow}>
        <TouchableOpacity onPress={finish}><Text style={s.skipTxt}>Skip</Text></TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={goNext}>
          <Text style={s.nextTxt}>NEXT →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // SCREEN 2 — XP & CREWS
  if (step === 2) return (
    <View style={[s.screen, { backgroundColor: '#05070B' }]}>
      <StatusBar hidden />
      <Animated.View style={[s.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideY }] }]}>
        <View style={[s.featureIconWrap, { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)' }]}>
          <Text style={s.featureEmoji}>⚡</Text>
        </View>
        <Text style={[s.slideNum, { color: '#a855f7' }]}>02 / 03</Text>
        <Text style={[s.slideTitle, { color: '#a855f7' }]}>EARN XP.</Text>
        <Text style={s.slideTitle2}>LEVEL UP.</Text>
        <View style={[s.accentBar, { backgroundColor: '#a855f7' }]} />
        <Text style={s.slideSub}>
          Every session earns XP. Land tricks, complete{'\n'}
          daily quests, submit proof. Build your crew{'\n'}
          and battle for territory.
        </Text>
        <View style={s.featurePills}>
          <View style={[s.pill, { borderColor: 'rgba(168,85,247,0.4)' }]}><Text style={[s.pillTxt, { color: '#a855f7' }]}>⚡ Daily Quests</Text></View>
          <View style={[s.pill, { borderColor: 'rgba(168,85,247,0.4)' }]}><Text style={[s.pillTxt, { color: '#a855f7' }]}>👥 Crew Wars</Text></View>
          <View style={[s.pill, { borderColor: 'rgba(168,85,247,0.4)' }]}><Text style={[s.pillTxt, { color: '#a855f7' }]}>💰 Bounties</Text></View>
        </View>
      </Animated.View>
      <View style={s.navRow}>
        <TouchableOpacity onPress={finish}><Text style={s.skipTxt}>Skip</Text></TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, { backgroundColor: '#a855f7' }]} onPress={goNext}>
          <Text style={s.nextTxt}>NEXT →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // SCREEN 3 — TRICKS & CLIPS
  if (step === 3) return (
    <View style={[s.screen, { backgroundColor: '#05070B' }]}>
      <StatusBar hidden />
      <Animated.View style={[s.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideY }] }]}>
        <View style={[s.featureIconWrap, { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.4)' }]}>
          <Text style={s.featureEmoji}>📺</Text>
        </View>
        <Text style={[s.slideNum, { color: '#4ade80' }]}>03 / 03</Text>
        <Text style={[s.slideTitle, { color: '#4ade80' }]}>POST CLIPS.</Text>
        <Text style={s.slideTitle2}>GET HYPED.</Text>
        <View style={[s.accentBar, { backgroundColor: '#4ade80' }]} />
        <Text style={s.slideSub}>
          Film your sessions. Upload to SkateTV.{'\n'}
          Get coaching on any trick. Free. Offline.{'\n'}
          No BS. Just skating.
        </Text>
        <View style={s.featurePills}>
          <View style={[s.pill, { borderColor: 'rgba(74,222,128,0.4)' }]}><Text style={[s.pillTxt, { color: '#4ade80' }]}>📺 SkateTV</Text></View>
          <View style={[s.pill, { borderColor: 'rgba(74,222,128,0.4)' }]}><Text style={[s.pillTxt, { color: '#4ade80' }]}>🤖 AI Coach</Text></View>
          <View style={[s.pill, { borderColor: 'rgba(74,222,128,0.4)' }]}><Text style={[s.pillTxt, { color: '#4ade80' }]}>⛅ Forecast</Text></View>
        </View>
      </Animated.View>
      <View style={s.navRow}>
        <TouchableOpacity onPress={finish}><Text style={s.skipTxt}>Skip</Text></TouchableOpacity>
        <TouchableOpacity style={[s.nextBtn, { backgroundColor: '#4ade80' }]} onPress={goNext}>
          <Text style={[s.nextTxt, { color: '#05070B' }]}>ALMOST →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // SCREEN 4 — STANCE PICKER (personalization)
  if (step === 4) return (
    <View style={[s.screen, { backgroundColor: '#05070B' }]}>
      <StatusBar hidden />
      <Animated.View style={[s.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideY }] }]}>
        <Text style={s.stanceTitle}>ONE QUICK{'\n'}QUESTION</Text>
        <Text style={s.stanceSub}>What's your stance?</Text>
        <View style={s.stanceRow}>
          <TouchableOpacity
            style={[s.stanceCard, stance === 'regular' && s.stanceCardOn]}
            onPress={() => setStance('regular')}
          >
            <Text style={s.stanceEmoji}>🛹</Text>
            <Text style={s.stanceName}>REGULAR</Text>
            <Text style={s.stanceDesc}>Left foot forward</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.stanceCard, stance === 'goofy' && s.stanceCardOn]}
            onPress={() => setStance('goofy')}
          >
            <Text style={[s.stanceEmoji, { transform: [{ scaleX: -1 }] }]}>🛹</Text>
            <Text style={s.stanceName}>GOOFY</Text>
            <Text style={s.stanceDesc}>Right foot forward</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { setStance(null); finish(); }}>
          <Text style={s.stanceSkip}>Not sure / Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[s.bottomCTA, { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }]}>
        <Pressable
          style={[s.bigBtn, { opacity: stance ? 1 : 0.4 }]}
          onPress={stance ? finish : undefined}
        >
          <Text style={s.bigBtnTxt}>START SKATING 🛹</Text>
        </Pressable>
      </Animated.View>
    </View>
  );

  return null;
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05070B',
  },
  // SCREEN 0
  bgLines: {
    position: 'absolute',
    inset: 0,
  },
  bgLine: {
    position: 'absolute',
    left: -100,
    right: -100,
    height: 60,
    backgroundColor: '#d2673d',
  },
  content0: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  bigEmoji: {
    fontSize: 88,
    marginBottom: 20,
  },
  word1: {
    color: '#F3F4F6',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 12,
    lineHeight: 62,
  },
  orangeLine: {
    width: 80,
    height: 5,
    backgroundColor: '#d2673d',
    borderRadius: 3,
    marginVertical: 10,
  },
  word2: {
    color: '#d2673d',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 12,
    lineHeight: 62,
  },
  tagline: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 6,
    marginTop: 20,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  },
  bigBtn: {
    backgroundColor: '#d2673d',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  bigBtnTxt: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },

  // SLIDES 1-3
  slideContent: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 100,
  },
  featureIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(210,103,61,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(210,103,61,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureEmoji: {
    fontSize: 38,
  },
  slideNum: {
    color: '#d2673d',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
  },
  slideTitle: {
    color: '#d2673d',
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 54,
  },
  slideTitle2: {
    color: '#F3F4F6',
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 54,
    marginBottom: 16,
  },
  accentBar: {
    width: 60,
    height: 4,
    backgroundColor: '#d2673d',
    borderRadius: 2,
    marginBottom: 20,
  },
  slideSub: {
    color: '#9CA3AF',
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 28,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(210,103,61,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillTxt: {
    color: '#d2673d',
    fontSize: 13,
    fontWeight: '600',
  },
  navRow: {
    position: 'absolute',
    bottom: 50,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipTxt: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: '#d2673d',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  nextTxt: {
    color: 'white',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 2,
  },

  // STANCE PICKER
  stanceTitle: {
    color: '#F3F4F6',
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 52,
    marginTop: 80,
    marginBottom: 10,
  },
  stanceSub: {
    color: '#9CA3AF',
    fontSize: 18,
    marginBottom: 40,
  },
  stanceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stanceCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  stanceCardOn: {
    borderColor: '#d2673d',
    backgroundColor: 'rgba(210,103,61,0.1)',
  },
  stanceEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  stanceName: {
    color: '#F3F4F6',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 4,
  },
  stanceDesc: {
    color: '#6B7280',
    fontSize: 13,
  },
  stanceSkip: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
});
