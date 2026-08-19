import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface WeeklyClip {
  id: string;
  nomination_id: string;
  user_id: string;
  title: string;
  trick_name: string;
  park_name: string;
  video_url: string;
  thumbnail_url: string;
  votes: number;
  profiles: { username: string } | null;
}

function currentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export const clipOfWeekService = {
  async getCurrentWeek(): Promise<{ data: WeeklyClip[] | null; error: any }> {
    try {
      const week = currentWeekStart();
      const { data: nominations, error } = await supabase
        .from('clip_of_week_nominations')
        .select('id,user_id,media_id,skatetv_clip_id,week_start,status,created_at')
        .eq('week_start', week)
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (error) return { data: null, error };

      const rows = nominations ?? [];
      const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
      const mediaIds = rows.map(row => row.media_id).filter(Boolean) as string[];
      const skateTvIds = rows.map(row => row.skatetv_clip_id).filter(Boolean) as string[];

      const [profilesResult, mediaResult, skateTvResult, votesResult] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('id,username').in('id', userIds)
          : Promise.resolve({ data: [], error: null } as any),
        mediaIds.length
          ? supabase.from('media').select('*').in('id', mediaIds)
          : Promise.resolve({ data: [], error: null } as any),
        skateTvIds.length
          ? supabase.from('skatetv_clips').select('*').in('id', skateTvIds)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from('clip_of_week_votes').select('nomination_id').eq('week_start', week),
      ]);

      const loadError = profilesResult.error || mediaResult.error || skateTvResult.error || votesResult.error;
      if (loadError) return { data: null, error: loadError };

      const profiles = new Map((profilesResult.data ?? []).map((row: any) => [row.id, row]));
      const media = new Map((mediaResult.data ?? []).map((row: any) => [row.id, row]));
      const skateTv = new Map((skateTvResult.data ?? []).map((row: any) => [row.id, row]));
      const voteCounts = new Map<string, number>();
      (votesResult.data ?? []).forEach((row: any) => {
        voteCounts.set(row.nomination_id, (voteCounts.get(row.nomination_id) ?? 0) + 1);
      });

      const data = rows
        .map((row: any) => {
          const source = row.skatetv_clip_id ? skateTv.get(row.skatetv_clip_id) : media.get(row.media_id);
          if (!source) return null;
          const videoUrl = source.video_url ?? source.url ?? '';
          if (!videoUrl) return null;
          return {
            id: row.skatetv_clip_id ?? row.media_id,
            nomination_id: row.id,
            user_id: row.user_id,
            title: source.title ?? source.caption ?? 'SkateQuest clip',
            trick_name: source.trick_name ?? '',
            park_name: source.park_name ?? '',
            video_url: videoUrl,
            thumbnail_url: source.thumbnail_url ?? '',
            votes: voteCounts.get(row.id) ?? 0,
            profiles: profiles.get(row.user_id) ? { username: profiles.get(row.user_id)?.username ?? 'Skater' } : null,
          } satisfies WeeklyClip;
        })
        .filter(Boolean) as WeeklyClip[];

      data.sort((a, b) => b.votes - a.votes);
      return { data, error: null };
    } catch (error) {
      Logger.error('clipOfWeekService.getCurrentWeek failed', error);
      return { data: null, error: new ServiceError('Failed to load Clip of the Week', 'CLIP_WEEK_LOAD_FAILED', error) };
    }
  },

  async getMyVote(userId: string) {
    try {
      return await supabase
        .from('clip_of_week_votes')
        .select('nomination_id')
        .eq('user_id', userId)
        .eq('week_start', currentWeekStart())
        .limit(1)
        .maybeSingle();
    } catch (error) {
      Logger.error('clipOfWeekService.getMyVote failed', error);
      throw new ServiceError('Failed to load your weekly vote', 'CLIP_WEEK_MY_VOTE_FAILED', error);
    }
  },

  async nominate(userId: string, clipId: string) {
    try {
      return await supabase.rpc('submit_clip_of_week_nomination', {
        p_user_id: userId,
        p_clip_id: clipId,
        p_week_start: currentWeekStart(),
      });
    } catch (error) {
      Logger.error('clipOfWeekService.nominate failed', error);
      throw new ServiceError('Failed to nominate clip', 'CLIP_WEEK_NOMINATE_FAILED', error);
    }
  },

  async vote(userId: string, nominationId: string) {
    try {
      return await supabase.rpc('set_clip_of_week_vote', {
        p_user_id: userId,
        p_nomination_id: nominationId,
        p_vote: 1,
        p_week_start: currentWeekStart(),
      });
    } catch (error) {
      Logger.error('clipOfWeekService.vote failed', error);
      throw new ServiceError('Failed to save weekly vote', 'CLIP_WEEK_VOTE_FAILED', error);
    }
  },
};
