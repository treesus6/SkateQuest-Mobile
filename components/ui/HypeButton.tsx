/**
 * Multi-tap Hype control backed by the server's per-user hype counter.
 * A skater can contribute up to 50 hype taps to a media item.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Flame } from 'lucide-react-native';

const MAX_HYPE = 50;
const DEBOUNCE_MS = 1500;

function getHypeColor(count: number): string {
  if (count === 0) return '#9CA3AF';
  if (count < 5) return '#FF9800';
  if (count < 15) return '#FF6B35';
  if (count < 30) return '#EF4444';
  return '#9333EA';
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
  userHypeCount?: number;
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
  const mountedRef = useRef(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // The parent receives the authoritative server totals. Once there is no local
  // write pending, keep this control synchronized with that source of truth.
  useEffect(() => {
    if (pendingHype !== 0) return;
    setTotalHype(initialHypeCount);
    setMyHype(userHypeCount);
  }, [initialHypeCount, userHypeCount, pendingHype]);

  const hypeColor = getHypeColor(myHype);
  const hypeLabel = getHypeLabel(myHype);
  const isMaxed = myHype >= MAX_HYPE;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  const animateTap = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const handleTap = useCallback(() => {
    if (isMaxed) return;

    Vibration.vibrate(30);
    animateTap();

    const serverMyHype = userHypeCount;
    const serverTotalHype = initialHypeCount;
    const newMyHype = Math.min(myHype + 1, MAX_HYPE);
    const addedHype = newMyHype - myHype;

    setMyHype(newMyHype);
    setTotalHype(prev => prev + addedHype);
    setPendingHype(prev => prev + addedHype);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await onHype(mediaId, newMyHype);
        if (mountedRef.current) setPendingHype(0);
      } catch {
        if (!mountedRef.current) return;
        // Never leave a failed optimistic write displayed as real engagement.
        setMyHype(serverMyHype);
        setTotalHype(serverTotalHype);
        setPendingHype(0);
      }
    }, DEBOUNCE_MS);
  }, [animateTap, initialHypeCount, isMaxed, mediaId, myHype, onHype, userHypeCount]);

  return (
    <TouchableOpacity
      onPress={handleTap}
      disabled={isMaxed}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Hype media. You added ${myHype} of ${MAX_HYPE}. Total ${totalHype}.`}
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
        {myHype > 0 ? (
          <Text className="text-[10px] text-gray-400" style={{ color: `${hypeColor}99` }}>
            {isMaxed ? 'MAX HYPE' : `${myHype}/${MAX_HYPE}`}
          </Text>
        ) : null}
      </View>

      {pendingHype > 0 ? (
        <View className="bg-brand-terracotta/20 rounded-full px-1.5 py-0.5">
          <Text className="text-brand-terracotta text-[10px] font-bold">+{pendingHype}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
