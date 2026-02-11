import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface ScreenFadeInProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  duration?: number;
}

/**
 * Wraps a screen's content with a smooth fade-in transition on mount.
 */
export default function ScreenFadeIn({
  children,
  className = '',
  style,
  duration = 350,
}: ScreenFadeInProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration]);

  return (
    <Animated.View
      className={className}
      style={[{ flex: 1, opacity: fadeAnim }, style]}
    >
      {children}
    </Animated.View>
  );
}
