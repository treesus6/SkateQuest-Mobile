import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, StatusBar } from 'react-native';
import { ChallengeProvider, useChallenges } from '../contexts/ChallengeContext';

import HomeScreen from './HomeScreen';
import CrewScreen from '../screens/CrewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SpotsScreenFromFile from '../screens/SpotsScreen';
import DailyQuestsScreen from '../screens/DailyQuestsScreen';
import LevelUpModal from './LevelUpModal';


/* ---------------------------------------------------------
   SCREENS
--------------------------------------------------------- */

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

function InnerApp() {
  const { level } = useChallenges();
  const [lastLevel, setLastLevel] = useState(level);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (level > lastLevel) {
      setShowLevelUp(true);
      setLastLevel(level);
    }
  }, [level, lastLevel]);

  return (
    <>
      <LevelUpModal visible={showLevelUp} level={level} onClose={() => setShowLevelUp(false)} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      </Stack.Navigator>
    </>
  );
}

export default function ChallengeApp() {
  return (
    <ChallengeProvider>
      <InnerApp />
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
