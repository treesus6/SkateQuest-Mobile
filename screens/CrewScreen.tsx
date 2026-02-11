import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Crown, Users } from 'lucide-react-native';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnimatedListItem, ScreenFadeIn } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';

type CrewMember = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
  sessions: number;
};

const MOCK_CREW: CrewMember[] = [
  {
    id: '1',
    name: 'You',
    role: 'owner',
    joinedAt: '2024-01-01',
    sessions: 42,
  },
  {
    id: '2',
    name: 'Homie A',
    role: 'member',
    joinedAt: '2024-03-10',
    sessions: 18,
  },
  {
    id: '3',
    name: 'Homie B',
    role: 'member',
    joinedAt: '2024-04-22',
    sessions: 9,
  },
];

export default function CrewScreen() {
  const renderItem = ({ item, index }: { item: CrewMember; index: number }) => (
    <AnimatedListItem index={index}>
      <Card>
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {item.name}
          </Text>
          {item.role === 'owner' && <Crown color="#FFD700" size={16} />}
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400">Sessions: {item.sessions}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">Joined: {item.joinedAt}</Text>
      </Card>
    </AnimatedListItem>
  );

  return (
    <ScreenFadeIn>
      <View className="flex-1 p-4 bg-brand-beige dark:bg-gray-950">
        <View className="flex-row items-center gap-2 mb-1">
          <Users color="#6B4CE6" size={24} />
          <Text className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">Your Crew</Text>
        </View>
        <Text className="text-base text-gray-500 dark:text-gray-400 mb-4">Session homies, shared challenges, crew energy.</Text>

        <FlatList
          data={MOCK_CREW}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListEmptyComponent={<EmptyStates.NoCrews />}
        />

        <Button title="Invite a homie (coming soon)" variant="primary" />
      </View>
    </ScreenFadeIn>
  );
}
