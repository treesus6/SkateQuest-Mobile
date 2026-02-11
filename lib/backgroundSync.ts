import * as Sentry from '@sentry/react-native';
import { Logger } from './logger';
import { ServiceError } from './serviceError';
import { PersistentCache } from './persistentCache';
import { useNetworkStore } from '../stores/useNetworkStore';
import { useMutationQueueStore, OfflineMutation } from '../stores/useMutationQueueStore';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
let syncTimer: ReturnType<typeof setInterval> | null = null;

export interface SyncDataSource {
  key: string;
  fetcher: () => Promise<{ data: any; error: any }>;
}

/**
 * Execute a queued offline mutation against the backend.
 * Override this by passing a custom executor to processQueue.
 */
async function defaultMutationExecutor(_mutation: OfflineMutation): Promise<void> {
  // No-op default — consumers should provide their own executor
  // that routes mutations to the appropriate service method.
  throw new ServiceError(
    'No mutation executor configured',
    'SYNC_NO_EXECUTOR',
  );
}

/**
 * Refresh key data sources and update persistent cache.
 */
async function refreshDataSources(sources: SyncDataSource[]): Promise<void> {
  const { isConnected } = useNetworkStore.getState();
  if (!isConnected) return;

  for (const source of sources) {
    try {
      const { data, error } = await source.fetcher();
      if (error) {
        Logger.warn(`Background sync: failed to refresh ${source.key}`, { error });
        continue;
      }
      if (data) {
        await PersistentCache.set(source.key, data);
        Logger.debug(`Background sync: refreshed ${source.key}`);
      }
    } catch (err) {
      Logger.error(`Background sync: error refreshing ${source.key}`, err);
    }
  }
}

/**
 * Run a full sync cycle: process queued mutations, then refresh data.
 */
export async function runSync(
  dataSources: SyncDataSource[] = [],
  mutationExecutor: (m: OfflineMutation) => Promise<void> = defaultMutationExecutor,
): Promise<void> {
  const { isConnected } = useNetworkStore.getState();
  if (!isConnected) {
    Logger.debug('Background sync skipped: offline');
    return;
  }

  const startTime = Date.now();

  Sentry.addBreadcrumb({
    category: 'sync',
    message: 'Background sync started',
    level: 'info',
  });

  try {
    // 1. Process offline mutation queue
    const { processQueue } = useMutationQueueStore.getState();
    await processQueue(mutationExecutor);

    // 2. Refresh key data sources
    await refreshDataSources(dataSources);

    const duration = Date.now() - startTime;
    Logger.info(`Background sync completed in ${duration}ms`);
  } catch (err) {
    Logger.error('Background sync failed', err);
    Sentry.captureException(err);
  }
}

/**
 * Start the periodic background sync timer.
 */
export function startBackgroundSync(
  dataSources: SyncDataSource[] = [],
  mutationExecutor?: (m: OfflineMutation) => Promise<void>,
  interval: number = SYNC_INTERVAL,
): void {
  stopBackgroundSync();

  // Run immediately on start
  runSync(dataSources, mutationExecutor);

  syncTimer = setInterval(() => {
    runSync(dataSources, mutationExecutor);
  }, interval);

  Logger.info(`Background sync started (interval: ${interval / 1000}s)`);
}

/**
 * Stop the periodic background sync timer.
 */
export function stopBackgroundSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    Logger.info('Background sync stopped');
  }
}

/**
 * Run sync when network reconnects.
 * Call this from the network store listener.
 */
export function onNetworkReconnect(
  dataSources: SyncDataSource[] = [],
  mutationExecutor?: (m: OfflineMutation) => Promise<void>,
): void {
  Logger.info('Network reconnected — triggering sync');
  runSync(dataSources, mutationExecutor);
}
