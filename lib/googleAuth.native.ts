import * as WebBrowser from 'expo-web-browser';
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

  const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_TO);
  if (result.type !== 'success' || !result.url) return { data, error: null };

  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  if (!code)
    return { data, error: new Error('Google sign-in did not return an authorization code.') };

  const exchange = await supabase.auth.exchangeCodeForSession(code);
  return { data: exchange.data, error: exchange.error };
}
