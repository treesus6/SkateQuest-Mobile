import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

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
  primary: 'bg-brand-terracotta',
  secondary: 'bg-brand-purple',
  outline: 'border border-brand-terracotta bg-transparent',
  ghost: 'bg-transparent',
  danger: 'bg-red-500',
};

const textVariantClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-brand-terracotta',
  ghost: 'text-brand-terracotta',
  danger: 'text-white',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 rounded-md',
  md: 'px-5 py-2.5 rounded-lg',
  lg: 'px-6 py-3.5 rounded-xl',
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
      className={`items-center ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <Text className={`font-bold ${textVariantClasses[variant]} ${textSizeClasses[size]}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
