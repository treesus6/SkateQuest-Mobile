import { useState, useEffect, useCallback, useRef } from 'react';
import { PersistentCache } from '../lib/persistentCache';

const cache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE = 10 * 60 * 1000; // 10 minutes beyond TTL
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

interface UseSupabaseQueryOptions {
  cacheKey?: string;
  cacheTTL?: number;
  retries?: number;
  enabled?: boolean;
  /** Persist cache to AsyncStorage for offline access. Requires cacheKey. */
  persist?: boolean;
}

interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  deps: any[] = [],
  options: UseSupabaseQueryOptions = {}
): UseSupabaseQueryResult<T> {
  const {
    cacheKey,
    cacheTTL = DEFAULT_CACHE_TTL,
    retries = MAX_RETRIES,
    enabled = true,
    persist = false,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data as T;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Rehydrate from persistent cache on mount when no in-memory data
  useEffect(() => {
    if (!persist || !cacheKey || data) return;

    let cancelled = false;
    PersistentCache.get<T>(cacheKey, STALE_WHILE_REVALIDATE).then((cached) => {
      if (cancelled || !mountedRef.current || !cached) return;
      setData(cached.data);
      setIsStale(cached.isStale);
      if (!cached.isStale) {
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, cacheKey]);

  const fetchWithRetry = useCallback(
    async (attempt: number = 0): Promise<void> => {
      try {
        const { data: result, error: queryError } = await queryFn();
        if (!mountedRef.current) return;

        if (queryError) {
          if (attempt < retries && !queryError.code?.startsWith('4')) {
            await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
            return fetchWithRetry(attempt + 1);
          }
          setError(queryError.message || 'An error occurred');
        } else {
          setData(result);
          setError(null);
          if (cacheKey && result) {
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
            // Persist to AsyncStorage for offline use
            if (persist) {
              PersistentCache.set(cacheKey, result, cacheTTL);
            }
          }
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
          return fetchWithRetry(attempt + 1);
        }
        setError(err.message || 'An unexpected error occurred');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    await fetchWithRetry(0);
    if (mountedRef.current) {
      setLoading(false);
      setIsStale(false);
    }
  }, [fetchWithRetry, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Mark data as stale after TTL
  useEffect(() => {
    if (!cacheKey || !data) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setIsStale(true);
    }, cacheTTL);
    return () => clearTimeout(timer);
  }, [data, cacheKey, cacheTTL]);

  return { data, loading, error, refetch: fetch, isStale };
}

// Utility to invalidate cache (both in-memory and persistent)
export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
    PersistentCache.remove(key);
  } else {
    cache.clear();
    PersistentCache.clearAll();
  }
}
