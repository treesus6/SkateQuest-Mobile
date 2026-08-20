import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const BLUE = '#72A9FF';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const stampScale = useRef(new Animated.Value(0.25)).current;
  const stampRotate = useRef(new Animated.Value(-18)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(24)).current;
  const slashX = useRef(new Animated.Value(width)).current;
  const acidX = useRef(new Animated.Value(-width)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(flash, { toValue: 1, duration: 90, useNativeDriver: false }),
        Animated.spring(stampScale, { toValue: 1, tension: 210, friction: 7, useNativeDriver: true }),
        Animated.spring(stampRotate, { toValue: -5, tension: 180, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(flash, { toValue: 0, duration: 110, useNativeDriver: false }),
        Animated.timing(slashX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(acidX, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(logoY, { toValue: 0, tension: 150, friction: 12, useNativeDriver: true }),
      ]),
      Animated.timing(tagOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]);

    sequence.start();
    const doneTimer = setTimeout(onDone, 2100);
    return () => {
      doneTimer && clearTimeout(doneTimer);
      sequence.stop();
    };
  }, [acidX, flash, logoOpacity, logoY, onDone, slashX, stampRotate, stampScale, tagOpacity]);

  const backgroundColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [INK, ORANGE],
  });

  const rotation = stampRotate.interpolate({
    inputRange: [-18, -5],
    outputRange: ['-18deg', '-5deg'],
  });

  return (
    <Animated.View style={[s.container, { backgroundColor }]}>
      <StatusBar hidden />

      <Animated.View style={[s.orangeSlash, { transform: [{ translateX: slashX }, { rotate: '34deg' }] }]} />
      <Animated.View style={[s.acidSlash, { transform: [{ translateX: acidX }, { rotate: '-12deg' }] }]} />
      <View style={s.blueOrb} />

      <Animated.View style={[s.stamp, { transform: [{ scale: stampScale }, { rotate: rotation }] }]}>
        <Text style={s.stampText}>SQ</Text>
        <View style={s.stampLine} />
        <Text style={s.stampSub}>LIVE</Text>
      </Animated.View>

      <Animated.View style={[s.wordmarkWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
        <Text style={s.wordmark}>SKATE</Text>
        <Text style={s.wordmark}>QUEST</Text>
      </Animated.View>

      <Animated.View style={[s.tagRow, { opacity: tagOpacity }]}>
        <View style={s.liveDot} />
        <Text style={s.tagline}>FIND IT. SKATE IT. PROVE IT.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orangeSlash: { position: 'absolute', width: width * 1.3, height: 105, right: -width * 0.42, top: '17%', backgroundColor: ORANGE },
  acidSlash: { position: 'absolute', width: width * 0.85, height: 28, left: -width * 0.3, bottom: '24%', backgroundColor: ACID },
  blueOrb: { position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -62, bottom: 45, backgroundColor: BLUE, opacity: 0.13 },
  stamp: { width: 92, height: 92, borderRadius: 24, backgroundColor: ACID, borderWidth: 4, borderColor: INK, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.33, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  stampText: { color: INK, fontSize: 34, lineHeight: 36, fontWeight: '900', letterSpacing: -1.4 },
  stampLine: { width: 38, height: 3, backgroundColor: ORANGE, marginTop: 1 },
  stampSub: { color: INK, fontSize: 7, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  wordmarkWrap: { marginTop: 25, alignItems: 'center' },
  wordmark: { color: PAPER, fontSize: 48, lineHeight: 42, fontWeight: '900', letterSpacing: -2.5 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 12, minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACID },
  tagline: { color: PAPER, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
});
