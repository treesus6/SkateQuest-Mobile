import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

type CrewMember = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
  sessions: number;
};

const MOCK_CREW: CrewMember[] = [
  {
    id: '1',
    name: 'You',
    role: 'owner',
    joinedAt: '2024-01-01',
    sessions: 42,
  },
  {
    id: '2',
    name: 'Homie A',
    role: 'member',
    joinedAt: '2024-03-10',
    sessions: 18,
  },
  {
    id: '3',
    name: 'Homie B',
    role: 'member',
    joinedAt: '2024-04-22',
    sessions: 9,
  },
];

export default function CrewScreen() {
  const renderItem = ({ item }: { item: CrewMember }) => (
    <View style={styles.card}>
      <Text style={styles.name}>
        {item.name} {item.role === 'owner' ? '👑' : ''}
      </Text>
      <Text style={styles.meta}>Sessions: {item.sessions}</Text>
      <Text style={styles.meta}>Joined: {item.joinedAt}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Crew</Text>
      <Text style={styles.subtitle}>Session homies, shared challenges, crew energy.</Text>

      <FlatList
        data={MOCK_CREW}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Invite a homie (coming soon)</Text>
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
  name: {
    fontSize: 18,
    color: '#F5F5F5',
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  button: {
    marginTop: 16,
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
