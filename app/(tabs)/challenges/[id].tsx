import { SafeAreaView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChallenges } from '../../../contexts/ChallengeContext';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenges, completeChallenge } = useChallenges();
  const router = useRouter();

  const challenge = challenges.find((c: any) => c.id === id);

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Challenge not found</Text>
      </SafeAreaView>
    );
  }

  const handleComplete = () => {
    completeChallenge(id!);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.text}>{challenge.description}</Text>
      <Text style={styles.text}>XP: {challenge.xp}</Text>

      {challenge.completed ? (
        <Text style={styles.completedLabel}>Already completed</Text>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>Mark as completed</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
    fontWeight: '700',
    marginBottom: 8,
    color: '#F5F5F5',
  },
  text: {
    fontSize: 16,
    color: '#C7CED9',
    marginTop: 8,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#FF5A3C',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  completedLabel: {
    color: '#0a8f08',
    fontWeight: '700',
    marginTop: 16,
  },
});
