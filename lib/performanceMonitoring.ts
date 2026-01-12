import * as Sentry from '@sentry/react-native';
import { Logger } from './logger';

/**
 * Enhanced performance monitoring utilities
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

const activeMetrics = new Map<string, PerformanceMetric>();

/**
 * Start tracking a performance metric
 */
export function startPerformanceMetric(name: string, metadata?: Record<string, any>): void {
  const metric: PerformanceMetric = {
    name,
    startTime: Date.now(),
    metadata,
  };

  activeMetrics.set(name, metric);
  Logger.info(`Performance tracking started: ${name}`);
}

/**
 * End tracking a performance metric and report it
 */
export function endPerformanceMetric(name: string, metadata?: Record<string, any>): number | null {
  const metric = activeMetrics.get(name);

  if (!metric) {
    Logger.warn(`Performance metric '${name}' was not started`);
    return null;
  }

  const endTime = Date.now();
  const duration = endTime - metric.startTime;

  metric.endTime = endTime;
  metric.duration = duration;
  metric.metadata = { ...metric.metadata, ...metadata };

  // Log to Sentry
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name}: ${duration}ms`,
    level: 'info',
    data: metric.metadata,
  });

  // Check thresholds and alert if exceeded
  const thresholds = {
    screen_load: 3000, // 3 seconds
    api_call: 5000, // 5 seconds
    db_query: 2000, // 2 seconds
    image_load: 3000, // 3 seconds
  };

  const metricType = Object.keys(thresholds).find(key => name.includes(key));
  if (metricType && duration > thresholds[metricType as keyof typeof thresholds]) {
    Logger.warn(
      `Performance threshold exceeded for ${name}: ${duration}ms (threshold: ${thresholds[metricType as keyof typeof thresholds]}ms)`
    );

    Sentry.captureMessage(`Slow ${metricType}: ${name}`, {
      level: 'warning',
      tags: {
        performance_issue: metricType,
        duration: duration.toString(),
      },
      contexts: {
        performance: metric.metadata || {},
      },
    });
  }

  Logger.performance(name, duration);
  activeMetrics.delete(name);

  return duration;
}

/**
 * Track a screen load time
 */
export function trackScreenLoad(screenName: string): () => void {
  startPerformanceMetric(`screen_load_${screenName}`, { screen: screenName });

  return () => {
    endPerformanceMetric(`screen_load_${screenName}`, { screen: screenName });
  };
}

/**
 * Track an API call
 */
export function trackAPICall(endpoint: string): () => void {
  startPerformanceMetric(`api_call_${endpoint}`, { endpoint });

  return () => {
    endPerformanceMetric(`api_call_${endpoint}`, { endpoint });
  };
}

/**
 * Track a database query
 */
export function trackDBQuery(operation: string, table: string): () => void {
  const name = `db_query_${table}_${operation}`;
  startPerformanceMetric(name, { operation, table });

  return () => {
    endPerformanceMetric(name, { operation, table });
  };
}

/**
 * Track image/video loading
 */
export function trackMediaLoad(mediaType: 'image' | 'video', mediaId: string): () => void {
  const name = `${mediaType}_load_${mediaId}`;
  startPerformanceMetric(name, { mediaType, mediaId });

  return () => {
    endPerformanceMetric(name, { mediaType, mediaId });
  };
}

/**
 * Report custom performance metric
 */
export function reportPerformanceMetric(
  name: string,
  value: number,
  unit: string = 'ms',
  metadata?: Record<string, any>
): void {
  Logger.performance(name, value, unit);

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name}: ${value}${unit}`,
    level: 'info',
    data: metadata,
  });
}

/**
 * Track memory usage (if available)
 */
export function trackMemoryUsage(): void {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
    const totalMB = Math.round(memory.jsHeapSizeLimit / 1048576);

    reportPerformanceMetric('memory_usage', usedMB, 'MB', {
      total: totalMB,
      percentage: ((usedMB / totalMB) * 100).toFixed(2),
    });

    // Alert if memory usage is high (>80%)
    if (usedMB / totalMB > 0.8) {
      Logger.warn(`High memory usage: ${usedMB}MB / ${totalMB}MB`);
    }
  }
}

/**
 * Get all active performance metrics
 */
export function getActiveMetrics(): PerformanceMetric[] {
  return Array.from(activeMetrics.values());
}
