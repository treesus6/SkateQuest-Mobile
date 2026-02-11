import * as Sentry from '@sentry/react-native';

/**
 * Log user action breadcrumb for debugging
 * @param action - Description of the action
 * @param data - Additional context data
 */
export const logUserAction = (action: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    category: 'user.action',
    message: action,
    level: 'info',
    data,
  });
};

/**
 * Log navigation breadcrumb
 * @param screenName - Name of the screen navigated to
 * @param params - Navigation parameters
 */
export const logNavigation = (screenName: string, params?: any) => {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${screenName}`,
    level: 'info',
    data: params,
  });
};

/**
 * Track database/API operations with performance monitoring
 * @param operationName - Name of the operation
 * @param operation - Async function to execute
 * @param tags - Additional tags for filtering in Sentry
 * @returns Result of the operation
 */
export const trackOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> => {
  const startTime = Date.now();

  Sentry.addBreadcrumb({
    category: 'operation',
    message: operationName,
    level: 'info',
    data: tags,
  });

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    Sentry.addBreadcrumb({
      category: 'operation',
      message: `${operationName} completed`,
      level: 'info',
      data: { ...tags, duration },
    });

    return result;
  } catch (error) {
    Sentry.captureException(error, {
      tags,
      contexts: {
        operation: {
          name: operationName,
        },
      },
    });
    throw error;
  }
};

/**
 * Tag Supabase queries for better error grouping
 * @param table - Database table name
 * @param operation - Type of operation (select, insert, update, delete)
 */
export const tagSupabaseQuery = (table: string, operation: string) => {
  Sentry.setTag('supabase.table', table);
  Sentry.setTag('supabase.operation', operation);
};

// ── Phase 20: Enhanced monitoring for offline & stability ──────

/**
 * Track an offline mutation being queued
 */
export const logOfflineMutation = (
  type: string,
  table: string,
  mutationId: string,
) => {
  Sentry.addBreadcrumb({
    category: 'offline.mutation',
    message: `Queued ${type} on ${table}`,
    level: 'info',
    data: { mutationId, type, table },
  });
};

/**
 * Track sync operations (success or failure)
 */
export const logSyncEvent = (
  event: 'start' | 'complete' | 'fail',
  details?: Record<string, any>,
) => {
  Sentry.addBreadcrumb({
    category: 'sync',
    message: `Background sync ${event}`,
    level: event === 'fail' ? 'error' : 'info',
    data: details,
  });
};

/**
 * Track error recovery attempts (retry banners, auto-retry)
 */
export const logErrorRecovery = (
  action: 'auto_retry' | 'manual_retry' | 'recovered' | 'gave_up',
  context?: Record<string, any>,
) => {
  Sentry.addBreadcrumb({
    category: 'error.recovery',
    message: `Error recovery: ${action}`,
    level: action === 'gave_up' ? 'warning' : 'info',
    data: context,
  });
};

/**
 * Wrap a service call with ServiceError + Logger.error() + Sentry capture
 */
export const captureServiceError = (
  error: unknown,
  code: string,
  context?: Record<string, any>,
) => {
  Sentry.captureException(error, {
    tags: { errorCode: code },
    contexts: { service: context || {} },
  });
};
