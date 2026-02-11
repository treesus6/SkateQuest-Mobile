import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from './logger';

const CACHE_PREFIX = 'pq_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Persistent query cache backed by AsyncStorage.
 * Provides TTL-based expiration and stale-while-revalidate support.
 */
export const PersistentCache = {
  /** Save data to persistent storage with a TTL */
  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (err) {
      Logger.error('PersistentCache.set failed', err, { key });
    }
  },

  /** Retrieve cached data. Returns null if not found or expired beyond stale window. */
  async get<T>(key: string, staleWindow: number = 0): Promise<{ data: T; isStale: boolean } | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);
      const age = Date.now() - entry.timestamp;

      // Still fresh
      if (age <= entry.ttl) {
        return { data: entry.data, isStale: false };
      }

      // Stale but within revalidate window
      if (staleWindow > 0 && age <= entry.ttl + staleWindow) {
        return { data: entry.data, isStale: true };
      }

      // Expired beyond stale window — clean up
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    } catch (err) {
      Logger.error('PersistentCache.get failed', err, { key });
      return null;
    }
  },

  /** Remove a specific cache entry */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (err) {
      Logger.error('PersistentCache.remove failed', err, { key });
    }
  },

  /** Clear all persistent cache entries */
  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      Logger.info(`PersistentCache cleared ${cacheKeys.length} entries`);
    } catch (err) {
      Logger.error('PersistentCache.clearAll failed', err);
    }
  },
};
