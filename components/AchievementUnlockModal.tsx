import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated } from 'react-native';
import { Trophy } from 'lucide-react-native';
import Button from './ui/Button';

interface Achievement { id: string; name: string; description: string; tier: number; xp_reward: number; }
interface Props { visible: boolean; achievement?: Achievement; onClose: () => void; }

export default function AchievementUnlockModal({ visible, achievement, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!achievement) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 items-center justify-center px-8">
        <Animated.View className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full items-center" style={{ transform: [{ scale: scaleAnim }] }}>
          <Trophy color="#FFD700" size={64} />
          <Text className="text-2xl font-black text-brand-terracotta mt-4">Achievement Unlocked!</Text>
          <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-2">{achievement.name}</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 mb-4">{achievement.description}</Text>
          <View className="bg-brand-green px-4 py-2 rounded-full mb-6">
            <Text className="text-white font-bold">+{achievement.xp_reward} XP</Text>
          </View>
          <Button title="Awesome!" onPress={onClose} variant="primary" size="lg" />
        </Animated.View>
      </View>
    </Modal>
  );
}
