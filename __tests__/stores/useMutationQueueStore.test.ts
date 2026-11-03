/// <reference path="../../types/testEnvShims.d.ts" />
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutationQueueStore } from '../../stores/useMutationQueueStore';
import { useNetworkStore } from '../../stores/useNetworkStore';

describe('offline mutation queue data integrity', () => {
  beforeEach(async () => {
    await useMutationQueueStore.getState().clear();
    useNetworkStore.setState({ isConnected: true });
    jest.clearAllMocks();
  });

  it('removes a mutation only after its executor succeeds', async () => {
    await useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
      session_id: 'session-1',
    });
    const executor = jest.fn(async () => undefined);

    await useMutationQueueStore.getState().processQueue(executor);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(useMutationQueueStore.getState().queue).toHaveLength(0);
  });

  it('preserves failed mutations even after more than five attempts', async () => {
    await useMutationQueueStore.getState().enqueue('create', 'unknown_table', { id: 'pending' });
    const executor = jest.fn(async () => {
      throw new Error('Unsupported offline mutation table');
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await useMutationQueueStore.getState().processQueue(executor);
    }

    expect(executor).toHaveBeenCalledTimes(6);
    expect(useMutationQueueStore.getState().queue).toEqual([
      expect.objectContaining({
        table: 'unknown_table',
        retryCount: 6,
        lastError: 'Unsupported offline mutation table',
      }),
    ]);
  });

  it('keeps a newly queued mutation when an earlier batch completes', async () => {
    await useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
      session_id: 'first',
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const executor = jest.fn(async () => {
      await gate;
    });

    const syncing = useMutationQueueStore.getState().processQueue(executor);
    await useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
      session_id: 'second',
    });
    release();
    await syncing;

    expect(executor).toHaveBeenCalledTimes(1);
    expect(useMutationQueueStore.getState().queue).toEqual([
      expect.objectContaining({ payload: { session_id: 'second' } }),
    ]);
  });
  it('waits for startup hydration before persisting a newly queued offline action', async () => {
    let releaseRead!: () => void;
    let readStarted!: () => void;
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
    const readStartedPromise = new Promise<void>((resolve) => { readStarted = resolve; });
    const persisted = [{
      id: 'previous-session',
      type: 'create',
      table: 'session_attendees',
      payload: { session_id: 'previous' },
      createdAt: 1,
      retryCount: 0,
    }];
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async () => {
      readStarted();
      await readGate;
      return JSON.stringify(persisted);
    });

    try {
      const hydration = useMutationQueueStore.getState().rehydrate();
      await readStartedPromise;
      const enqueue = useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
        session_id: 'new',
      });
      // The new action must wait rather than being overwritten by the stale read.
      expect(useMutationQueueStore.getState().queue).toHaveLength(0);
      releaseRead();
      await Promise.all([hydration, enqueue]);

      const queue = useMutationQueueStore.getState().queue;
      expect(queue.map((entry) => entry.payload.session_id)).toEqual(['previous', 'new']);
      const stored = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)?.[1] as string;
      expect(JSON.parse(stored).map((entry: { payload: { session_id: string } }) => entry.payload.session_id))
        .toEqual(['previous', 'new']);
    } finally {
      releaseRead();
      spy.mockRestore();
    }
  });

  it('does not resurrect cleared actions when clear races with startup hydration', async () => {
    let releaseRead!: () => void;
    let readStarted!: () => void;
    const gate = new Promise<void>((resolve) => { releaseRead = resolve; });
    const started = new Promise<void>((resolve) => { readStarted = resolve; });
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async () => {
      readStarted();
      await gate;
      return JSON.stringify([{
        id: 'old', type: 'create', table: 'session_attendees',
        payload: { session_id: 'old' }, createdAt: 1, retryCount: 0,
      }]);
    });

    try {
      const hydration = useMutationQueueStore.getState().rehydrate();
      await started;
      const clearing = useMutationQueueStore.getState().clear();
      releaseRead();
      await Promise.all([hydration, clearing]);
      expect(useMutationQueueStore.getState().queue).toEqual([]);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_mutation_queue');
    } finally {
      releaseRead();
      spy.mockRestore();
    }
  });

  it('persists the newest snapshot even when an older AsyncStorage write is slow', async () => {
    let releaseFirst!: () => void;
    let firstStarted!: () => void;
    const firstWriteStarted = new Promise<void>((resolve) => { firstStarted = resolve; });
    const firstWriteGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const writes: string[] = [];
    let count = 0;
    const spy = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (_key, value) => {
      count += 1;
      if (count === 1) {
        firstStarted();
        await firstWriteGate;
      }
      writes.push(value);
    });

    try {
      const first = useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
        session_id: 'first',
      });
      await firstWriteStarted;
      const second = useMutationQueueStore.getState().enqueue('create', 'session_attendees', {
        session_id: 'second',
      });
      releaseFirst();
      await Promise.all([first, second]);

      expect(writes).toHaveLength(2);
      expect(JSON.parse(writes[1]).map((entry: { payload: { session_id: string } }) => entry.payload.session_id))
        .toEqual(['first', 'second']);
    } finally {
      releaseFirst();
      spy.mockRestore();
    }
  });

});
