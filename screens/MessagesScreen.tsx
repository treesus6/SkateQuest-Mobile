import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🛹</Text>
        <Text style={styles.title}>Skate Together</Text>
        <Text style={styles.subtitle}>
          Direct messaging is disabled to keep SkateQuest safe for all ages.
        </Text>
        <Text style={styles.body}>
          Connect with other skaters through Crews, Challenges, and at the park.
          That's how it's always been done.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F3F4F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#d2673d',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
