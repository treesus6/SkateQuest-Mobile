import React from 'react';
import { Modal, View, Text } from 'react-native';
import Button from './ui/Button';

export default function LevelUpModal({ visible, level, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/85 justify-center items-center">
        <View className="w-4/5 bg-gray-900 rounded-2xl p-6 items-center">
          <Text className="text-[32px] font-black text-white mb-2">
            LEVEL UP! 🎉
          </Text>

          <Text className="text-2xl font-extrabold text-purple-400 mb-4">
            Level {level}
          </Text>

          <Text className="text-sm text-gray-400 text-center mb-6">
            You just leveled up. Keep stacking clips and progressing.
          </Text>

          <Button title="Keep skating" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

