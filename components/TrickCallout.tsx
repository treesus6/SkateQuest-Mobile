import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import tricks from '../data/tricks.json';

type Trick = string;

const OBSTACLES = [
  'flatground',
  'curb',
  'ledge',
  'manual pad',
  '3-stair',
  '5-stair',
  'bank',
  'hip',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TrickCallout() {
  const [prompt, setPrompt] = useState<string | null>(null);

  const generate = () => {
    const trick = randomItem(tricks as Trick[]);
    const obstacle = randomItem(OBSTACLES);
    const stance = randomItem(['regular', 'switch', 'fakie', 'nollie']);

    const text = `${stance} ${trick} on the ${obstacle}.`;
    setPrompt(text);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trick Callout</Text>
      <Text style={styles.subtitle}>Hit a random mission right now.</Text>

      <TouchableOpacity style={styles.button} onPress={generate}>
        <Text style={styles.buttonText}>Call me out</Text>
      </TouchableOpacity>

      {prompt && (
        <View style={styles.card}>
          <Text style={styles.prompt}>{prompt}</Text>
          <Text style={styles.note}>Film it. Land it. Claim it.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F5F5F5',
  },
  subtitle: {
    fontSize: 14,
    color: '#C7CED9',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontWeight: '700',
  },
  card: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#121826',
  },
  prompt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
