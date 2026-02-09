import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') return null; // Not found
  if (error) throw error;
  return data as UserProfile;
}

export async function createProfile(userId: string, email?: string): Promise<UserProfile> {
  const newProfile: Partial<UserProfile> = {
    id: userId,
    username: `Skater${Math.floor(Math.random() * 10000)}`,
    level: 1,
    xp: 0,
    spots_added: 0,
    challenges_completed: [],
    streak: 0,
    badges: {},
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert([newProfile])
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function getLevelProgress(userXp: number) {
  const { data, error } = await supabase.rpc('get_level_progress', { user_xp: userXp });
  if (error) throw error;
  return data;
}

export async function awardXP(userId: string, amount: number) {
  // Try atomic RPC first
  const { error: rpcError } = await supabase.rpc('increment_xp', {
    user_id: userId,
    amount,
  });

  if (!rpcError) return;

  // Fallback to manual update
  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ xp: (data.xp || 0) + amount })
    .eq('id', userId);

  if (updateError) throw updateError;
}

export async function incrementSpotsAdded(userId: string) {
  const { data, error: fetchError } = await supabase
    .from('profiles')
    .select('spots_added, xp')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('profiles')
    .update({
      spots_added: (data.spots_added || 0) + 1,
      xp: (data.xp || 0) + 100,
    })
    .eq('id', userId);

  if (error) throw error;
}
