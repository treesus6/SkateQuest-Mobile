import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Offline cache for storing skatepark and user data locally
 */

const CACHE_KEYS = {
  SKATEPARKS: 'cache_skateparks',
  USER_PROFILE: 'cache_user_profile',
  RECENT_MEDIA: 'cache_recent_media',
  CHALLENGES: 'cache_challenges',
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Save data to cache with timestamp
 */
export async function cacheData<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

/**
 * Get data from cache if not expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_EXPIRY) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = Object.values(CACHE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

/**
 * Retry wrapper for network requests with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if online before attempting
      const online = await isOnline();
      if (!online && attempt > 0) {
        throw new Error('Device is offline');
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or client errors (4xx)
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
      }

      // Last attempt, don't wait
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Fetch with offline fallback
 * Tries to fetch from network, falls back to cache if offline
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  fetchOperation: () => Promise<T>
): Promise<T> {
  try {
    const online = await isOnline();

    if (online) {
      // Try to fetch from network
      const data = await retryWithBackoff(fetchOperation);
      // Cache the result
      await cacheData(cacheKey, data);
      return data;
    } else {
      // Offline, try cache
      const cached = await getCachedData<T>(cacheKey);
      if (cached) {
        return cached;
      }
      throw new Error('No cached data available while offline');
    }
  } catch (error) {
    // Network failed, try cache
    const cached = await getCachedData<T>(cacheKey);
    if (cached) {
      console.warn('Using cached data due to network error');
      return cached;
    }
    throw error;
  }
}

export { CACHE_KEYS };
