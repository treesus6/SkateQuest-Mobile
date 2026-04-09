import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Home, Trophy, MapPin, Users, User, Calendar, Bell, Award, Flame } from 'lucide-react-native';
import { ChallengeProvider, useChallenges } from '../contexts/ChallengeContext';
import AnimatedTabIcon from './ui/AnimatedTabIcon';
import { Haptics } from '../lib/haptics';

import HomeScreen from '../screens/HomeScreen';
import CrewScreen from '../screens/CrewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DailyQuestsScreen from '../screens/DailyQuestsScreen';
import LevelUpModal from './LevelUpModal';

// Feature screens (previously orphaned — now wired into navigation)
import MapScreen from '../screens/MapScreen';
import FeedScreen from '../screens/FeedScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import TrickTrackerScreen from '../screens/TrickTrackerScreen';
import SkateGameScreen from '../screens/SkateGameScreen';
import GameDetailScreen from '../screens/GameDetailScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import CrewsScreen from '../screens/CrewsScreen';
import EventsScreen from '../screens/EventsScreen';
import QRCodeScannerScreen from '../screens/QRCodeScannerScreen';
import UploadMediaScreen from '../screens/UploadMediaScreen';
import AddSpotScreen from '../screens/AddSpotScreen';
import SpotDetailScreen from '../screens/SpotDetailScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import CallOutsScreen from '../screens/CallOutsScreen';
import JudgesBoothScreen from '../screens/JudgesBoothScreen';
import SkateTVScreen from '../screens/SkateTVScreen';
import SpotReviewsScreen from '../screens/SpotReviewsScreen';
import CheckInScreen from '../screens/CheckInScreen';
import CrewBattlesScreen from '../screens/CrewBattlesScreen';
import MentorshipScreen from '../screens/MentorshipScreen';
import TrickBingoScreen from '../screens/TrickBingoScreen';
import SpotConquerScreen from '../screens/SpotConquerScreen';
import SeasonalPassScreen from '../screens/SeasonalPassScreen';
import StreaksScreen from '../screens/StreaksScreen';
import WeatherSpotsScreen from '../screens/WeatherSpotsScreen';
import HiddenGemsScreen from '../screens/HiddenGemsScreen';
import SpotOfTheDayScreen from '../screens/SpotOfTheDayScreen';
import ClipOfWeekScreen from '../screens/ClipOfWeekScreen';
import TrickTutorialsScreen from '../screens/TrickTutorialsScreen';
import DonateXPScreen from '../screens/DonateXPScreen';
import SponsorLeaderboardScreen from '../screens/SponsorLeaderboardScreen';
import SessionsScreen from '../screens/SessionsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SeasonalEventsScreen from '../screens/SeasonalEventsScreen';


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
      screenListeners={{
        tabPress: () => Haptics.light(),
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Home color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="ChallengesTab"
        component={ChallengesStack}
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Trophy color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SpotsTab"
        component={MapScreen}
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <MapPin color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="CrewTab"
        component={CrewScreen}
        options={{
          title: 'Crew',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Users color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <User color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="DailyTab"
        component={DailyQuestsScreen}
        options={{
          title: 'Daily',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Calendar color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Bell color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="AchievementsTab"
        component={AchievementsScreen}
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Award color={color} size={size} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="SeasonalTab"
        component={SeasonalEventsScreen}
        options={{
          title: 'Seasonal',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Flame color={color} size={size} />
            </AnimatedTabIcon>
          ),
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
        {/* Feature screens accessible from the map and other screens */}
        <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: true, title: 'Activity Feed' }} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
        <Stack.Screen name="TrickTracker" component={TrickTrackerScreen} options={{ headerShown: true, title: 'Trick Tracker' }} />
        <Stack.Screen name="SkateGame" component={SkateGameScreen} options={{ headerShown: true, title: 'SKATE Game' }} />
        <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: true, title: 'Game' }} />
        <Stack.Screen name="Playlists" component={PlaylistsScreen} options={{ headerShown: true, title: 'Session Playlists' }} />
        <Stack.Screen name="Shops" component={ShopsScreen} options={{ headerShown: true, title: 'Skate Shops' }} />
        <Stack.Screen name="Crews" component={CrewsScreen} options={{ headerShown: true, title: 'Crews' }} />
        <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: true, title: 'Events' }} />
        <Stack.Screen name="QRScanner" component={QRCodeScannerScreen} options={{ headerShown: true, title: 'Scan QR' }} />
        <Stack.Screen name="UploadMedia" component={UploadMediaScreen} options={{ headerShown: true, title: 'Upload Media' }} />
        <Stack.Screen name="AddSpot" component={AddSpotScreen} options={{ headerShown: true, title: 'Add Spot' }} />
        <Stack.Screen name="SpotDetail" component={SpotDetailScreen} options={{ headerShown: true, title: 'Spot Detail' }} />
        <Stack.Screen name="Challenges" component={ChallengesScreen} options={{ headerShown: true, title: 'Challenges' }} />
        <Stack.Screen name="CallOuts" component={CallOutsScreen} options={{ headerShown: true, title: 'Call Outs' }} />
        <Stack.Screen name="JudgesBooth" component={JudgesBoothScreen} options={{ headerShown: true, title: "Judge's Booth" }} />
        <Stack.Screen name="SkateTV" component={SkateTVScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SpotReviews" component={SpotReviewsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CrewBattles" component={CrewBattlesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Mentorship" component={MentorshipScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TrickBingo" component={TrickBingoScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SpotConquer" component={SpotConquerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SeasonalPass" component={SeasonalPassScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Streaks" component={StreaksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WeatherSpots" component={WeatherSpotsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="HiddenGems" component={HiddenGemsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SpotOfTheDay" component={SpotOfTheDayScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ClipOfWeek" component={ClipOfWeekScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TrickTutorials" component={TrickTutorialsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="DonateXP" component={DonateXPScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SponsorLeaderboard" component={SponsorLeaderboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Sessions" component={SessionsScreen} options={{ headerShown: true, title: 'Sessions' }} />
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
