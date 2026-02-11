import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';

let ConfettiCannon: any = null;
try {
  ConfettiCannon = require('react-native-confetti-cannon').default;
} catch (e) {
  console.log('ConfettiCannon not installed - install with: bun add react-native-confetti-cannon');
}

export default function ConfettiWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const confettiRef = useRef<any>(null);
  const [shouldFireConfetti, setShouldFireConfetti] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        () => { fireConfetti(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fireConfetti = () => {
    if (ConfettiCannon && confettiRef.current) {
      confettiRef.current.start();
    } else {
      setShouldFireConfetti(true);
      setTimeout(() => setShouldFireConfetti(false), 3000);
    }
  };

  return (
    <View className="flex-1">
      {children}
      {ConfettiCannon ? (
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut
          fallSpeed={2500}
          explosionSpeed={350}
          colors={['#d2673d', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']}
        />
      ) : shouldFireConfetti ? (
        <View className="absolute inset-0" pointerEvents="none" />
      ) : null}
    </View>
  );
}
