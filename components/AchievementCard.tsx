import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock, Trophy, Zap } from 'lucide-react-native';

interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: number;
  xp_reward: number;
}

interface Props {
  achievement: Achievement;
  isUnlocked: boolean;
}

const INK = '#07080B';
const PAPER = '#F6F0E5';
const ORANGE = '#E36D3F';
const ACID = '#D9F34A';
const TIER_COLORS: Record<number, string> = {
  1: ORANGE,
  2: '#8B7CF6',
  3: '#F7B955',
  4: '#5CC8FF',
  5: '#C084FC',
};

export default function AchievementCard({ achievement, isUnlocked }: Props) {
  const color = TIER_COLORS[achievement.tier] || ORANGE;

  if (!isUnlocked) {
    return (
      <View style={s.lockedCard}>
        <View style={s.lockIcon}>
          <Lock size={19} color="#A8AFBA" strokeWidth={2.6} />
        </View>
        <View style={s.copy}>
          <Text style={s.lockedKicker}>LOCKED ACHIEVEMENT</Text>
          <Text style={s.lockedName}>{achievement.name}</Text>
          <Text style={s.lockedDescription}>{achievement.description}</Text>
        </View>
        <View style={s.lockedTier}>
          <Text style={s.lockedTierText}>T{achievement.tier}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={[s.tierStripe, { backgroundColor: color }]} />
      <View style={[s.trophyStamp, { backgroundColor: color }]}>
        <Trophy size={21} color={INK} fill={INK} strokeWidth={1.6} />
      </View>
      <View style={s.copy}>
        <Text style={s.earnedKicker}>UNLOCKED • TIER {achievement.tier}</Text>
        <Text style={s.name}>{achievement.name}</Text>
        <Text style={s.description}>{achievement.description}</Text>
      </View>
      <View style={s.xpSticker}>
        <Zap size={11} color={INK} strokeWidth={3} />
        <Text style={s.xpText}>+{achievement.xp_reward}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: PAPER,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: INK,
    padding: 12,
    paddingLeft: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  tierStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 6,
  },
  trophyStamp: {
    width: 45,
    height: 45,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  copy: { flex: 1 },
  earnedKicker: {
    color: ORANGE,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  name: {
    color: INK,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
    marginTop: 2,
  },
  description: {
    color: '#646963',
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  xpSticker: {
    minWidth: 48,
    height: 35,
    borderRadius: 11,
    backgroundColor: ACID,
    borderWidth: 1.5,
    borderColor: INK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    transform: [{ rotate: '4deg' }],
  },
  xpText: { color: INK, fontSize: 9, fontWeight: '900' },

  lockedCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#15181E',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#30343D',
    padding: 12,
  },
  lockIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#242830',
    borderWidth: 1,
    borderColor: '#373C46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedKicker: {
    color: '#69717E',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  lockedName: {
    color: '#CED3DA',
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
    marginTop: 2,
  },
  lockedDescription: {
    color: '#777F8C',
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 3,
  },
  lockedTier: {
    minWidth: 37,
    height: 31,
    borderRadius: 10,
    backgroundColor: '#252A32',
    borderWidth: 1,
    borderColor: '#3B414C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTierText: { color: '#8B929E', fontSize: 8, fontWeight: '900' },
});
