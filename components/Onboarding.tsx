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
    description: 'Find skateparks near you or explore spots around the world. Get directions, see photos, and read reviews from other skaters.',
    icon: Map,
    color: '#3b82f6',
  },
  {
    title: 'Share Your Tricks',
    description: 'Upload videos and photos of your best tricks. Get AI-powered analysis and feedback to improve your skills.',
    icon: Zap,
    color: '#FF6B35',
  },
  {
    title: 'Complete Challenges',
    description: 'Take on daily and weekly challenges. Compete on leaderboards and earn rewards for landing new tricks.',
    icon: Trophy,
    color: '#f59e0b',
  },
  {
    title: 'Connect with Skaters',
    description: 'Follow your favorite skaters, join crews, and discover local skate events. Build your skate community.',
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
      await AsyncStorage.setItem('onboarding_completed', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      onComplete();
    }
  };

  const screen = screens[currentScreen];
  const isLastScreen = currentScreen === screens.length - 1;
  const Icon = screen.icon;

  return (
    <View className="flex-1 bg-gray-900 justify-between p-5">
      {!isLastScreen && (
        <View className="self-end p-2.5">
          <Button title="Skip" onPress={handleComplete} variant="secondary" size="sm" />
        </View>
      )}

      <View className="flex-1 justify-center items-center px-5">
        <View className="mb-10">
          <Icon color={screen.color} size={100} />
        </View>
        <Text className="text-[28px] font-bold text-white text-center mb-5">{screen.title}</Text>
        <Text className="text-base text-gray-300 text-center leading-6 max-w-[320px]">{screen.description}</Text>
      </View>

      <View className="flex-row justify-center mb-10">
        {screens.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full mx-1 ${index === currentScreen ? 'bg-brand-terracotta w-6' : 'bg-gray-600 w-2'}`}
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
