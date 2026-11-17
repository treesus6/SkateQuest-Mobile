import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

export interface SpotCommentRow {
  id: string;
  spot_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

/**
 * An insert acknowledgement is not proof the comment is visible to other
 * skaters. Callers must verify with `verifySpotComment` and only clear the
 * draft once the row reads back; otherwise the user cannot tell whether
 * the comment posted and may post it twice.
 */
export async function postSpotComment(
  spotId: string,
  userId: string,
  content: string
): Promise<SpotCommentRow> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Comment required');
  try {
    const { data, error } = await supabase
      .from('spot_comments')
      .insert([{ spot_id: spotId, user_id: userId, content: trimmed }])
      .select('id, spot_id, user_id, content, created_at')
      .single();
    if (error) {
      throw new ServiceError('Failed to post the comment', 'SPOT_COMMENT_POST_FAILED', error);
    }
    if (
      !data ||
      data.spot_id !== spotId ||
      data.user_id !== userId ||
      data.content !== trimmed
    ) {
      throw new ServiceError(
        'Your comment could not be verified after posting.',
        'SPOT_COMMENT_NOT_VERIFIED'
      );
    }
    return data as SpotCommentRow;
  } catch (error) {
    Logger.error('postSpotComment failed', error, { spot_id: spotId });
    throw error instanceof ServiceError
      ? error
      : new ServiceError('Failed to post the comment', 'SPOT_COMMENT_POST_FAILED', error);
  }
}

/** Independent read-back: true only when the comment row is visible. */
export async function verifySpotComment(commentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('spot_comments')
      .select('id')
      .eq('id', commentId)
      .maybeSingle();
    if (error) {
      Logger.error('verifySpotComment failed', error, { comment_id: commentId });
      return false;
    }
    return !!data;
  } catch (error) {
    Logger.error('verifySpotComment failed', error, { comment_id: commentId });
    return false;
  }
}

export function getUnverifiedCommentMessage(): string {
  return 'Your comment may have posted, but SkateQuest could not confirm it. Check the spot before posting it again.';
}
