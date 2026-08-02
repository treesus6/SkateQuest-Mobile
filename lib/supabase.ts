import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { processLock } from '@supabase/auth-js';
import Constants from 'expo-constants';

// Runtime config comes from Constants.expoConfig.extra (set in app.config.js) —
// process.env.EXPO_PUBLIC_* is undefined at runtime in EAS production builds.
const supabaseUrl =
  (Constants.expoConfig?.extra?.supabaseUrl as string) || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Validate credentials before creating client — never throw here, it causes a white screen
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ SUPABASE CREDENTIALS MISSING! Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env.local file for local dev, or to eas.json for builds.'
  );
}

console.warn('✅ Supabase: initializing...');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
  global: {
    headers: {
      'X-Client-Info': 'skatequest-mobile/1.0',
    },
  },
});

console.warn('✅ Supabase: client ready');
