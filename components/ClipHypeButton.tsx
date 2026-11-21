import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text } from 'react-native';
import { Heart, Sparkles } from 'lucide-react-native';
import { SCENE_TYPE } from '../lib/sceneTheme';
export default function ClipHypeButton({
  liked,
  count,
  onPress,
}: {
  liked: boolean;
  count: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const previous = useRef(liked);
  const reducedMotion = useRef(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      reducedMotion.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      reducedMotion.current = value;
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (liked && !previous.current && !reducedMotion.current) {
      scale.setValue(0.85);
      burst.setValue(1);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 120 }),
        Animated.timing(burst, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]).start();
    }
    previous.current = liked;
  }, [liked, scale, burst]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? 'Remove hype' : 'Hype this clip'}
      accessibilityState={{ selected: liked }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 13,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderWidth: 2,
        borderColor: liked ? '#D8F04B' : '#343B47',
        backgroundColor: liked ? '#D8F04B' : '#12161C',
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart
          size={18}
          color={liked ? '#07080B' : '#E36D3F'}
          fill={liked ? '#07080B' : 'transparent'}
        />
      </Animated.View>
      <Text style={{ ...SCENE_TYPE.metric, color: liked ? '#07080B' : '#F6F0E5', fontSize: 12 }}>
        {count}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -14,
          left: 7,
          opacity: burst,
          transform: [
            { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
          ],
        }}
      >
        <Sparkles size={25} color="#D8F04B" />
      </Animated.View>
    </Pressable>
  );
}
