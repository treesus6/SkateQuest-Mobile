import { Stack } from 'expo-router';

export default function ChallengesTabLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Challenges' }} />
      <Stack.Screen name="[id]" options={{ title: 'Challenge' }} />
    </Stack>
  );
}
