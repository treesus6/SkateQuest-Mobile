import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useChallenges } from '../../contexts/ChallengeContext';
import LevelUpModal from '../../components/LevelUpModal';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

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
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
        <Tabs.Screen name="challenges" options={{ title: 'Challenges', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }} />
        <Tabs.Screen name="spots" options={{ title: 'Spots', tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} /> }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="🛹" focused={focused} /> }} />
        <Tabs.Screen name="daily" options={{ title: 'Daily', tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} /> }} />
      </Tabs>
    </>
  );
}
