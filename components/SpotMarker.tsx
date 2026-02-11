import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { MapPin, Building2, Hammer, Smartphone, ShoppingCart, Wrench } from 'lucide-react-native';

interface SpotMarkerProps {
  spotType: 'park' | 'street' | 'diy' | 'quest' | 'shop';
  hasBondoAlert?: boolean;
  crewColor?: string;
  size?: number;
}

const SPOT_ICONS: Record<string, any> = {
  park: MapPin,
  street: Building2,
  diy: Hammer,
  quest: Smartphone,
  shop: ShoppingCart,
};

const SPOT_COLORS: Record<string, string> = {
  park: '#10b981',
  street: '#3b82f6',
  diy: '#f59e0b',
  quest: '#8b5cf6',
  shop: '#ef4444',
};

export default function SpotMarker({ spotType, hasBondoAlert = false, crewColor, size = 40 }: SpotMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasBondoAlert) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [hasBondoAlert]);

  const Icon = SPOT_ICONS[spotType] || MapPin;
  const backgroundColor = hasBondoAlert ? '#ef4444' : (crewColor || SPOT_COLORS[spotType] || '#d2673d');

  return (
    <Animated.View
      style={{
        backgroundColor,
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        transform: [{ scale: hasBondoAlert ? pulseAnim : 1 }],
      }}
    >
      <Icon color="#fff" size={size * 0.45} />
      {hasBondoAlert && (
        <View
          className="absolute -top-1 -right-1 bg-white rounded-full justify-center items-center"
          style={{ width: 20, height: 20 }}
        >
          <Wrench color="#ef4444" size={12} />
        </View>
      )}
    </Animated.View>
  );
}
