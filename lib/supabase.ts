import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Validate credentials before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE CREDENTIALS MISSING!');
  console.error('URL present:', !!supabaseUrl);
  console.error('Key present:', !!supabaseAnonKey);
  console.error('');
  console.error('Make sure eas.json has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Supabase credentials not configured. Check eas.json production env vars.');
}

console.log('✅ Initializing Supabase for SkateQuest...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'skatequest-mobile/1.0',
    },
  },
});

console.log('✅ Supabase client ready');
