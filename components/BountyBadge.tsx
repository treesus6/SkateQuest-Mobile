import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

interface BountyBadgeProps {
  challengeId: string;
  baseXP: number;
}

export default function BountyBadge({ challengeId, baseXP }: BountyBadgeProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateBounty();
  }, [challengeId]);

  const calculateBounty = async () => {
    try {
      // Count how many days the challenge has been uncompleted
      const { data: challenge } = await supabase
        .from('challenges')
        .select('created_at')
        .eq('id', challengeId)
        .single();

      if (challenge) {
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(challenge.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Increase multiplier by 0.5x every 3 days, max 5x
        const bonusMultiplier = Math.min(Math.floor(daysSinceCreated / 3) * 0.5, 4);
        setMultiplier(1 + bonusMultiplier);
      }
    } catch (error) {
      console.error('Error calculating bounty:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || multiplier === 1) {
    return null;
  }

  const totalXP = Math.floor(baseXP * multiplier);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>
      <View style={styles.info}>
        <Text style={styles.multiplier}>{multiplier}x BOUNTY</Text>
        <Text style={styles.xp}>+{totalXP} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiplier: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  xp: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
