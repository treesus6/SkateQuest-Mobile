import React from 'react';
import { View, Text } from 'react-native';
import Modal from './Modal';
import Button from './Button';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: 'default' | 'danger';
}

export default function Dialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'default',
}: DialogProps) {
  return (
    <Modal visible={visible} onClose={onClose} title={title} size="sm">
      <Text className="text-gray-300 text-base mb-5">{message}</Text>
      <View className="flex-row gap-3">
        {onConfirm ? (
          <>
            <View className="flex-1">
              <Button title={cancelLabel} variant="ghost" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button
                title={confirmLabel}
                variant={variant === 'danger' ? 'danger' : 'primary'}
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              />
            </View>
          </>
        ) : (
          <View className="flex-1">
            <Button title={confirmLabel} variant="primary" onPress={onClose} />
          </View>
        )}
      </View>
    </Modal>
  );
}
