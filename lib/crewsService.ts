import { supabase } from './supabase';

export interface Crew {
  id: string;
  name: string;
  description: string;
  member_count: number;
  total_xp: number;
  created_by: string;
  created_at: string;
}

export const crewsService = {
  async getAll() {
    return supabase
      .from('crews')
      .select('*')
      .order('total_xp', { ascending: false });
  },

  async create(crew: { name: string; description: string; created_by: string }) {
    return supabase.from('crews').insert([
      {
        name: crew.name,
        description: crew.description,
        created_by: crew.created_by,
        member_count: 1,
        total_xp: 0,
      },
    ]);
  },

  async join(crewId: string, userId: string) {
    return supabase.from('crew_members').insert([
      {
        crew_id: crewId,
        user_id: userId,
      },
    ]);
  },
};
