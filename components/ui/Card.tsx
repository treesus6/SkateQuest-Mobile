import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: ViewStyle;
}

export default function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}
