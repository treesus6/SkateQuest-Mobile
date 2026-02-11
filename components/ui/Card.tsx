import React, { ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-white rounded-xl p-4 mb-3 shadow-sm ${className}`}>
      {children}
    </View>
  );
}
