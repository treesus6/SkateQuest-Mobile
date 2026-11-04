import { supabase } from './supabase';
import { requireConfirmedSessionRsvp } from './sessionsService';
import type { OfflineMutation } from '../stores/useMutationQueueStore';

/**
 * Only acknowledge a queued mutation after the backend confirms persistence.
 * Unsupported/invalid entries must reject so the queue keeps them for recovery.
 */
export async function executeOfflineMutation(mutation: OfflineMutation): Promise<void> {
  if (mutation.table !== 'session_attendees') {
    throw new Error(`Unsupported offline mutation table: ${mutation.table}`);
  }
  if (mutation.type !== 'create' && mutation.type !== 'delete') {
    throw new Error(`Unsupported session RSVP mutation: ${mutation.type}`);
  }
  const { session_id } = mutation.payload;
  if (typeof session_id !== 'string' || !session_id) {
    throw new Error('Queued session RSVP is missing a session_id');
  }

  const { data, error } = await supabase.rpc('set_session_rsvp', {
    p_session_id: session_id,
    p_attending: mutation.type === 'create',
  });
  if (error) throw error;
  requireConfirmedSessionRsvp(data, mutation.type === 'create');
}
