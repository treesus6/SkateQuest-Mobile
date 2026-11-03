import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../lib/logger';
import { ServiceError } from '../lib/serviceError';
import { useNetworkStore } from './useNetworkStore';

const QUEUE_STORAGE_KEY = 'offline_mutation_queue';

export type MutationType = 'create' | 'update' | 'delete';

export interface OfflineMutation {
  id: string;
  type: MutationType;
  table: string;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

interface MutationQueueState {
  queue: OfflineMutation[];
  isSyncing: boolean;

  /** Add a mutation to the queue (called when offline) */
  enqueue: (type: MutationType, table: string, payload: Record<string, any>) => Promise<void>;

  /** Remove a mutation after successful sync */
  dequeue: (id: string) => Promise<void>;

  /** Process all queued mutations when back online */
  processQueue: (executor: (mutation: OfflineMutation) => Promise<void>) => Promise<void>;

  /** Load persisted queue from AsyncStorage */
  rehydrate: () => Promise<void>;

  /** Clear the entire queue */
  clear: () => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// AsyncStorage writes can complete out of order. Serialize snapshots so a
// slower old write cannot overwrite an action enqueued during a sync.
let storageOperation: Promise<void> = Promise.resolve();

function persistQueue(queue: OfflineMutation[]): Promise<void> {
  const snapshot = JSON.stringify(queue);
  const write = storageOperation.then(async () => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, snapshot);
    } catch (err) {
      Logger.error('Failed to persist mutation queue', err);
    }
  });
  storageOperation = write;
  return write;
}

function removePersistedQueue(): Promise<void> {
  const removal = storageOperation.then(async () => {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (err) {
      Logger.error('Failed to clear mutation queue storage', err);
    }
  });
  storageOperation = removal;
  return removal;
}

export const useMutationQueueStore = create<MutationQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,

  enqueue: async (type, table, payload) => {
    const mutation: OfflineMutation = {
      id: generateId(),
      type,
      table,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    const updated = [...get().queue, mutation];
    set({ queue: updated });
    await persistQueue(updated);

    Logger.info('Mutation queued for offline sync', { type, table, id: mutation.id });
  },

  dequeue: async (id) => {
    const updated = get().queue.filter((m) => m.id !== id);
    set({ queue: updated });
    await persistQueue(updated);
  },

  processQueue: async (executor) => {
    const { queue, isSyncing } = get();
    if (isSyncing || queue.length === 0) return;

    const { isConnected } = useNetworkStore.getState();
    if (!isConnected) return;

    set({ isSyncing: true });
    Logger.info(`Processing ${queue.length} queued mutation(s)`);

    const attemptedIds = new Set(queue.map((mutation) => mutation.id));
    const failedById = new Map<string, OfflineMutation>();

    for (const mutation of queue) {
      try {
        await executor(mutation);
        Logger.info('Mutation synced', { id: mutation.id, type: mutation.type, table: mutation.table });
      } catch (err: any) {
        const errorMsg = err instanceof ServiceError ? err.message : (err?.message ?? 'Unknown error');
        Logger.error('Mutation sync failed', err, { id: mutation.id });

        // Never discard a user's offline action merely because it has failed
        // five times. It must remain available for a later retry or recovery.
        failedById.set(mutation.id, {
          ...mutation,
          retryCount: mutation.retryCount + 1,
          lastError: errorMsg,
        });
      }
    }

    // Re-read the live queue: new mutations can be enqueued while an earlier
    // batch is syncing. Only remove successfully processed IDs from that batch.
    const pending = get().queue
      .filter((mutation) => !attemptedIds.has(mutation.id) || failedById.has(mutation.id))
      .map((mutation) => failedById.get(mutation.id) ?? mutation);
    set({ queue: pending, isSyncing: false });
    await persistQueue(pending);

    if (failedById.size > 0) {
      Logger.warn(`${failedById.size} mutation(s) still pending after sync attempt`);
    }
  },

  rehydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const queue: OfflineMutation[] = JSON.parse(raw);
        set({ queue });
        Logger.info(`Rehydrated ${queue.length} queued mutation(s)`);
      }
    } catch (err) {
      Logger.error('Failed to rehydrate mutation queue', err);
    }
  },

  clear: async () => {
    set({ queue: [] });
    await removePersistedQueue();
  },
}));
