/**
 * HypeButton.tsx
 * Replaces the standard "Like" button with a multi-tap "Hype" button.
 *
 * - Users can tap up to 50 times to give a clip more Hype
 * - Each tap adds to the hype count with a satisfying animation
 * - The button pulses and changes color as hype accumulates
 * - Hype count is debounced and saved to the server after 1.5s of inactivity
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  Vibration,
} from 'react-native';
import { Flame } from 'lucide-react-native';

const MAX_HYPE = 50;
const DEBOUNCE_MS = 1500;

// Color progression as hype increases
function getHypeColor(count: number): string {
  if (count === 0) return '#9CA3AF'; // gray
  if (count < 5) return '#FF9800';  // orange
  if (count < 15) return '#FF6B35'; // deep orange
  if (count < 30) return '#EF4444'; // red
  return '#9333EA';                  // purple — maxed out
}

function getHypeLabel(count: number): string {
  if (count === 0) return 'Hype';
  if (count < 5) return 'Hyped!';
  if (count < 15) return 'On Fire!';
  if (count < 30) return 'STOMP!';
  return 'LEGENDARY';
}

interface HypeButtonProps {
  mediaId: string;
  initialHypeCount: number;
  userHypeCount?: number; // how many times THIS user has hyped (0-50)
  onHype: (mediaId: string, newUserHypeCount: number) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
}

export default function HypeButton({
  mediaId,
  initialHypeCount,
  userHypeCount = 0,
  onHype,
  size = 'md',
}: HypeButtonProps) {
  const [totalHype, setTotalHype] = useState(initialHypeCount);
  const [myHype, setMyHype] = useState(userHypeCount);
  const [pendingHype, setPendingHype] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const hypeColor = getHypeColor(myHype);
  const hypeLabel = getHypeLabel(myHype);
  const isMaxed = myHype >= MAX_HYPE;

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const animateTap = useCallback(() => {
    // Quick scale pop
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleTap = useCallback(() => {
    if (isMaxed) return;

    Vibration.vibrate(30);
    animateTap();

    const newMyHype = Math.min(myHype + 1, MAX_HYPE);
    const addedHype = newMyHype - myHype;

    setMyHype(newMyHype);
    setTotalHype(prev => prev + addedHype);
    setPendingHype(prev => prev + addedHype);

    // Debounce the server save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await onHype(mediaId, newMyHype);
        setPendingHype(0);
      } catch {
        // Silently fail — optimistic update stays
      }
    }, DEBOUNCE_MS);
  }, [isMaxed, myHype, mediaId, onHype, animateTap]);

  return (
    <TouchableOpacity
      onPress={handleTap}
      disabled={isMaxed}
      activeOpacity={0.7}
      className="flex-row items-center gap-1.5"
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Flame
          size={iconSize}
          color={hypeColor}
          fill={myHype > 0 ? hypeColor : 'transparent'}
        />
      </Animated.View>

      <View>
        <Text className={`font-bold ${textSize}`} style={{ color: hypeColor }}>
          {totalHype > 0 ? totalHype.toLocaleString() : hypeLabel}
        </Text>
        {myHype > 0 && (
          <Text className="text-[10px] text-gray-400" style={{ color: hypeColor + '99' }}>
            {isMaxed ? 'MAX HYPE' : `${myHype}/${MAX_HYPE}`}
          </Text>
        )}
      </View>

      {/* Pending indicator */}
      {pendingHype > 0 && (
        <View className="bg-brand-terracotta/20 rounded-full px-1.5 py-0.5">
          <Text className="text-brand-terracotta text-[10px] font-bold">+{pendingHype}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
