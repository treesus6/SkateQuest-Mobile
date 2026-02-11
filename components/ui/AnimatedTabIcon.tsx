import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface AnimatedTabIconProps {
  focused: boolean;
  children: React.ReactNode;
}

/**
 * Wraps a Lucide tab icon with a scale bounce animation when focused.
 * Provides visual emphasis when the user switches tabs.
 */
export default function AnimatedTabIcon({
  focused,
  children,
}: AnimatedTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.25,
          tension: 200,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {children}
    </Animated.View>
  );
}
