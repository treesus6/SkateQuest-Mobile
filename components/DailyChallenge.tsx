import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getDailyChallenge } from '../lib/skateQuestEngine';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { DailyChallenge as DailyChallengeType } from '../types';

interface DailyChallengeProps {
  onComplete?: () => void;
}

export default function DailyChallenge({ onComplete }: DailyChallengeProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallengeType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const dailyChallenge = getDailyChallenge();
    setChallenge(dailyChallenge);

    // Check if user already completed today's challenge
    checkCompletion(dailyChallenge.id);

    // Load streak
    loadStreak();

    // Start countdown timer
    const timer = setInterval(() => {
      updateCountdown(dailyChallenge.expires);
    }, 1000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(timer);
  }, []);

  const checkCompletion = async (challengeId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('challenge_submissions')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCompleted(true);
    }
  };

  const loadStreak = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user.id)
      .single();

    if (data) {
      setStreak(data.current_streak || 0);
    }
  };

  const updateCountdown = (expires: Date) => {
    const now = new Date();
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  };

  const getDifficultyStars = (difficulty: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < difficulty ? '★' : '☆'))
      .join('');
  };

  const handleSubmit = () => {
    // Navigate to upload media screen with challenge context
    navigation.navigate('UploadMedia');
    if (onComplete) {
      onComplete();
    }
  };

  if (!challenge) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🔥</Text>
          <Text style={styles.headerTitle}>Daily Challenge</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>{streak} day streak</Text>
        </View>
      </View>

      <View style={styles.challengeContent}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>XP Reward</Text>
            <Text style={styles.xpValue}>+{challenge.xp}</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>Difficulty</Text>
            <Text style={styles.difficultyValue}>{getDifficultyStars(challenge.difficulty)}</Text>
          </View>
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={styles.timerValue}>{timeRemaining}</Text>
        </View>
      </View>

      {completed ? (
        <View style={styles.completedButton}>
          <Text style={styles.completedText}>Completed Today</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Video</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footerText}>Same challenge for all skaters worldwide</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  challengeContent: {
    marginBottom: 16,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  xpValue: {
    color: '#2ecc71',
    fontSize: 20,
    fontWeight: 'bold',
  },
  difficultyValue: {
    color: '#f39c12',
    fontSize: 16,
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
  },
  timerLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  timerValue: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  submitButton: {
    backgroundColor: '#d2673d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
