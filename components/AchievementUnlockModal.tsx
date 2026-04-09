import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Star, Trophy } from 'lucide-react-native';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: number;
  xp_reward: number;
}

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement?: Achievement;
  onClose: () => void;
}

const TIER_COLORS = {
  1: { bg: '#D2673D', text: '#FFF3ED' },
  2: { bg: '#6B4CE6', text: '#F3F0FF' },
  3: { bg: '#F59E0B', text: '#FFFBEB' },
  4: { bg: '#0EA5E9', text: '#F0F9FF' },
  5: { bg: '#A855F7', text: '#F9F5FF' },
};

export default function AchievementUnlockModal({ visible, achievement, onClose }: AchievementUnlockModalProps) {
  const scaleAnim = new Animated.Value(0.3);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Trigger entrance animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!achievement) return null;

  const tierColor = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS] || TIER_COLORS[1];

  return (
    <Modal visible={visible} onClose={onClose} size="lg">
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        {/* Celebration banner */}
        <View className="bg-gradient-to-br from-yellow-400 to-yellow-200 rounded-2xl p-6 mb-6 pt-8 pb-8 items-center">
          {/* Stars around the trophy */}
          <View className="absolute top-2 left-4">
            <Star size={20} color="#FCD34D" fill="#FCD34D" />
          </View>
          <View className="absolute top-2 right-4">
            <Star size={20} color="#FCD34D" fill="#FCD34D" />
          </View>

          {/* Trophy icon */}
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: tierColor.bg }}
          >
            <Trophy size={48} color={tierColor.text} fill={tierColor.text} strokeWidth={1.5} />
          </View>

          <Text className="text-2xl font-bold text-center text-gray-900 mb-2">Achievement Unlocked!</Text>
          <Text
            className="text-sm text-center"
            style={{ color: tierColor.text }}
          >
            Tier {achievement.tier} Achievement
          </Text>
        </View>

        {/* Achievement details */}
        <View className="mb-6 px-2">
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">{achievement.name}</Text>
          <Text className="text-sm text-gray-600 text-center mb-4">{achievement.description}</Text>

          {/* XP reward badge */}
          <View className="bg-brand-terracotta/10 rounded-xl p-4 items-center">
            <Text className="text-sm text-gray-600 mb-1">You earned</Text>
            <Text className="text-3xl font-bold text-brand-terracotta">+{achievement.xp_reward} XP</Text>
          </View>
        </View>

        {/* Close button */}
        <Button
          title="Awesome! 🎉"
          variant="primary"
          size="md"
          onPress={onClose}
        />
      </Animated.View>
    </Modal>
  );
}
