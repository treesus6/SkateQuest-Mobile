import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated } from 'react-native';
import { Trophy } from 'lucide-react-native';
import Button from './ui/Button';

interface Props { visible: boolean; level: number; onClose: () => void; }

export default function LevelUpModal({ visible, level, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 items-center justify-center px-8">
        <Animated.View className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full items-center" style={{ transform: [{ scale: scaleAnim }] }}>
          <Trophy color="#FFD700" size={64} />
          <Text className="text-4xl font-extrabold text-brand-terracotta mt-4">LEVEL UP!</Text>
          <Text className="text-6xl font-black text-gray-800 dark:text-gray-100 my-2">{level}</Text>
          <Text className="text-base text-gray-500 dark:text-gray-400 text-center mb-6">
            You reached Level {level}! Keep skating to unlock more rewards.
          </Text>
          <Button title="Let's Go!" onPress={onClose} variant="primary" size="lg" />
        </Animated.View>
      </View>
    </Modal>
  );
}
