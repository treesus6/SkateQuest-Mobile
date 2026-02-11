import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useChallenges } from '../../../contexts/ChallengeContext';
import { Challenge } from '../../../state/challengeStore';

export default function ChallengeListScreen() {
  const { challenges } = useChallenges();
  const router = useRouter();

  const renderItem = ({ item }: { item: Challenge }) => (
    <TouchableOpacity
      style={[styles.card, item.completed && styles.cardCompleted]}
      onPress={() => router.push(`/(tabs)/challenges/${item.id}`)}
    >
      <View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.xp} XP</Text>
      </View>
      {item.completed && <Text style={styles.completedLabel}>Completed</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={challenges} keyExtractor={(i: Challenge) => i.id} renderItem={renderItem} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#05070B',
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#121826',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#C7CED9',
  },
  completedLabel: {
    color: '#0a8f08',
    fontWeight: '700',
  },
});
