import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  ModalProps as RNModalProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';

interface ModalProps extends Omit<RNModalProps, 'visible'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses: Record<string, string> = {
  sm: 'mx-10',
  md: 'mx-6',
  lg: 'mx-3',
  full: 'mx-0 rounded-none flex-1',
};

export default function Modal({
  visible,
  onClose,
  title,
  children,
  size = 'md',
  ...props
}: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose} {...props}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1 bg-black/60 justify-center"
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            className={`bg-[#121826] rounded-2xl overflow-hidden ${sizeClasses[size]}`}
          >
            {title ? (
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-700">
                <Text className="text-lg font-bold text-gray-100">{title}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={8}>
                  <X color="#9CA3AF" size={20} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View className="p-4">{children}</View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
