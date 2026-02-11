import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View className={className}>
      <Animated.View
        style={{
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#e0e0e0',
          opacity,
        }}
      />
    </View>
  );
}
