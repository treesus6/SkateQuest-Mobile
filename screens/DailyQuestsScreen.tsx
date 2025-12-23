import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useChallenges } from '../contexts/ChallengeContext';

export default function DailyQuestsScreen({ navigation }: any) {
  const { dailyChallenges, resetDailyChallenges } = useChallenges();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Quests</Text>
      <Text style={styles.subtitle}>
        Fresh missions to keep you rolling every session.
      </Text>

      {dailyChallenges.map((ch) => (
        <TouchableOpacity
          key={ch.id}
          style={styles.card}
          onPress={() => navigation.navigate('ChallengeDetail', { id: ch.id })}
        >
          <Text style={styles.cardTitle}>{ch.title}</Text>
          <Text style={styles.cardSubtitle}>
            {ch.xp} XP · {ch.difficulty} {ch.completed ? '· Completed' : ''}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.button} onPress={resetDailyChallenges}>
        <Text style={styles.buttonText}>Reroll daily quests</Text>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#C7CED9',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#121826',
    borderRadius: 8,
    padding: 12,
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
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontWeight: '700',
  },
});
