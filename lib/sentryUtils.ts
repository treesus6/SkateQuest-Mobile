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
  const transaction = Sentry.startTransaction({
    op: 'db.query',
    name: operationName,
  });

  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      transaction.setTag(key, value);
    });
  }

  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('unknown_error');
    Sentry.captureException(error, {
      tags,
      contexts: {
        operation: {
          name: operationName,
        },
      },
    });
    throw error;
  } finally {
    transaction.finish();
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
