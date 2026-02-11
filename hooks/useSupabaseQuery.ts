import { useState, useEffect, useCallback } from 'react';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for Supabase data fetching with loading/error states.
 * Used by 11+ screens that follow the same useEffect + fetch + setState pattern.
 *
 * @param queryFn - Async function that returns the data
 * @param deps - Dependency array (refetches when deps change)
 * @param enabled - Whether to run the query (default: true)
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err) {
      console.error('Query error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [enabled, ...deps]);

  useEffect(() => {
    if (enabled) {
      refetch();
    } else {
      setLoading(false);
    }
  }, [refetch]);

  return { data, loading, error, refetch };
}
