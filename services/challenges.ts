import { supabase } from '../lib/supabase';
import { Challenge } from '../types';

export async function getActiveChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Challenge[]) || [];
}

export async function completeChallenge(challengeId: string, userId: string, xpReward: number) {
  // Update challenge status
  const { error: challengeError } = await supabase
    .from('challenges')
    .update({
      status: 'completed',
      completed_by: userId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', challengeId);

  if (challengeError) throw challengeError;

  // Update user XP and challenges_completed
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('xp, challenges_completed')
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  const updatedChallenges = [...(userData.challenges_completed || []), challengeId];

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      xp: (userData.xp || 0) + xpReward,
      challenges_completed: updatedChallenges,
    })
    .eq('id', userId);

  if (updateError) throw updateError;
}
