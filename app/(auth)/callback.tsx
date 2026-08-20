import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      router.replace(data.session ? '/' : '/login');
    };

    void finish();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#05070B',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 14,
      }}
    >
      {error ? (
        <Text selectable style={{ color: '#FCA5A5', textAlign: 'center' }}>
          Sign-in callback failed: {error}
        </Text>
      ) : (
        <>
          <ActivityIndicator color="#D2673D" />
          <Text style={{ color: '#D1D5DB' }}>Completing secure sign in…</Text>
        </>
      )}
    </View>
  );
}
