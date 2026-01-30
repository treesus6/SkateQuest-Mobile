import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface SpotMarkerProps {
  spotType: 'park' | 'street' | 'diy' | 'quest' | 'shop';
  hasBondoAlert?: boolean;
  crewColor?: string;
  size?: number;
}

export default function SpotMarker({
  spotType,
  hasBondoAlert = false,
  crewColor,
  size = 40,
}: SpotMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasBondoAlert) {
      // Pulsing animation for Bondo alerts
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasBondoAlert]);

  const getSpotEmoji = () => {
    const emojiMap = {
      park: '🛹',
      street: '🏙️',
      diy: '🔨',
      quest: '📱',
      shop: '🛒',
    };
    return emojiMap[spotType] || '📍';
  };

  const getDefaultColor = () => {
    const colorMap = {
      park: '#10b981',
      street: '#3b82f6',
      diy: '#f59e0b',
      quest: '#8b5cf6',
      shop: '#ef4444',
    };
    return colorMap[spotType] || '#d2673d';
  };

  const backgroundColor = crewColor || getDefaultColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: hasBondoAlert ? '#ef4444' : backgroundColor,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: hasBondoAlert ? pulseAnim : 1 }],
        },
      ]}
    >
      <Text style={[styles.emoji, { fontSize: size * 0.5 }]}>{getSpotEmoji()}</Text>
      {hasBondoAlert && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertIcon}>🔧</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emoji: {
    color: '#fff',
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 12,
  },
});
