import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  channel: string;
  table: string;
  event?: PostgresEvent;
  filter?: string;
  schema?: string;
  onPayload: (payload: any) => void;
}

/**
 * Hook for Supabase Realtime subscriptions with automatic cleanup.
 * Used by FeedScreen, LeaderboardScreen, and GameDetailScreen.
 *
 * @param configs - Array of subscription configs (supports multiple per channel)
 * @param enabled - Whether subscriptions are active
 */
export function useRealtimeSubscription(
  configs: SubscriptionConfig[],
  enabled = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || configs.length === 0) return;

    // Use the first config's channel name
    let channel = supabase.channel(configs[0].channel);

    for (const config of configs) {
      channel = channel.on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        },
        config.onPayload
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, ...configs.map(c => c.channel + c.table + c.filter)]);
}
