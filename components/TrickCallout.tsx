import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import tricks from '../data/tricks.json';
import Card from './ui/Card';
import Button from './ui/Button';

type Trick = string;

const OBSTACLES = [
  'flatground', 'curb', 'ledge', 'manual pad',
  '3-stair', '5-stair', 'bank', 'hip',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function TrickCallout() {
  const [prompt, setPrompt] = useState<string | null>(null);

  const generate = () => {
    const trick = randomItem(tricks as Trick[]);
    const obstacle = randomItem(OBSTACLES);
    const stance = randomItem(['regular', 'switch', 'fakie', 'nollie']);
    setPrompt(`${stance} ${trick} on the ${obstacle}.`);
  };

  return (
    <View className="mt-6">
      <Text className="text-xl font-extrabold text-white">Trick Callout</Text>
      <Text className="text-sm text-gray-400 mb-3">Hit a random mission right now.</Text>

      <Button title="Call me out" onPress={generate} variant="primary" size="md" />

      {prompt && (
        <Card className="mt-4">
          <View className="flex-row items-center gap-2 mb-1">
            <Sparkles color="#d2673d" size={16} />
            <Text className="text-lg font-bold text-gray-800 dark:text-white">{prompt}</Text>
          </View>
          <Text className="text-xs text-gray-400">Film it. Land it. Claim it.</Text>
        </Card>
      )}
    </View>
  );
}
