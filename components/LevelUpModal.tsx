import React from 'react';
import { Modal, View, Text } from 'react-native';
import Button from './ui/Button';

type Props = {
  visible: boolean;
  level: number;
  onClose: () => void;
};

export default function LevelUpModal({ visible, level, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 justify-center items-center">
        <View className="w-4/5 bg-gray-900 rounded-2xl p-5 border border-brand-terracotta">
          <Text className="text-2xl font-extrabold text-white mb-2 text-center">Level Up!</Text>
          <Text className="text-[32px] font-black text-brand-terracotta text-center mb-3">Level {level}</Text>
          <Text className="text-sm text-gray-400 text-center mb-4">
            You just leveled up. Keep stacking clips and unlocking new challenges.
          </Text>
          <Button title="Keep skating" onPress={onClose} variant="primary" size="lg" />
        </View>
      </View>
    </Modal>
  );
}
