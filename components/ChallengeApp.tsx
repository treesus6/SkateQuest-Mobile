import React, { useState, useMemo, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from 'react-native';

/* ---------------------------------------------------------
   CHALLENGE + XP CONTEXT
--------------------------------------------------------- */

const ChallengeContext = createContext<any>(null);

const initialChallenges = [
  {
    id: 'ch1',
    title: 'Kickflip on flat',
    description: 'Land a clean kickflip on flatground.',
    xp: 100,
    completed: false,
  },
  {
    id: 'ch2',
    title: '50-50 a ledge',
    description: 'Find a ledge and get a 50-50 grind.',
    xp: 150,
    completed: false,
  },
  {
    id: 'ch3',
    title: 'Manual line',
    description: 'Manual across a parking lot line for at least 3 seconds.',
    xp: 120,
    completed: false,
  },
];

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  const completeChallenge = (id: string) => {
    setChallenges((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, completed: true } : c));

      // Only award XP if the challenge was not previously completed
      const before = prev.find((c) => c.id === id);
      const after = updated.find((c) => c.id === id);

      if (after && before && !before.completed) {
        const gainedXp = after.xp || 0;
        setXp((prevXp) => {
          const newXp = prevXp + gainedXp;
          const newLevel = 1 + Math.floor(newXp / 500);
          setLevel(newLevel);
          return newXp;
        });
      }

      return updated;
    });
  };

  const value = useMemo(
    () => ({ challenges, xp, level, completeChallenge }),
    [challenges, xp, level]
  );

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenges() {
  return useContext(ChallengeContext);
}

/* ---------------------------------------------------------
   SCREENS
--------------------------------------------------------- */

function HomeScreen({ navigation }: any) {
  const { xp, level, challenges } = useChallenges();
  const completedCount = challenges.filter((c: any) => c.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>SkateQuest</Text>
      <Text style={styles.subtitle}>Level {level} · {xp} XP</Text>
      <Text style={styles.text}>
        Completed challenges: {completedCount} / {challenges.length}
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ChallengesTab')}>
        <Text style={styles.buttonText}>View Challenges</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('SpotsTab')}>
        <Text style={styles.buttonText}>Explore Spots</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ChallengeListScreen({ navigation }: any) {
  const { challenges } = useChallenges();

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, item.completed && styles.cardCompleted]}
      onPress={() => navigation.navigate('ChallengeDetail', { id: item.id })}
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
      <FlatList data={challenges} keyExtractor={(i) => i.id} renderItem={renderItem} />
    </SafeAreaView>
  );
}

function ChallengeDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { challenges, completeChallenge } = useChallenges();

  const challenge = challenges.find((c: any) => c.id === id);

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Challenge not found</Text>
      </SafeAreaView>
    );
  }

  const handleComplete = () => {
    completeChallenge(id);
    navigation.goBack();
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

function SpotsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Spots</Text>
      <Text style={styles.text}>Future: list nearby spots, spot-specific challenges, and maps.</Text>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const { xp, level, challenges } = useChallenges();

  const completed = challenges.filter((c: any) => c.completed);
  const inProgress = challenges.filter((c: any) => !c.completed);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Level {level}</Text>
      <Text style={styles.text}>{xp} XP total</Text>

      <Text style={[styles.subtitle, { marginTop: 16 }]}>Completed</Text>
      {completed.length === 0 ? (
        <Text style={styles.text}>No completed challenges yet.</Text>
      ) : (
        <FlatList
          data={completed}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.smallRow}>
              <Text style={styles.text}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.xp} XP</Text>
            </View>
          )}
        />
      )}

      <Text style={[styles.subtitle, { marginTop: 16 }]}>In Progress</Text>
      {inProgress.length === 0 ? (
        <Text style={styles.text}>No active challenges — go skate!</Text>
      ) : (
        <FlatList
          data={inProgress}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.smallRow}>
              <Text style={styles.text}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.xp} XP</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------------------------------------------------
   NAVIGATION SETUP
--------------------------------------------------------- */

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ChallengesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ChallengeList" component={ChallengeListScreen} options={{ title: 'Challenges' }} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ title: 'Challenge' }} />
    </Stack.Navigator>
  );
}

function SpotsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Spots" component={SpotsScreen} />
    </Stack.Navigator>
  );
}

export default function ChallengeApp() {
  return (
    <ChallengeProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="ChallengesTab" component={ChallengesStack} options={{ title: 'Challenges' }} />
          <Tab.Screen name="SpotsTab" component={SpotsStack} options={{ title: 'Spots' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </ChallengeProvider>
  );
}

/* ---------------------------------------------------------
   STYLES
--------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  text: {
    fontSize: 16,
    color: '#444',
    marginTop: 8,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    marginTop: 8,
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f6f6f6',
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
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  completedLabel: {
    color: '#0a8f08',
    fontWeight: '700',
  },
  smallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
