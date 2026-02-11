import { supabase } from '../lib/supabase';
import { Shop } from '../types';

export async function getShops() {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('verified', { ascending: false })
    .order('name');

  if (error) throw error;
  return (data as Shop[]) || [];
}
