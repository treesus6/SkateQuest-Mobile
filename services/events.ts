import { supabase } from '../lib/supabase';

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

export async function getUpcomingEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) throw error;
  return (data as Event[]) || [];
}

export async function rsvpToEvent(eventId: string, userId: string) {
  const { error } = await supabase.from('event_rsvps').insert([
    {
      event_id: eventId,
      user_id: userId,
    },
  ]);

  if (error) throw error;
}
