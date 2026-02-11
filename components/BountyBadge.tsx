import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Coins } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface BountyBadgeProps {
  challengeId: string;
  baseXP: number;
}

export default function BountyBadge({ challengeId, baseXP }: BountyBadgeProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { calculateBounty(); }, [challengeId]);

  const calculateBounty = async () => {
    try {
      const { data: challenge } = await supabase
        .from('challenges')
        .select('created_at')
        .eq('id', challengeId)
        .single();

      if (challenge) {
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(challenge.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        const bonusMultiplier = Math.min(Math.floor(daysSinceCreated / 3) * 0.5, 4);
        setMultiplier(1 + bonusMultiplier);
      }
    } catch (error) {
      console.error('Error calculating bounty:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || multiplier === 1) return null;

  const totalXP = Math.floor(baseXP * multiplier);

  return (
    <View className="flex-row items-center bg-amber-500 px-3 py-2 rounded-full self-start">
      <Coins color="#fff" size={20} />
      <View className="flex-row items-center gap-2 ml-2">
        <Text className="text-xs font-bold text-white">{multiplier}x BOUNTY</Text>
        <Text className="text-sm font-bold text-white">+{totalXP} XP</Text>
      </View>
    </View>
  );
}
