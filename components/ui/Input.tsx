import React, { forwardRef } from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerClassName = '', className = '', ...props }, ref) => {
    return (
      <View className={containerClassName}>
        {label ? <Text className="text-sm font-medium text-gray-300 mb-1">{label}</Text> : null}
        <TextInput
          ref={ref}
          className={`bg-[#121826] text-gray-100 p-3 rounded-lg ${error ? 'border border-red-500' : ''} ${className}`}
          placeholderTextColor="#6B7280"
          {...props}
        />
        {error ? <Text className="text-red-400 text-xs mt-1">{error}</Text> : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

export default Input;
