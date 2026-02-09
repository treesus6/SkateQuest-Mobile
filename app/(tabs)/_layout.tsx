import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallenges } from '../../contexts/ChallengeContext';
import LevelUpModal from '../../components/LevelUpModal';

export default function TabLayout() {
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
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#FF5A3C',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: { backgroundColor: '#05070B', borderTopColor: '#1F2A3C' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="challenges" options={{ title: 'Challenges', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} /> }} />
        <Tabs.Screen name="spots" options={{ title: 'Spots', tabBarIcon: ({ color, size }) => <Ionicons name="location" size={size} color={color} /> }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
        <Tabs.Screen name="daily" options={{ title: 'Daily', tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> }} />
      </Tabs>
    </>
  );
}
