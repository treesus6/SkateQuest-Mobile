import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, StatusBar } from 'react-native';
import { ChallengeProvider, useChallenges } from '../contexts/ChallengeContext';

import HomeScreen from './HomeScreen';
import CrewScreen from '../screens/CrewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SpotsScreenFromFile from '../screens/SpotsScreen';
import DailyQuestsScreen from '../screens/DailyQuestsScreen';


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

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ChallengesTab" component={ChallengesStack} options={{ title: 'Challenges' }} />
      <Tab.Screen name="SpotsTab" component={SpotsScreenFromFile} options={{ title: 'Spots' }} />
      <Tab.Screen name="CrewTab" component={CrewScreen} options={{ title: 'Crew' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="DailyTab" component={DailyQuestsScreen} options={{ title: 'Daily' }} />
    </Tab.Navigator>
  );
}

export default function ChallengeApp() {
  return (
    <ChallengeProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      </Stack.Navigator>
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
