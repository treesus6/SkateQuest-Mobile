import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react-native';

interface RetryBannerProps {
  /** Error message to display */
  error: string | null;
  /** Callback to retry the failed operation */
  onRetry: () => void;
  /** Whether a retry is currently in progress */
  loading?: boolean;
  /** Enable exponential backoff auto-retry (default: true) */
  autoRetry?: boolean;
  /** Maximum auto-retry attempts (default: 3) */
  maxAutoRetries?: number;
  className?: string;
}

/**
 * A banner that displays when a query fails and provides retry controls.
 * Supports manual retry button + automatic exponential backoff retries.
 */
export default function RetryBanner({
  error,
  onRetry,
  loading = false,
  autoRetry = true,
  maxAutoRetries = 3,
  className = '',
}: RetryBannerProps) {
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const autoRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (error) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setAutoRetryCount(0);
    }
  }, [error, slideAnim]);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!error || !autoRetry || autoRetryCount >= maxAutoRetries || loading) return;

    const delay = 2000 * Math.pow(2, autoRetryCount); // 2s, 4s, 8s
    autoRetryTimer.current = setTimeout(() => {
      setAutoRetryCount((c: number) => c + 1);
      onRetry();
    }, delay);

    return () => {
      if (autoRetryTimer.current) clearTimeout(autoRetryTimer.current);
    };
  }, [error, autoRetry, autoRetryCount, maxAutoRetries, loading, onRetry]);

  if (!error) return null;

  const isOffline = error.toLowerCase().includes('offline') || error.toLowerCase().includes('network');
  const Icon = isOffline ? WifiOff : AlertTriangle;

  return (
    <Animated.View
      className={className}
      style={{ transform: [{ translateY: slideAnim }] }}
    >
      <View className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg mx-4 my-2 px-4 py-3 flex-row items-center">
        <Icon color="#EF4444" size={18} />
        <View className="flex-1 mx-3">
          <Text className="text-sm text-red-700 dark:text-red-300" numberOfLines={2}>
            {error}
          </Text>
          {autoRetry && autoRetryCount < maxAutoRetries && (
            <Text className="text-xs text-red-400 dark:text-red-500 mt-0.5">
              Auto-retrying... ({autoRetryCount + 1}/{maxAutoRetries})
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            setAutoRetryCount(0);
            onRetry();
          }}
          disabled={loading}
          className="bg-red-500 px-3 py-1.5 rounded-md"
        >
          <View className="flex-row items-center gap-1.5">
            <RefreshCw color="#fff" size={14} />
            <Text className="text-white text-xs font-bold">
              {loading ? 'Retrying...' : 'Retry'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
