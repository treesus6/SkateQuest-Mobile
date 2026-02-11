import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Flame } from 'lucide-react-native';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';

export default function HotStreakBadge() {
  const { user } = useAuthStore();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const flameAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchStreak(); }, [user?.id]);

  useEffect(() => {
    if (streak >= 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(flameAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
          Animated.timing(flameAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [streak]);

  const fetchStreak = async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await profilesService.getById(user.id);
      if (profile) setStreak(profile.daily_streak || 0);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || streak < 3) return null;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View className="flex-row items-center bg-gray-900 dark:bg-gray-900 px-4 py-3 rounded-full border-2 border-amber-500 self-start relative overflow-visible">
      <Animated.View
        style={{
          position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
          borderRadius: 29, backgroundColor: '#f59e0b', opacity: glowOpacity,
        }}
      />
      <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
        <Flame color="#f59e0b" size={28} />
      </Animated.View>
      <View className="ml-3">
        <Text className="text-sm font-bold text-amber-500 tracking-wider">HOT STREAK!</Text>
        <Text className="text-xs font-semibold text-white">{streak} days</Text>
      </View>
    </View>
  );
}
