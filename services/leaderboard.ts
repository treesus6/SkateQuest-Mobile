import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export async function getLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as UserProfile[]) || [];
}
