/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';

describe('useSupabaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading true and data null', async () => {
    // An immediately-resolving mock races with renderHook's internal act()
    // flush, so the transient "loading" state is only observable if the
    // query is still pending when we check.
    let resolveQuery: (value: { data: null; error: null }) => void;
    const queryFn = jest.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          resolveQuery = resolve;
        })
    );

    const { result } = await renderHook(() => useSupabaseQuery(queryFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolveQuery({ data: null, error: null });
    });
  });

  it('should set data and loading false after a successful query', async () => {
    const mockData = [{ id: '1', name: 'Test Item' }];
    const queryFn = jest.fn().mockResolvedValue({ data: mockData, error: null });

    const { result } = await renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should set error when the query returns an error object', async () => {
    const mockError = { message: 'Permission denied' };
    const queryFn = jest.fn().mockResolvedValue({ data: null, error: mockError });

    const { result } = await renderHook(() => useSupabaseQuery(queryFn, [], { retries: 0 }));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Permission denied');
  });

  it('should set a fallback error message when the error has no message', async () => {
    const mockError = {};
    const queryFn = jest.fn().mockResolvedValue({ data: null, error: mockError });

    const { result } = await renderHook(() => useSupabaseQuery(queryFn, [], { retries: 0 }));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBe('An error occurred');
  });

  it('should handle exceptions thrown by the query function', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('Network failure'));

    const { result } = await renderHook(() => useSupabaseQuery(queryFn, [], { retries: 0 }));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network failure');
  });

  it('should handle exceptions without a message', async () => {
    const queryFn = jest.fn().mockRejectedValue({});

    const { result } = await renderHook(() => useSupabaseQuery(queryFn, [], { retries: 0 }));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('should refetch data when refetch is called', async () => {
    let callCount = 0;
    const queryFn = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        data: [{ id: String(callCount), name: `Item ${callCount}` }],
        error: null,
      });
    });

    const { result } = await renderHook(() => useSupabaseQuery(queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Item 1' }]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual([{ id: '2', name: 'Item 2' }]);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('should set loading to true during refetch', async () => {
    let resolveQuery: (value: { data: unknown; error: null }) => void;
    const queryFn = jest.fn().mockImplementation(
      () =>
        new Promise(resolve => {
          resolveQuery = resolve as (value: { data: unknown; error: null }) => void;
        })
    );

    const { result } = await renderHook(() => useSupabaseQuery(queryFn));

    // Resolve initial fetch
    await act(async () => {
      resolveQuery({ data: [{ id: '1' }], error: null });
    });

    expect(result.current.loading).toBe(false);

    // Start refetch - loading should go back to true
    let refetchPromise: Promise<void>;
    await act(async () => {
      refetchPromise = result.current.refetch();
      // Yield one microtask so refetch's synchronous setLoading(true) at the
      // top flushes before we assert, without waiting for the whole refetch
      // (which is still blocked on the unresolved queryFn promise).
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveQuery({ data: [{ id: '2' }], error: null });
      await refetchPromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('should clear previous error on refetch', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'First call failed' } })
      .mockResolvedValueOnce({ data: [{ id: '1' }], error: null });

    const { result } = await renderHook(() => useSupabaseQuery(queryFn, [], { retries: 0 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('First call failed');

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([{ id: '1' }]);
  });

  it('should re-execute when dependencies change', async () => {
    const queryFn1 = jest.fn().mockResolvedValue({ data: 'result-1', error: null });
    const queryFn2 = jest.fn().mockResolvedValue({ data: 'result-2', error: null });

    let dep = 'a';
    const { result, rerender } = await renderHook(() =>
      useSupabaseQuery(dep === 'a' ? queryFn1 : queryFn2, [dep])
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe('result-1');

    dep = 'b';
    await rerender({});

    await waitFor(() => {
      expect(result.current.data).toBe('result-2');
    });
  });

  it('should return the refetch function as a stable reference within the same deps', async () => {
    const queryFn = jest.fn().mockResolvedValue({ data: 'test', error: null });

    const { result, rerender } = await renderHook(() => useSupabaseQuery(queryFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstRefetch = result.current.refetch;
    await rerender({});
    const secondRefetch = result.current.refetch;

    expect(firstRefetch).toBe(secondRefetch);
  });
});
