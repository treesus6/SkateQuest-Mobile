import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  right,
  className = '',
}: SectionHeaderProps) {
  return (
    <View className={`flex-row justify-between items-center px-4 py-3 ${className}`}>
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</Text>
        {subtitle && (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</Text>
        )}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}
