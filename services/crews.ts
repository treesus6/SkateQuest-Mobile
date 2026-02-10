import { supabase } from '../lib/supabase';

export interface Crew {
  id: string;
  name: string;
  description?: string;
  xp: number;
  total_xp: number;
  member_count?: number;
  created_by?: string;
  created_at: string;
}

export async function getCrews() {
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .order('xp', { ascending: false });

  if (error) throw error;
  return (data as Crew[]) || [];
}

export async function createCrew(name: string, description: string, creatorId: string) {
  const { data, error } = await supabase
    .from('crews')
    .insert([{ name, description, created_by: creatorId }])
    .select()
    .single();

  if (error) throw error;

  // Auto-join creator
  await supabase.from('crew_members').insert([
    {
      crew_id: data.id,
      user_id: creatorId,
      role: 'leader',
    },
  ]);

  return data as Crew;
}

export async function joinCrew(crewId: string, userId: string) {
  const { error } = await supabase.from('crew_members').insert([
    {
      crew_id: crewId,
      user_id: userId,
      role: 'member',
    },
  ]);

  if (error) throw error;
}
