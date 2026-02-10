import { supabase } from '../lib/supabase';
import { Activity } from '../types';

export type ActivityType = Activity['activity_type'];

export async function logActivity(params: {
  userId: string;
  type: ActivityType;
  title: string;
  description?: string;
  xpEarned?: number;
  mediaId?: string;
  spotId?: string;
  challengeId?: string;
}) {
  const { error } = await supabase.from('activities').insert([
    {
      user_id: params.userId,
      activity_type: params.type,
      title: params.title,
      description: params.description,
      xp_earned: params.xpEarned || 0,
      media_id: params.mediaId,
      spot_id: params.spotId,
      challenge_id: params.challengeId,
    },
  ]);

  if (error) {
    console.warn('Failed to log activity:', error);
  }
}

export async function getFeedActivities(limit = 50) {
  const { data, error } = await supabase
    .from('activities')
    .select(`*, user:user_id(username), media:media_id(*)`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as Activity[]) || [];
}
