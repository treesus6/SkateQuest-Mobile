import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, StatusBar
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const bgFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Flash bg
    Animated.sequence([
      Animated.timing(bgFlash, { toValue: 1, duration: 80, useNativeDriver: false }),
      Animated.timing(bgFlash, { toValue: 0, duration: 80, useNativeDriver: false }),
    ]).start();

    // Logo slam in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 200,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Text and line after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(lineWidth, { toValue: width * 0.6, duration: 400, useNativeDriver: false }),
      ]).start();
    }, 300);

    // Tagline
    setTimeout(() => {
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 700);

    // Done
    setTimeout(() => {
      onDone();
    }, 2200);
  }, []);

  const bgColor = bgFlash.interpolate({
    inputRange: [0, 1],
    outputRange: ['#05070B', '#d2673d'],
  });

  return (
    <Animated.View style={[s.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden />

      {/* Skate emoji slam */}
      <Animated.Text style={[s.skateEmoji, {
        transform: [{ scale: logoScale }],
        opacity: logoOpacity,
      }]}>
        🛹
      </Animated.Text>

      {/* SKATEQUEST word */}
      <Animated.Text style={[s.logoText, { opacity: textOpacity }]}>
        SKATEQUEST
      </Animated.Text>

      {/* Orange line */}
      <Animated.View style={[s.line, { width: lineWidth }]} />

      {/* Tagline */}
      <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
        FIND YOUR SPOT
      </Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070B',
  },
  skateEmoji: {
    fontSize: 90,
    marginBottom: 16,
  },
  logoText: {
    color: '#F3F4F6',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 12,
  },
  line: {
    height: 3,
    backgroundColor: '#d2673d',
    borderRadius: 2,
    marginBottom: 12,
  },
  tagline: {
    color: '#d2673d',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 5,
  },
});
