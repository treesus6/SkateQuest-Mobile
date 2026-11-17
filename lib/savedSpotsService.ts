import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

/**
 * Saved spots are server state in `public.user_saved_spots`
 * (id, user_id, spot_id, created_at; UNIQUE(user_id, spot_id); RLS policy
 * `users_manage_saved_spots` FOR ALL TO authenticated USING (user_id = auth.uid())).
 * AsyncStorage is only a read fallback for offline use and is reconciled
 * against the server on sign-in and on reconnect.
 */

export interface SavedSpotsReconcileResult {
  /** Effective saved ids: server ids plus any ids that are still local-only. */
  data: string[];
  /** Ids present locally that could not be written to the server yet. */
  pendingLocalIds: string[];
  error: unknown;
}

async function readBackSavedSpot(
  userId: string,
  spotId: string
): Promise<{ saved: boolean; error: unknown }> {
  const { data, error } = await supabase
    .from('user_saved_spots')
    .select('spot_id')
    .eq('user_id', userId)
    .eq('spot_id', spotId)
    .maybeSingle();
  if (error) return { saved: false, error };
  return { saved: !!data, error: null };
}

export const savedSpotsService = {
  async getSavedSpotIds(userId: string): Promise<{ data: string[]; error: unknown }> {
    try {
      const { data, error } = await supabase
        .from('user_saved_spots')
        .select('spot_id')
        .eq('user_id', userId);
      if (error) return { data: [], error };
      return {
        data: (data ?? []).map((row: { spot_id: string }) => row.spot_id),
        error: null,
      };
    } catch (error) {
      Logger.error('savedSpotsService.getSavedSpotIds failed', error);
      throw new ServiceError('Failed to load saved spots', 'SAVED_SPOTS_LOAD_FAILED', error);
    }
  },

  /** Insert the bookmark, then read it back. Throws unless the server confirms it. */
  async saveSpot(userId: string, spotId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_saved_spots')
        .upsert({ user_id: userId, spot_id: spotId }, { onConflict: 'user_id,spot_id' });
      if (error) {
        throw new ServiceError('Failed to save the bookmark', 'SAVED_SPOTS_SAVE_FAILED', error);
      }
      const readBack = await readBackSavedSpot(userId, spotId);
      if (readBack.error || !readBack.saved) {
        throw new ServiceError(
          'Bookmark could not be verified after saving',
          'SAVED_SPOTS_SAVE_NOT_VERIFIED',
          readBack.error
        );
      }
    } catch (error) {
      Logger.error('savedSpotsService.saveSpot failed', error, { spot_id: spotId });
      throw error instanceof ServiceError
        ? error
        : new ServiceError('Failed to save the bookmark', 'SAVED_SPOTS_SAVE_FAILED', error);
    }
  },

  /** Delete the bookmark, then read back to confirm it is gone. */
  async unsaveSpot(userId: string, spotId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_saved_spots')
        .delete()
        .eq('user_id', userId)
        .eq('spot_id', spotId);
      if (error) {
        throw new ServiceError(
          'Failed to remove the bookmark',
          'SAVED_SPOTS_UNSAVE_FAILED',
          error
        );
      }
      const readBack = await readBackSavedSpot(userId, spotId);
      if (readBack.error || readBack.saved) {
        throw new ServiceError(
          'Bookmark removal could not be verified',
          'SAVED_SPOTS_UNSAVE_NOT_VERIFIED',
          readBack.error
        );
      }
    } catch (error) {
      Logger.error('savedSpotsService.unsaveSpot failed', error, { spot_id: spotId });
      throw error instanceof ServiceError
        ? error
        : new ServiceError('Failed to remove the bookmark', 'SAVED_SPOTS_UNSAVE_FAILED', error);
    }
  },

  /**
   * Merge device-only saved ids into the server table. Ids that fail to
   * upload stay in `pendingLocalIds` (and in the returned `data`) so they
   * are not lost; the next reconcile retries them.
   */
  async reconcileSavedSpots(
    userId: string,
    localSpotIds: string[]
  ): Promise<SavedSpotsReconcileResult> {
    const local = [...new Set(localSpotIds.filter(Boolean))];
    const { data: serverIds, error } = await this.getSavedSpotIds(userId);
    if (error) {
      Logger.warn('savedSpotsService reconcile could not read server bookmarks', error);
      return { data: local, pendingLocalIds: local, error };
    }
    const server = new Set(serverIds);
    const pendingLocalIds: string[] = [];
    for (const spotId of local) {
      if (server.has(spotId)) continue;
      try {
        await this.saveSpot(userId, spotId);
        server.add(spotId);
      } catch (uploadError) {
        Logger.warn('savedSpotsService reconcile could not upload a local bookmark', {
          error: uploadError,
          spot_id: spotId,
        });
        pendingLocalIds.push(spotId);
      }
    }
    return { data: [...server, ...pendingLocalIds], pendingLocalIds, error: null };
  },
};
