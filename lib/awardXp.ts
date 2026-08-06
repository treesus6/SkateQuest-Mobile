import { supabase } from './supabase';
import { Logger } from './logger';

/**
 * Shared XP grant helper.
 *
 * Why this exists:
 * Screens used to call `supabase.rpc('increment_xp')` directly. When XP failed
 * *after* a check-in / quest / pass write already succeeded, some flows threw
 * and showed "failed" even though the main action was saved. That confused
 * skaters into retrying and creating duplicates.
 *
 * Rule: primary user action succeeds on its own write. XP is a side effect.
 * This helper never throws — callers check `awarded` for celebrations / copy.
 */
export interface AwardXpParams {
  userId: string;
  amount: number;
  /** Short label for logs, e.g. "check_in", "daily_quest", "seasonal_pass" */
  context: string;
}

export interface AwardXpResult {
  awarded: boolean;
  error: unknown | null;
}

function isValidAward(userId: string, amount: number): boolean {
  return typeof userId === 'string' && userId.length > 0 && Number.isFinite(amount) && amount > 0;
}

export async function awardXp({ userId, amount, context }: AwardXpParams): Promise<AwardXpResult> {
  if (!isValidAward(userId, amount)) {
    const error = new Error('Invalid XP award input');
    Logger.warn('awardXp skipped invalid input', { context, amount, hasUserId: Boolean(userId) });
    return { awarded: false, error };
  }

  const xpAmount = Math.floor(amount);

  try {
    const { error } = await supabase.rpc('increment_xp', {
      user_id: userId,
      amount: xpAmount,
    });

    if (error) {
      Logger.warn(`awardXp failed (${context})`, { error, amount: xpAmount });
      return { awarded: false, error };
    }

    Logger.info(`awardXp success (${context})`, { amount: xpAmount });
    return { awarded: true, error: null };
  } catch (error) {
    Logger.warn(`awardXp threw (${context})`, { error, amount: xpAmount });
    return { awarded: false, error };
  }
}
