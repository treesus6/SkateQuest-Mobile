import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
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
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
        <Tabs.Screen name="spots" options={{ title: 'Spots' }} />
        <Tabs.Screen name="crew" options={{ title: 'Crew' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="daily" options={{ title: 'Daily' }} />
      </Tabs>
    </>
  );
}
