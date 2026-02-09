import { supabase } from '../lib/supabase';
import { UserTrick } from '../types';

export async function getUserTricks(userId: string) {
  const { data, error } = await supabase
    .from('user_tricks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data as UserTrick[]) || [];
}

export async function addTrick(userId: string, trickName: string) {
  const { data, error } = await supabase
    .from('user_tricks')
    .insert([{
      user_id: userId,
      trick_name: trickName,
      status: 'trying',
      attempts: 0,
    }])
    .select()
    .single();

  if (error) throw error;
  return data as UserTrick;
}

export async function updateTrickStatus(
  trickId: string,
  status: 'trying' | 'landed' | 'consistent'
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'landed') {
    updates.first_landed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('user_tricks')
    .update(updates)
    .eq('id', trickId);

  if (error) throw error;
}

export async function incrementAttempts(trickId: string, currentAttempts: number) {
  const { error } = await supabase
    .from('user_tricks')
    .update({
      attempts: currentAttempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trickId);

  if (error) throw error;
}

export async function deleteTrick(trickId: string) {
  const { error } = await supabase
    .from('user_tricks')
    .delete()
    .eq('id', trickId);

  if (error) throw error;
}
