import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
