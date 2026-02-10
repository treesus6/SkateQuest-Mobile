import { Stack } from 'expo-router';

export default function MapLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'SkateQuest',
          headerStyle: { backgroundColor: '#d2673d' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="add-spot"
        options={{
          title: 'Add Spot',
          headerStyle: { backgroundColor: '#d2673d' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen name="[spotId]" options={{ headerShown: false }} />
    </Stack>
  );
}
