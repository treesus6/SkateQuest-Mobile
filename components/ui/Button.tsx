import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#D2673D] border border-[#D2673D]',
  secondary: 'bg-[#1A2230] border border-[#334155]',
  outline: 'border border-[#D2673D] bg-[#D2673D]/5',
  ghost: 'bg-transparent border border-transparent',
  danger: 'bg-red-600 border border-red-500',
};

const textVariantClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-[#F7F4EF]',
  outline: 'text-[#E17A52]',
  ghost: 'text-[#E17A52]',
  danger: 'text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 rounded-xl',
  md: 'px-5 py-3 rounded-xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const textSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-45' : ''} ${className}`}
    >
      <Text className={`font-black tracking-wide ${textVariantClasses[variant]} ${textSizeClasses[size]}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
