import { View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      router.replace('/(auth)/login');
    }
  };

  return (
    <View className="flex-1 bg-brand-dark justify-between p-5">
      <View className="flex-1 justify-center items-center px-5">
        <Text className="text-[120px] mb-10">🛹</Text>
        <Text className="text-3xl font-bold text-text-primary text-center mb-5">
          Welcome to SkateQuest
        </Text>
        <Text className="text-base text-text-secondary text-center leading-6 max-w-[320px]">
          Find skateparks, track tricks, complete challenges, and connect with skaters worldwide.
        </Text>
      </View>

      <TouchableOpacity
        className="bg-brand-orange rounded-xl py-4 items-center"
        onPress={handleGetStarted}
      >
        <Text className="text-white text-lg font-bold">Let's Go!</Text>
      </TouchableOpacity>
    </View>
  );
}
