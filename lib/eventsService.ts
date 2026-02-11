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
      return await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });
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
      return await supabase.from('event_rsvps').insert([
        {
          event_id: eventId,
          user_id: userId,
        },
      ]);
    } catch (error) {
      Logger.error('eventsService.rsvp failed', error);
      throw new ServiceError(
        'Failed to RSVP to event',
        'EVENTS_RSVP_FAILED',
        error
      );
    }
  },
};
