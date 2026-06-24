import { supabase } from './supabase';
import { Logger } from './logger';

function todayISO(): string {
  return new Date().toISOString();
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isYesterday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(dateStr).toDateString() === yesterday.toDateString();
}

export const streaksService = {
  /**
   * Record activity for today. Called after check-in, trick landed, etc.
   * Idempotent — safe to call multiple times on the same day.
   */
  async updateOnActivity(userId: string): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const today = todayISO();

      if (!existing) {
        await supabase.from('streaks').insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_active_date: today,
          xp_at_risk: 5,
        });
        return;
      }

      if (isToday(existing.last_active_date)) return;

      let newStreak: number;

      if (isYesterday(existing.last_active_date) || existing.current_streak === 0) {
        newStreak = existing.current_streak + 1;
      } else {
        // Streak broken — record history if there was one
        if (existing.current_streak > 0) {
          await supabase.from('streak_history').insert({
            user_id: userId,
            streak_length: existing.current_streak,
            xp_lost: existing.xp_at_risk,
            ended_at: existing.last_active_date ?? today,
          });
        }
        newStreak = 1;
      }

      const newLongest = Math.max(newStreak, existing.longest_streak);

      await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_active_date: today,
          xp_at_risk: newStreak * 5,
        })
        .eq('id', existing.id);
    } catch (err) {
      Logger.error('streaksService.updateOnActivity failed', err);
    }
  },
};
