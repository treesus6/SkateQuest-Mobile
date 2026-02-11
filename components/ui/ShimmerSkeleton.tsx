import React, { useEffect, useRef } from 'react';
import { View, Animated, useColorScheme } from 'react-native';

interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

/**
 * An enhanced loading skeleton with a shimmer sweep animation.
 * Adapts colors for light and dark mode.
 */
export default function ShimmerSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
}: ShimmerSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  const baseColor = isDark ? '#374151' : '#e0e0e0'; // gray-700 / light gray
  const shimmerColor = isDark ? '#4b5563' : '#f0f0f0'; // gray-600 / lighter gray

  return (
    <View className={className}>
      <View
        style={{
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: shimmerColor,
            opacity,
          }}
        />
      </View>
    </View>
  );
}
