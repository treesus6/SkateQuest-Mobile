import { supabase } from './supabase';
import { Logger } from './logger';
import { trackAPICall } from './performanceMonitoring';
import * as Sentry from '@sentry/react-native';

/**
 * Enhanced API client wrapper around Supabase with retry logic,
 * logging, and error handling
 */

export interface APIClientConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface APIError extends Error {
  code?: string;
  status?: number;
  isNetworkError?: boolean;
  isAuthError?: boolean;
  isValidationError?: boolean;
  isServerError?: boolean;
}

const DEFAULT_CONFIG: Required<APIClientConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
};

/**
 * Categorize API errors
 */
function categorizeError(error: any): APIError {
  const apiError = error as APIError;

  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    apiError.isNetworkError = true;
  }

  // Auth errors (401, 403)
  if (error.status === 401 || error.status === 403 || error.code === 'PGRST301') {
    apiError.isAuthError = true;
  }

  // Validation errors (400, 422)
  if (error.status === 400 || error.status === 422) {
    apiError.isValidationError = true;
  }

  // Server errors (500+)
  if (error.status && error.status >= 500) {
    apiError.isServerError = true;
  }

  return apiError;
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Required<APIClientConfig>,
  attemptNumber: number = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const categorizedError = categorizeError(error);

    // Don't retry auth errors or validation errors
    if (categorizedError.isAuthError || categorizedError.isValidationError) {
      throw categorizedError;
    }

    // Retry if we haven't exceeded max retries
    if (attemptNumber < config.maxRetries) {
      const delay = config.retryDelay * Math.pow(2, attemptNumber);
      Logger.warn(
        `API call failed, retrying in ${delay}ms (attempt ${attemptNumber + 1}/${config.maxRetries})`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, config, attemptNumber + 1);
    }

    throw categorizedError;
  }
}

/**
 * Execute a Supabase query with enhanced error handling and logging
 */
export async function executeQuery<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  config: APIClientConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const endTracking = trackAPICall(queryName);

  try {
    Logger.info(`Starting API call: ${queryName}`);

    const result = await retryWithBackoff(async () => {
      const { data, error } = await queryFn();

      if (error) {
        Logger.error(`API error in ${queryName}`, error);
        throw error;
      }

      if (data === null) {
        Logger.warn(`API call ${queryName} returned null data`);
      }

      return data;
    }, mergedConfig);

    Logger.info(`API call successful: ${queryName}`);
    endTracking();

    if (result === null) {
      throw new Error(`${queryName} returned no data`);
    }

    return result;
  } catch (error: any) {
    const categorizedError = categorizeError(error);

    Logger.error(`API call failed: ${queryName}`, categorizedError);

    Sentry.captureException(categorizedError, {
      tags: {
        api_call: queryName,
        is_network_error: categorizedError.isNetworkError ? 'true' : 'false',
        is_auth_error: categorizedError.isAuthError ? 'true' : 'false',
        is_validation_error: categorizedError.isValidationError ? 'true' : 'false',
        is_server_error: categorizedError.isServerError ? 'true' : 'false',
      },
      contexts: {
        api: {
          query_name: queryName,
          error_code: categorizedError.code,
          error_status: categorizedError.status,
        },
      },
    });

    endTracking();
    throw categorizedError;
  }
}

/**
 * Convenience methods for common Supabase operations
 */
export const apiClient = {
  /**
   * Select query with retry and error handling
   */
  async select<T>(table: string, query: any, config?: APIClientConfig): Promise<T> {
    return executeQuery(`select_${table}`, () => query, config);
  },

  /**
   * Insert with retry and error handling
   */
  async insert<T>(table: string, data: any, config?: APIClientConfig): Promise<T> {
    return executeQuery(
      `insert_${table}`,
      async () => {
        return (await supabase.from(table).insert(data).select()) as any;
      },
      config
    ) as Promise<T>;
  },

  /**
   * Update with retry and error handling
   */
  async update<T>(
    table: string,
    data: any,
    match: Record<string, any>,
    config?: APIClientConfig
  ): Promise<T> {
    return executeQuery(
      `update_${table}`,
      async () => {
        return (await supabase.from(table).update(data).match(match).select()) as any;
      },
      config
    ) as Promise<T>;
  },

  /**
   * Delete with retry and error handling
   */
  async delete<T>(table: string, match: Record<string, any>, config?: APIClientConfig): Promise<T> {
    return executeQuery(
      `delete_${table}`,
      async () => {
        return (await supabase.from(table).delete().match(match).select()) as any;
      },
      config
    ) as Promise<T>;
  },

  /**
   * RPC call with retry and error handling
   */
  async rpc<T>(functionName: string, params?: any, config?: APIClientConfig): Promise<T> {
    return executeQuery(
      `rpc_${functionName}`,
      async () => {
        return await supabase.rpc(functionName, params);
      },
      config
    );
  },
};

export default apiClient;
