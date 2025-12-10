import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

// Screens
import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import AddSpotScreen from '../screens/AddSpotScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ShopsScreen from '../screens/ShopsScreen';
import CrewsScreen from '../screens/CrewsScreen';
import EventsScreen from '../screens/EventsScreen';
import FeedScreen from '../screens/FeedScreen';
import UploadMediaScreen from '../screens/UploadMediaScreen';
import TrickTrackerScreen from '../screens/TrickTrackerScreen';
import SkateGameScreen from '../screens/SkateGameScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import GameDetailScreen from '../screens/GameDetailScreen';
import SpotDetailScreen from '../screens/SpotDetailScreen';

export type RootStackParamList = {
  Auth: undefined;
  Map: undefined;
  Profile: undefined;
  Challenges: undefined;
  AddSpot: { latitude?: number; longitude?: number };
  Leaderboard: undefined;
  Shops: undefined;
  Crews: undefined;
  Events: undefined;
  Feed: undefined;
  UploadMedia: undefined;
  TrickTracker: undefined;
  SkateGame: undefined;
  Playlists: undefined;
  GameDetail: { gameId: string };
  SpotDetail: { spotId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#d2673d',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          {!user ? (
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              <Stack.Screen
                name="Map"
                component={MapScreen}
                options={{ title: 'SkateQuest' }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
              />
              <Stack.Screen
                name="Challenges"
                component={ChallengesScreen}
                options={{ title: 'Challenges' }}
              />
              <Stack.Screen
                name="AddSpot"
                component={AddSpotScreen}
                options={{ title: 'Add Spot' }}
              />
              <Stack.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{ title: 'Leaderboard' }}
              />
              <Stack.Screen
                name="Shops"
                component={ShopsScreen}
                options={{ title: 'Skate Shops' }}
              />
              <Stack.Screen
                name="Crews"
                component={CrewsScreen}
                options={{ title: 'Crews' }}
              />
              <Stack.Screen
                name="Events"
                component={EventsScreen}
                options={{ title: 'Events' }}
              />
              <Stack.Screen
                name="Feed"
                component={FeedScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="UploadMedia"
                component={UploadMediaScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TrickTracker"
                component={TrickTrackerScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SkateGame"
                component={SkateGameScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Playlists"
                component={PlaylistsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="GameDetail"
                component={GameDetailScreen}
                options={{ title: 'SKATE Game' }}
              />
              <Stack.Screen
                name="SpotDetail"
                component={SpotDetailScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
