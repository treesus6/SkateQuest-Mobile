import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Animated, TouchableOpacity, Platform } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

let toastInstance: ((config: ToastConfig) => void) | null = null;

export const showToast = (config: ToastConfig) => {
  if (toastInstance) toastInstance(config);
};

const TOAST_ICONS: Record<ToastType, any> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
};

export const Toast: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  const show = useCallback((newConfig: ToastConfig) => {
    setConfig(newConfig);
    setVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
    ]).start();

    setTimeout(() => { hide(); }, newConfig.duration || 3000);
  }, [fadeAnim, slideAnim]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -100, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      config?.onDismiss?.();
      setConfig(null);
    });
  }, [config, fadeAnim, slideAnim]);

  useEffect(() => {
    toastInstance = show;
    return () => { toastInstance = null; };
  }, [show]);

  if (!visible || !config) return null;

  const Icon = TOAST_ICONS[config.type];
  const backgroundColor = TOAST_COLORS[config.type];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 10, right: 10,
        borderRadius: 8, padding: 16,
        backgroundColor,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
        zIndex: 9999,
      }}
    >
      <View className="flex-row items-center">
        <Icon color="#fff" size={20} />
        <Text className="flex-1 text-white text-sm leading-5 mx-3" numberOfLines={3}>
          {config.message}
        </Text>
        <TouchableOpacity onPress={hide} className="p-1">
          <X color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default Toast;
