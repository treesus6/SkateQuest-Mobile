import * as Sentry from '@sentry/react-native';

/**
 * Performance monitoring utilities
 * Using Sentry Performance Monitoring
 */

export interface PerformanceMetrics {
  appStartTime: number;
  screenLoadTimes: Map<string, number>;
  apiCallDurations: Map<string, number>;
}

const metrics: PerformanceMetrics = {
  appStartTime: Date.now(),
  screenLoadTimes: new Map(),
  apiCallDurations: new Map(),
};

/**
 * Track app startup time
 */
export function trackAppStartup(): void {
  const startupTime = Date.now() - metrics.appStartTime;

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `App started in ${startupTime}ms`,
    level: 'info',
    data: { startup_time: startupTime },
  });

  // Send as metric
  Sentry.setMeasurement('app_startup_time', startupTime, 'millisecond');
}

/**
 * Track screen load time
 */
export function trackScreenLoad(screenName: string, startTime: number): void {
  const loadTime = Date.now() - startTime;
  metrics.screenLoadTimes.set(screenName, loadTime);

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${screenName} loaded in ${loadTime}ms`,
    level: 'info',
    data: { screen_name: screenName, load_time: loadTime },
  });

  Sentry.setMeasurement(`screen_load_${screenName}`, loadTime, 'millisecond');

  // Alert if screen load is slow (> 3 seconds)
  if (loadTime > 3000) {
    Sentry.captureMessage(`Slow screen load: ${screenName} took ${loadTime}ms`, 'warning');
  }
}

/**
 * Track API call performance
 */
export async function trackApiCall<T>(
  operationName: string,
  operation: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: 'api.call',
    name: operationName,
    tags,
  });

  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    transaction.setStatus('ok');
    transaction.setMeasurement('api_duration', duration, 'millisecond');

    metrics.apiCallDurations.set(operationName, duration);

    // Alert if API call is slow (> 5 seconds)
    if (duration > 5000) {
      Sentry.captureMessage(
        `Slow API call: ${operationName} took ${duration}ms`,
        'warning'
      );
    }

    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Track database query performance
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  table: string,
  operation: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: 'db.query',
    name: queryName,
    tags: {
      table,
    },
  });

  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    transaction.setStatus('ok');
    transaction.setMeasurement('query_duration', duration, 'millisecond');

    // Alert if query is slow (> 2 seconds)
    if (duration > 2000) {
      Sentry.captureMessage(
        `Slow database query: ${queryName} on ${table} took ${duration}ms`,
        'warning'
      );
    }

    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Track image loading performance
 */
export function trackImageLoad(imageUrl: string, loadTime: number): void {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `Image loaded in ${loadTime}ms`,
    level: 'info',
    data: { image_url: imageUrl, load_time: loadTime },
  });

  if (loadTime > 3000) {
    Sentry.captureMessage(`Slow image load: ${imageUrl} took ${loadTime}ms`, 'info');
  }
}

/**
 * Track video processing performance
 */
export async function trackVideoProcessing<T>(
  operation: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: 'video.processing',
    name: 'Video Processing',
  });

  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

/**
 * Track memory usage (React Native doesn't provide direct memory APIs)
 * This is a placeholder for future implementation
 */
export function trackMemoryUsage(): void {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: 'Memory usage check',
    level: 'info',
  });
}

/**
 * Get performance report
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return {
    ...metrics,
    screenLoadTimes: new Map(metrics.screenLoadTimes),
    apiCallDurations: new Map(metrics.apiCallDurations),
  };
}

/**
 * Set performance threshold alerts
 */
export function setPerformanceThresholds(thresholds: {
  screenLoad?: number;
  apiCall?: number;
  dbQuery?: number;
}): void {
  // These would be used to configure alerts
  // For now, we're using hardcoded values in the tracking functions
  console.log('Performance thresholds set:', thresholds);
}

export default {
  trackAppStartup,
  trackScreenLoad,
  trackApiCall,
  trackDatabaseQuery,
  trackImageLoad,
  trackVideoProcessing,
  trackMemoryUsage,
  getPerformanceMetrics,
  setPerformanceThresholds,
};
