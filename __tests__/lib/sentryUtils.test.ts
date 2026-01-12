import * as Sentry from '@sentry/react-native';
import {
  logUserAction,
  logNavigation,
  trackOperation,
  tagSupabaseQuery,
} from '../../lib/sentryUtils';

describe('SentryUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logUserAction', () => {
    it('adds breadcrumb for user action', () => {
      logUserAction('Uploaded trick video', { trickName: 'Kickflip' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'user.action',
        message: 'Uploaded trick video',
        level: 'info',
        data: { trickName: 'Kickflip' },
      });
    });
  });

  describe('logNavigation', () => {
    it('adds breadcrumb for navigation', () => {
      logNavigation('MapScreen', { spotId: '123' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'navigation',
        message: 'Navigated to MapScreen',
        level: 'info',
        data: { spotId: '123' },
      });
    });
  });

  describe('trackOperation', () => {
    it('tracks successful operation', async () => {
      const operation = jest.fn().mockResolvedValue({ success: true });
      const result = await trackOperation('fetch_skateparks', operation, { type: 'query' });

      expect(result).toEqual({ success: true });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'operation',
        message: 'fetch_skateparks',
        level: 'info',
        data: { type: 'query' },
      });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'operation',
        message: 'fetch_skateparks completed',
        level: 'info',
        data: expect.objectContaining({ type: 'query', duration: expect.any(Number) }),
      });
    });

    it('captures errors and rethrows', async () => {
      const error = new Error('Database error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(trackOperation('fetch_data', operation)).rejects.toThrow('Database error');
      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object));
    });
  });

  describe('tagSupabaseQuery', () => {
    it('sets Supabase tags', () => {
      tagSupabaseQuery('skateparks', 'select');

      expect(Sentry.setTag).toHaveBeenCalledWith('supabase.table', 'skateparks');
      expect(Sentry.setTag).toHaveBeenCalledWith('supabase.operation', 'select');
    });
  });
});
