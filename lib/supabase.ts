import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const processLock = {
  async acquireLock(lockName: string, acquireTimeout: number, retryInterval: number) {
    const lockKey = `lock:${lockName}`;
    const lockValue = Date.now().toString();
    const endTime = Date.now() + acquireTimeout;
    while (Date.now() < endTime) {
      const existingLock = await AsyncStorage.getItem(lockKey);
      if (!existingLock) {
        await AsyncStorage.setItem(lockKey, lockValue);
        return lockValue;
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    throw new Error(`Failed to acquire lock: ${lockName}`);
  },
  async releaseLock(lockName: string, lockValue: string) {
    const lockKey = `lock:${lockName}`;
    const existingLock = await AsyncStorage.getItem(lockKey);
    if (existingLock === lockValue) {
      await AsyncStorage.removeItem(lockKey);
    }
  },
  async waitForLock(lockName: string, timeout: number) {
    const lockKey = `lock:${lockName}`;
    const endTime = Date.now() + timeout;
    while (Date.now() < endTime) {
      const existingLock = await AsyncStorage.getItem(lockKey);
      if (!existingLock) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});
