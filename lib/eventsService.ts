import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';
import { sessionsService } from './sessionsService';

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  created_by: string;
  attendee_count: number;
  is_attending: boolean;
}

export const eventsService = {
  async getUpcoming(userId?: string) {
    try {
      const result = await supabase
        .from('skate_sessions')
        .select(
          'id, title, description, spot_id, spot_name, scheduled_time, creator_id, participants'
        )
        .gte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true });

      if (result.error || !result.data) return result;

      return {
        ...result,
        data: result.data.map((row: any) => {
          const scheduled = new Date(row.scheduled_time);
          return {
            id: row.id,
            title: row.title,
            description: row.description,
            location: row.spot_name ?? row.spot_id ?? 'Location TBD',
            date: scheduled.toISOString().split('T')[0],
            time: scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            created_by: row.creator_id,
            attendee_count: (row.participants as string[] | null)?.length ?? 0,
            is_attending: userId
              ? ((row.participants as string[] | null) ?? []).includes(userId)
              : false,
          } satisfies Event;
        }),
      };
    } catch (error) {
      Logger.error('eventsService.getUpcoming failed', error);
      throw new ServiceError(
        'Failed to fetch upcoming events',
        'EVENTS_GET_UPCOMING_FAILED',
        error
      );
    }
  },

  async setRsvp(eventId: string, attending: boolean) {
    try {
      return await sessionsService.setRsvp(eventId, attending);
    } catch (error) {
      Logger.error('eventsService.rsvp failed', error);
      throw new ServiceError('Failed to RSVP to event', 'EVENTS_RSVP_FAILED', error);
    }
  },
};
