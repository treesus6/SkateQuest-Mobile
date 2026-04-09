import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: 'abuse' | 'harassment' | 'inappropriate_content' | 'fraud' | 'spam' | 'other';
  reason: string;
  context?: string;
  context_id?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderator_notes?: string;
  moderator_id?: string;
  reviewed_at?: string;
  created_at: string;
}

interface ModerationItem {
  id: string;
  content_type: 'message' | 'post' | 'profile' | 'comment' | 'review';
  content_id: string;
  user_id: string;
  content_preview?: string;
  reason_flagged: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderator_id?: string;
  moderator_action?: string;
  actioned_at?: string;
  created_at: string;
}

interface SuspiciousLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  check_in_count: number;
  last_seen: string;
  flagged_at?: string;
  is_whitelisted: boolean;
  created_at: string;
}

export const moderationService = {
  // =========================================================================
  // REPORTS
  // =========================================================================

  async reportUser(
    reporterId: string,
    reportedUserId: string,
    reportType: string,
    reason: string,
    context?: string,
    contextId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('report_user', {
        p_reporter_id: reporterId,
        p_reported_user_id: reportedUserId,
        p_report_type: reportType,
        p_reason: reason,
        p_context: context,
        p_context_id: contextId,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to create report');
      return data;
    } catch (error) {
      Logger.error('moderationService.reportUser failed', error);
      throw new ServiceError('Failed to report user', 'REPORT_USER_FAILED', error);
    }
  },

  async getUserReports(userId: string): Promise<UserReport[]> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('moderationService.getUserReports failed', error);
      throw new ServiceError('Failed to get reports', 'USER_REPORTS_FAILED', error);
    }
  },

  async getPendingReports(limit: number = 50): Promise<UserReport[]> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('moderationService.getPendingReports failed', error);
      throw new ServiceError('Failed to get pending reports', 'PENDING_REPORTS_FAILED', error);
    }
  },

  async reviewReport(
    reportId: string,
    moderatorId: string,
    status: string,
    notes: string
  ): Promise<UserReport> {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .update({
          status,
          moderator_id: moderatorId,
          moderator_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to review report');
      return data;
    } catch (error) {
      Logger.error('moderationService.reviewReport failed', error);
      throw new ServiceError('Failed to review report', 'REVIEW_REPORT_FAILED', error);
    }
  },

  // =========================================================================
  // MODERATION QUEUE
  // =========================================================================

  async getModerationQueue(limit: number = 50): Promise<ModerationItem[]> {
    try {
      const { data, error } = await supabase
        .from('content_moderation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('moderationService.getModerationQueue failed', error);
      throw new ServiceError('Failed to get moderation queue', 'MOD_QUEUE_FAILED', error);
    }
  },

  async approveModerationItem(itemId: string, moderatorId: string): Promise<ModerationItem> {
    try {
      const { data, error } = await supabase
        .from('content_moderation_queue')
        .update({
          status: 'approved',
          moderator_id: moderatorId,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to approve item');
      return data;
    } catch (error) {
      Logger.error('moderationService.approveModerationItem failed', error);
      throw new ServiceError('Failed to approve moderation item', 'MOD_APPROVE_FAILED', error);
    }
  },

  async rejectModerationItem(
    itemId: string,
    moderatorId: string,
    reason: string
  ): Promise<ModerationItem> {
    try {
      const { data, error } = await supabase
        .from('content_moderation_queue')
        .update({
          status: 'rejected',
          moderator_id: moderatorId,
          moderator_action: reason,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to reject item');
      return data;
    } catch (error) {
      Logger.error('moderationService.rejectModerationItem failed', error);
      throw new ServiceError('Failed to reject moderation item', 'MOD_REJECT_FAILED', error);
    }
  },

  // =========================================================================
  // SUSPICIOUS LOCATIONS
  // =========================================================================

  async flagSuspiciousLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<{ flagged: boolean; check_in_count: number }> {
    try {
      const { data, error } = await supabase.rpc('flag_suspicious_location', {
        p_user_id: userId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_address: address,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to flag location');
      return data;
    } catch (error) {
      Logger.error('moderationService.flagSuspiciousLocation failed', error);
      throw new ServiceError('Failed to flag suspicious location', 'FLAG_LOCATION_FAILED', error);
    }
  },

  async getSuspiciousLocations(limit: number = 50): Promise<SuspiciousLocation[]> {
    try {
      const { data, error } = await supabase
        .from('suspicious_locations')
        .select('*')
        .order('check_in_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('moderationService.getSuspiciousLocations failed', error);
      throw new ServiceError('Failed to get suspicious locations', 'SUSPICIOUS_LOCATIONS_FAILED', error);
    }
  },

  async whitelistLocation(locationId: string): Promise<SuspiciousLocation> {
    try {
      const { data, error } = await supabase
        .from('suspicious_locations')
        .update({ is_whitelisted: true })
        .eq('id', locationId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to whitelist location');
      return data;
    } catch (error) {
      Logger.error('moderationService.whitelistLocation failed', error);
      throw new ServiceError('Failed to whitelist location', 'WHITELIST_LOCATION_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToReports(
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel('user_reports_all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_reports',
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

  subscribeToPendingQueue(
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel('moderation_queue_pending')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_moderation_queue',
          filter: 'status=eq.pending',
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

// ============================================================================
// RATE LIMIT SERVICE
// ============================================================================

export const rateLimitService = {
  async checkLimit(
    userId: string | null,
    ipAddress: string | null,
    endpoint: string,
    limit: number = 100,
    windowMinutes: number = 60
  ): Promise<{ allowed: boolean; reason?: string; current_count: number; limit: number }> {
    try {
      // If no user ID and no IP, pass through
      if (!userId && !ipAddress) {
        return { allowed: true, current_count: 0, limit };
      }

      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_ip_address: ipAddress,
        p_endpoint: endpoint,
        p_limit: limit,
        p_window_minutes: windowMinutes,
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to check rate limit');

      return data;
    } catch (error) {
      Logger.error('rateLimitService.checkLimit failed', error);
      // Allow request on service error (fail open)
      return { allowed: true, current_count: 0, limit };
    }
  },

  async getBlockedIPs(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('is_blocked', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('rateLimitService.getBlockedIPs failed', error);
      throw new ServiceError('Failed to get blocked IPs', 'BLOCKED_IPS_FAILED', error);
    }
  },

  async unblockIP(ipAddress: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_rate_limits')
        .update({ is_blocked: false, block_reason: null })
        .eq('ip_address', ipAddress);

      if (error) throw error;
    } catch (error) {
      Logger.error('rateLimitService.unblockIP failed', error);
      throw new ServiceError('Failed to unblock IP', 'UNBLOCK_IP_FAILED', error);
    }
  },
};
