import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getAuthReturnPath } from '../../lib/authReturnPath';
import { completeNativeOAuthCallback } from '../../lib/nativeOAuthCompletion';

export default function NativeAuthCallback() {
  const router = useRouter();
  const { code, error: oauthError, error_description } = useLocalSearchParams<{
    code?: string; error?: string; error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function finish() {
      if (oauthError || error_description) {
        if (active) setError(error_description || oauthError || 'Authentication failed');
        return;
      }

      // Never navigate on a pre-existing session: it could belong to a
      // different user, and a failed PKCE exchange must not appear successful.
      const result = await completeNativeOAuthCallback(
        typeof code === 'string' ? code : undefined,
        value => supabase.auth.exchangeCodeForSession(value)
      );
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(getAuthReturnPath() as any);
    }
    void finish();
    return () => { active = false; };
  }, [code, oauthError, error_description, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#05070B', justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      {error ? (
        <>
          <Text style={{ color: '#FCA5A5', textAlign: 'center' }}>Sign-in failed: {error}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login' as any)}
            style={{ backgroundColor: '#D2673D', borderRadius: 10, padding: 14 }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Back to sign in</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color="#D2673D" />
          <Text style={{ color: '#D1D5DB' }}>Completing secure sign in…</Text>
        </>
      )}
    </View>
  );
}
