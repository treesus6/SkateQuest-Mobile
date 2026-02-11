import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

/**
 * An enhanced loading skeleton with a shimmer sweep animation.
 * Uses a translating opacity gradient effect for a modern feel.
 */
export default function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
}: ShimmerSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.25, 0.55, 0.25],
  });

  return (
    <View className={className}>
      <View
        style={{
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e0e0e0',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: '#f0f0f0',
            opacity,
          }}
        />
      </View>
    </View>
  );
}
