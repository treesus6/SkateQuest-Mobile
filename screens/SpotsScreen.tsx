import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import parks from '../data/parks.json';

type Park = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  difficulty?: string;
};

export default function SpotsScreen() {
  const data: Park[] = (parks as any) || [];

  const renderItem = ({ item }: { item: Park }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {item.city || ''}
        {item.city && item.state ? ', ' : ''}
        {item.state || ''}
      </Text>
      {item.difficulty && <Text style={styles.meta}>Park level: {item.difficulty}</Text>}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>View spot challenges (soon)</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spots</Text>
      <Text style={styles.subtitle}>Parks nearby and mission hubs.</Text>

      <FlatList
        data={data}
        keyExtractor={item => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8 }}
      />
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#121826',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  meta: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#FF5A3C',
    alignItems: 'center',
  },
  buttonText: {
    color: '#F5F5F5',
    fontWeight: '600',
  },
});
