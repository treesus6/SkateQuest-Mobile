import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface CrashReport {
  id: string;
  user_id?: string;
  error_message: string;
  stack_trace?: string;
  app_version?: string;
  os_version?: string;
  device_model?: string;
  environment: 'development' | 'staging' | 'production';
  session_id?: string;
  breadcrumbs?: any;
  sentry_event_id?: string;
  status: 'new' | 'acknowledged' | 'investigating' | 'fixed';
  engineer_notes?: string;
  created_at: string;
}

export const crashReportService = {
  // =========================================================================
  // CRASH REPORTS
  // =========================================================================

  async reportCrash(
    userId: string | undefined,
    errorMessage: string,
    stackTrace?: string,
    appVersion?: string,
    osVersion?: string,
    deviceModel?: string,
    environment: string = 'production',
    sessionId?: string,
    breadcrumbs?: any,
    sentryEventId?: string
  ): Promise<CrashReport> {
    try {
      const { data, error } = await supabase
        .from('crash_reports')
        .insert({
          user_id: userId,
          error_message: errorMessage,
          stack_trace: stackTrace,
          app_version: appVersion,
          os_version: osVersion,
          device_model: deviceModel,
          environment,
          session_id: sessionId,
          breadcrumbs,
          sentry_event_id: sentryEventId,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to report crash');
      return data;
    } catch (error) {
      Logger.error('crashReportService.reportCrash failed', error);
      throw new ServiceError('Failed to report crash', 'REPORT_CRASH_FAILED', error);
    }
  },

  async getUserCrashReports(userId: string): Promise<CrashReport[]> {
    try {
      const { data, error } = await supabase
        .from('crash_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('crashReportService.getUserCrashReports failed', error);
      throw new ServiceError('Failed to get crash reports', 'GET_REPORTS_FAILED', error);
    }
  },

  async getPendingCrashReports(limit: number = 50): Promise<CrashReport[]> {
    try {
      const { data, error } = await supabase
        .from('crash_reports')
        .select('*')
        .in('status', ['new', 'investigating'])
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('crashReportService.getPendingCrashReports failed', error);
      throw new ServiceError('Failed to get pending crash reports', 'GET_PENDING_FAILED', error);
    }
  },

  async updateCrashReportStatus(
    reportId: string,
    status: 'new' | 'acknowledged' | 'investigating' | 'fixed',
    engineerNotes?: string
  ): Promise<CrashReport> {
    try {
      const { data, error } = await supabase
        .from('crash_reports')
        .update({
          status,
          engineer_notes: engineerNotes,
        })
        .eq('id', reportId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update crash report');
      return data;
    } catch (error) {
      Logger.error('crashReportService.updateCrashReportStatus failed', error);
      throw new ServiceError('Failed to update crash report status', 'UPDATE_STATUS_FAILED', error);
    }
  },

  // =========================================================================
  // ANALYTICS
  // =========================================================================

  async getCrashStats(days: number = 7): Promise<{ total_crashes: number; unique_users: number; critical_errors: string[] }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error, count } = await supabase
        .from('crash_reports')
        .select('error_message, user_id', { count: 'exact' })
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const uniqueUsers = new Set(data?.map((r) => r.user_id) || []).size;
      const criticalErrors = [
        ...new Set(
          data
            ?.filter((r) => r.error_message.includes('white screen') || r.error_message.includes('null')
            )
            .map((r) => r.error_message) || []
        ),
      ];

      return {
        total_crashes: count || 0,
        unique_users: uniqueUsers,
        critical_errors: criticalErrors.slice(0, 5),  // Top 5
      };
    } catch (error) {
      Logger.error('crashReportService.getCrashStats failed', error);
      throw new ServiceError('Failed to get crash stats', 'CRASH_STATS_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToUserCrashes(
    userId: string,
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel(`user_crashes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crash_reports',
          filter: `user_id=eq.${userId}`,
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  subscribeToPendingCrashes(
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel('pending_crashes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crash_reports',
          filter: 'status=in.(new,investigating)',
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },
};
