import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const REDIRECT_TO = 'com.treesus6.skatequest://auth/callback';

export async function signInWithGoogle(_returnTo = '/') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: REDIRECT_TO,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) return { data, error };

  // Expo's Android implementation does not support openAuthSessionAsync in
  // every runtime/build combination. Opening the OAuth URL normally lets the
  // registered deep link return control to SkateQuest without throwing.
  if (Platform.OS === 'android') {
    await WebBrowser.openBrowserAsync(data.url);
    return { data, error: null };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);
  if (result.type !== 'success' || !result.url) return { data, error: null };

  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  if (!code)
    return { data, error: new Error('Google sign-in did not return an authorization code.') };

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  return { data: exchange.data, error: exchange.error };
}

// Handle the OAuth callback delivered through the app's custom URL scheme.
export async function exchangeGoogleAuthCallback(url: string) {
  const parsed = Linking.parse(url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
  if (!code) return { data: null, error: new Error('Google sign-in did not return an authorization code.') };
  return supabase.auth.exchangeCodeForSession(code);
}
