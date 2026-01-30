import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Optional confetti import - install with: bun add react-native-confetti-cannon
let ConfettiCannon: any = null;
try {
  ConfettiCannon = require('react-native-confetti-cannon').default;
} catch (e) {
  console.log('ConfettiCannon not installed - install with: bun add react-native-confetti-cannon');
}

export default function ConfettiWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const confettiRef = useRef<any>(null);
  const [shouldFireConfetti, setShouldFireConfetti] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to user_achievements table for real-time confetti
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
        (payload) => {
          console.log('🎉 Achievement unlocked:', payload.new);
          fireConfetti();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fireConfetti = () => {
    if (ConfettiCannon && confettiRef.current) {
      confettiRef.current.start();
    } else {
      // Fallback animation if library not installed
      setShouldFireConfetti(true);
      setTimeout(() => setShouldFireConfetti(false), 3000);
    }
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.fallbackConfetti}>
          {/* Fallback visual if confetti library not installed */}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallbackConfetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});
