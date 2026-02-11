import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
}

/**
 * A pressable wrapper that scales down on press for tactile feedback.
 * Use this for interactive cards, buttons, or any tappable element.
 */
export default function AnimatedPressable({
  children,
  onPress,
  disabled = false,
  className = '',
  style,
  scaleDown = 0.96,
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleDown,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      className={className}
      style={[{ transform: [{ scale: scaleAnim }] }, style]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
