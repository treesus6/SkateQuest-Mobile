import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

export default function HotStreakBadge() {
  const { user } = useAuthStore();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const flameAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchStreak();
  }, [user?.id]);

  useEffect(() => {
    if (streak >= 3) {
      // Flame flicker animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streak]);

  const fetchStreak = async () => {
    if (!user?.id) return;

    try {
      // Get user's daily challenge completion streak
      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_streak')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStreak(profile.daily_streak || 0);
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || streak < 3) {
    return null;
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [{ scale: flameAnim }],
        }}
      >
        <Text style={styles.flames}>🔥</Text>
      </Animated.View>
      <View style={styles.info}>
        <Text style={styles.title}>HOT STREAK!</Text>
        <Text style={styles.count}>{streak} days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#f59e0b',
    alignSelf: 'flex-start',
    position: 'relative',
    overflow: 'visible',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 29,
    backgroundColor: '#f59e0b',
  },
  flames: {
    fontSize: 32,
    marginRight: 12,
  },
  info: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
