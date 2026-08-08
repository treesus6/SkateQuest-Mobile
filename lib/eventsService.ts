import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  created_by: string;
  attendee_count: number;
}

export const eventsService = {
  async getUpcoming() {
    try {
      const result = await supabase
        .from('skate_sessions')
        .select(
          'id, title, description, spot_id, scheduled_time, creator_id, session_attendees(user_id)'
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
            location: row.spot_id ?? 'Location TBD',
            date: scheduled.toISOString().split('T')[0],
            time: scheduled.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            created_by: row.creator_id,
            attendee_count: row.session_attendees?.length ?? 0,
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

  async rsvp(eventId: string, userId: string) {
    try {
      return await supabase.from('session_attendees').insert([
        {
          session_id: eventId,
          user_id: userId,
        },
      ]);
    } catch (error) {
      Logger.error('eventsService.rsvp failed', error);
      throw new ServiceError('Failed to RSVP to event', 'EVENTS_RSVP_FAILED', error);
    }
  },
};
