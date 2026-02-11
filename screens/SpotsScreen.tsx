import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { MapPin } from 'lucide-react-native';
import parks from '../data/parks.json';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type Park = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  difficulty?: string;
};

export default function SpotsScreen() {
  const data: Park[] = (parks as any) || [];

  const renderItem = ({ item }: { item: Park }) => (
    <Card>
      <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">{item.name}</Text>
      <View className="flex-row items-center gap-1 mt-1">
        <MapPin color="#888" size={14} />
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {item.city || ''}{item.city && item.state ? ', ' : ''}{item.state || ''}
        </Text>
      </View>
      {item.difficulty ? (
        <Text className="text-sm text-gray-400 mt-1">Park level: {item.difficulty}</Text>
      ) : null}
      <View className="mt-2">
        <Button title="View spot challenges (soon)" variant="primary" size="sm" />
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-5 rounded-b-2xl">
        <Text className="text-2xl font-bold text-white text-center">Spots</Text>
        <Text className="text-sm text-white/90 text-center mt-1">Parks nearby and mission hubs.</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={item => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}
