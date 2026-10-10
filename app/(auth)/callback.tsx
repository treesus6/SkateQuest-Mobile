import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { getAuthReturnPath } from '../../lib/authReturnPath';

const AUTH_QUERY_KEYS = ['code', 'error', 'error_code', 'error_description'];
const AUTH_HASH_KEYS = [
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'type',
  'error',
  'error_code',
  'error_description',
];

function readBrowserAuthParams() {
  if (typeof window === 'undefined') return { code: null, error: null };

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error =
    search.get('error_description') ||
    hash.get('error_description') ||
    search.get('error') ||
    hash.get('error');

  return {
    code: search.get('code'),
    error,
  };
}

function cleanBrowserAuthUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  AUTH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (AUTH_HASH_KEYS.some((key) => hash.has(key))) url.hash = '';

  window.history.replaceState(
    null,
    document.title,
    `${url.pathname}${url.search}${url.hash}`
  );
}

async function waitForSession(timeoutMs = 4000): Promise<{
  session: Session | null;
  error: AuthError | null;
}> {
  const initial = await supabase.auth.getSession();
  if (initial.error || initial.data.session) {
    return { session: initial.data.session, error: initial.error };
  }

  return new Promise((resolve) => {
    let settled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const finish = (session: Session | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.unsubscribe();
      resolve({ session, error: null });
    };

    const timer = setTimeout(() => finish(null), timeoutMs);
    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });
    subscription = listener.data.subscription;
  });
}

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const browserParams = readBrowserAuthParams();
      if (browserParams.error) {
        cleanBrowserAuthUrl();
        if (active) setError(browserParams.error);
        return;
      }

      // Supabase normally processes an implicit-flow hash automatically because
      // detectSessionInUrl is enabled. Check for that session before doing any
      // explicit code exchange so we never race a successful automatic callback.
      const initial = await supabase.auth.getSession();
      if (!active) return;
      if (initial.error) {
        setError(initial.error.message);
        return;
      }
      if (initial.data.session) {
        cleanBrowserAuthUrl();
        router.replace(getAuthReturnPath() as any);
        return;
      }

      // Also support PKCE/code callbacks. This keeps the route working if the
      // web auth flow changes from implicit to PKCE in a future Supabase update.
      if (browserParams.code) {
        const exchange = await supabase.auth.exchangeCodeForSession(browserParams.code);
        if (!active) return;

        if (exchange.error) {
          // detectSessionInUrl may have completed the same exchange first. Re-read
          // the session before treating a single-use code exchange error as fatal.
          const afterExchange = await supabase.auth.getSession();
          if (!active) return;
          if (afterExchange.data.session) {
            cleanBrowserAuthUrl();
            router.replace(getAuthReturnPath() as any);
            return;
          }
          cleanBrowserAuthUrl();
          setError(exchange.error.message);
          return;
        }

        cleanBrowserAuthUrl();
        router.replace(getAuthReturnPath() as any);
        return;
      }

      // Some browsers finish parsing the OAuth hash just after this route mounts.
      // Give the auth client a short window to emit SIGNED_IN before failing back.
      const settled = await waitForSession();
      if (!active) return;
      if (settled.error) {
        setError(settled.error.message);
        return;
      }
      if (settled.session) {
        cleanBrowserAuthUrl();
        router.replace(getAuthReturnPath() as any);
        return;
      }

      setError('We could not finish the sign-in. Please try Google sign-in again.');
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
        <>
          <Text selectable style={{ color: '#FCA5A5', textAlign: 'center' }}>
            Sign-in callback failed: {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/login' as any)}
            style={{
              backgroundColor: '#D2673D',
              borderRadius: 10,
              paddingHorizontal: 18,
              paddingVertical: 11,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Back to sign in</Text>
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
