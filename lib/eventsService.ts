import { supabase } from './supabase';

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
    return supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time', { ascending: true });
  },

  async rsvp(eventId: string, userId: string) {
    return supabase.from('event_rsvps').insert([
      {
        event_id: eventId,
        user_id: userId,
      },
    ]);
  },
};
