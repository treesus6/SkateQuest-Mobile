import React, { useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Map, Zap, Trophy, Users } from 'lucide-react-native';
import Button from './ui/Button';

interface OnboardingScreen {
  title: string;
  description: string;
  icon: any;
  color: string;
}

const screens: OnboardingScreen[] = [
  {
    title: 'Discover Skateparks',
    description: 'Find skateparks near you or explore new spots.',
    icon: Map,
    color: '#3b82f6',
  },
  {
    title: 'Share Your Tricks',
    description: 'Upload videos and photos of your best tricks.',
    icon: Zap,
    color: '#FF6B35',
  },
  {
    title: 'Complete Challenges',
    description: 'Take on daily and weekly challenges to level up.',
    icon: Trophy,
    color: '#f59e0b',
  },
  {
    title: 'Connect with Skaters',
    description: 'Follow your favorite skaters and join the community.',
    icon: Users,
    color: '#8b5cf6',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState(0);

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding status', error);
      onComplete();
    }
  };

  const screen = screens[currentScreen];
  const isLastScreen = currentScreen === screens.length - 1;
  const Icon = screen.icon;

  return (
    <View className="flex-1 bg-gray-900 justify-between p-6">
      {!isLastScreen && (
        <View className="self-end p-2.5">
          <Button title="Skip" onPress={handleComplete} variant="ghost" />
        </View>
      )}

      <View className="flex-1 justify-center items-center">
        <View className="mb-10">
          <Icon color={screen.color} size={100} />
        </View>

        <Text className="text-[28px] font-bold text-white mb-2 text-center">
          {screen.title}
        </Text>

        <Text className="text-base text-gray-300 text-center px-4">
          {screen.description}
        </Text>
      </View>

      <View className="flex-row justify-center mb-6">
        {screens.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full mx-1 ${
              index === currentScreen ? 'w-6 bg-white' : 'w-2 bg-gray-600'
            }`}
          />
        ))}
      </View>

      <Button
        title={isLastScreen ? "Let's Go!" : 'Next'}
        onPress={handleNext}
        variant="primary"
        size="lg"
      />
    </View>
  );
};

export default Onboarding;
