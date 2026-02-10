import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Home, Trophy, MapPin, Users, User, Calendar } from 'lucide-react-native';
import { ChallengeProvider, useChallenges } from '../contexts/ChallengeContext';

import CrewScreen from '../screens/CrewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SpotsScreenFromFile from '../screens/SpotsScreen';
import DailyQuestsScreen from '../screens/DailyQuestsScreen';
import LevelUpModal from './LevelUpModal';

function HomeScreen({ navigation }: any) {
  const { xp, level, challenges } = useChallenges();
  const completedCount = challenges.filter((c: any) => c.completed).length;

  return (
    <SafeAreaView className="flex-1 p-4 bg-white dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />
      <Text className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">SkateQuest</Text>
      <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        Level {level} · {xp} XP
      </Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mt-2">
        Completed challenges: {completedCount} / {challenges.length}
      </Text>

      <TouchableOpacity
        className="mt-4 bg-gray-900 dark:bg-gray-100 p-3 rounded-lg items-center"
        onPress={() => navigation.navigate('ChallengesTab')}
      >
        <Text className="text-white dark:text-gray-900 font-semibold">View Challenges</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-2 bg-gray-500 p-3 rounded-lg items-center"
        onPress={() => navigation.navigate('SpotsTab')}
      >
        <Text className="text-white font-semibold">Explore Spots</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function ChallengeListScreen({ navigation }: any) {
  const { challenges } = useChallenges();

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 mb-2 flex-row justify-between items-center ${item.completed ? 'opacity-60' : ''}`}
      onPress={() => navigation.navigate('ChallengeDetail', { id: item.id })}
    >
      <View>
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.title}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{item.xp} XP</Text>
      </View>
      {item.completed && <Text className="text-green-600 font-bold">Completed</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 p-4 bg-white dark:bg-gray-900">
      <FlatList data={challenges} keyExtractor={i => i.id} renderItem={renderItem} />
    </SafeAreaView>
  );
}

function ChallengeDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { challenges, completeChallenge } = useChallenges();
  const challenge = challenges.find((c: any) => c.id === id);

  if (!challenge) {
    return (
      <SafeAreaView className="flex-1 p-4 bg-white dark:bg-gray-900">
        <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">Challenge not found</Text>
      </SafeAreaView>
    );
  }

  const handleComplete = () => {
    completeChallenge(id);
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 p-4 bg-white dark:bg-gray-900">
      <Text className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{challenge.title}</Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mt-2">{challenge.description}</Text>
      <Text className="text-base text-gray-500 dark:text-gray-400 mt-2">XP: {challenge.xp}</Text>

      {challenge.completed ? (
        <Text className="text-green-600 font-bold mt-4">Already completed</Text>
      ) : (
        <TouchableOpacity
          className="mt-4 bg-gray-900 dark:bg-gray-100 p-3 rounded-lg items-center"
          onPress={handleComplete}
        >
          <Text className="text-white dark:text-gray-900 font-semibold">Mark as completed</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ChallengesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChallengeList"
        component={ChallengeListScreen}
        options={{ title: 'Challenges' }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ title: 'Challenge' }}
      />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#d2673d',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopWidth: 0, elevation: 8, shadowOpacity: 0.1 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ChallengesTab"
        component={ChallengesStack}
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SpotsTab"
        component={SpotsScreenFromFile}
        options={{
          title: 'Spots',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CrewTab"
        component={CrewScreen}
        options={{
          title: 'Crew',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="DailyTab"
        component={DailyQuestsScreen}
        options={{
          title: 'Daily',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
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
