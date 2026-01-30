import { supabase } from '../../lib/supabase';

export const claimThrone = async (user_id: string, quest_id: string, video_url: string) => {
  const { data, error } = await supabase
    .from('claims')
    .insert([{ user_id, quest_id, video_url, status: 'pending' }]);
  return { data, error };
};
