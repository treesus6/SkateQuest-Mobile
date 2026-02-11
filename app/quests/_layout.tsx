import { Stack } from 'expo-router';

export default function QuestsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Challenges',
          headerStyle: { backgroundColor: '#d2673d' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen name="call-outs" options={{ headerShown: false }} />
      <Stack.Screen name="judges-booth" options={{ headerShown: false }} />
      <Stack.Screen name="skate-game" options={{ headerShown: false }} />
      <Stack.Screen
        name="game"
        options={{
          title: 'SKATE Game',
          headerStyle: { backgroundColor: '#d2673d' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}
