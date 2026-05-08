import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glow' | 'gradient' | 'glass';
  accentColor?: string;
}

export default function Card({ children, style, variant = 'default', accentColor = '#d2673d' }: CardProps) {
  return (
    <View style={[
      s.base,
      variant === 'glow' && [s.glow, { shadowColor: accentColor }],
      variant === 'gradient' && s.gradient,
      variant === 'glass' && s.glass,
      style,
    ]}>
      {variant === 'glow' && <View style={[s.glowBorder, { borderColor: accentColor + '40' }]} />}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: '#0F1623',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1a2030',
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderColor: 'transparent',
  },
  glowBorder: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    borderWidth: 1,
  },
  gradient: {
    backgroundColor: '#0a0e1a',
    borderColor: '#1F2937',
  },
  glass: {
    backgroundColor: 'rgba(15, 22, 35, 0.85)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
