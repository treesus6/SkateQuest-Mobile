import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      else router.replace(data.session ? '/(tabs)/' : '/(auth)/login');
    });
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
