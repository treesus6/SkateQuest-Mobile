import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useChallenges } from '../contexts/ChallengeContext';
import { Challenge } from '../state/challengeStore';

export default function HomeScreen({ navigation }: any) {
  const { xp, level, streakDays, dailyChallenges } = useChallenges();

  const xpForNextLevel = 500;
  const progress = Math.min(xp % xpForNextLevel, xpForNextLevel);
  const progressPercent = progress / xpForNextLevel;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SkateQuest</Text>
      <Text style={styles.subtitle}>Level {level}</Text>

      {/* XP BAR */}
      <View style={styles.xpBarBackground}>
        <View style={[styles.xpBarFill, { width: `${progressPercent * 100}%` }]} />
      </View>
      <Text style={styles.xpText}>
        {progress} / {xpForNextLevel} XP
      </Text>

      {/* STREAK */}
      <Text style={styles.streak}>🔥 Streak: {streakDays} day(s)</Text>

      {/* DAILY CHALLENGES */}
      <Text style={styles.sectionTitle}>Today’s Challenges</Text>
      {dailyChallenges.map((ch: Challenge) => (
        <TouchableOpacity
          key={ch.id}
          style={styles.card}
          onPress={() => navigation.navigate('ChallengeDetail', { id: ch.id })}
        >
          <Text style={styles.cardTitle}>{ch.title}</Text>
          <Text style={styles.cardSubtitle}>
            {ch.xp} XP · {ch.difficulty}
          </Text>
        </TouchableOpacity>
      ))}

      {/* CTA */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChallengesTab')}>
        <Text style={styles.buttonText}>View All Challenges</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#05070B',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C7CED9',
    marginBottom: 16,
  },
  xpBarBackground: {
    width: '100%',
    height: 14,
    backgroundColor: '#1F2A3C',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#FF5A3C',
  },
  xpText: {
    color: '#C7CED9',
    marginBottom: 16,
  },
  streak: {
    color: '#FFB84C',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    backgroundColor: '#121826',
    borderRadius: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#C7CED9',
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: '#FF5A3C',
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontWeight: '700',
    fontSize: 16,
  },
});
