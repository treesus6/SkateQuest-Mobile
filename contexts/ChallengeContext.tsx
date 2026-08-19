import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Lightweight challenge progress hook used by the tab layout's level-up modal.
 * Level comes from the real profiles row and follows profile updates in realtime.
 */
export function useChallenges() {
  const { user } = useAuthStore();
  const [level, setLevel] = useState(1);

  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setLevel(1);
      return;
    }

    const loadLevel = async () => {
      try {
        const { data, error } = await profilesService.getById(user.id);
        if (!active || error) return;
        const nextLevel = Number(data?.level ?? 1);
        setLevel(Number.isFinite(nextLevel) && nextLevel > 0 ? nextLevel : 1);
      } catch {
        // Keep the last verified level if the profile cannot be refreshed.
      }
    };

    void loadLevel();

    const channel = supabase
      .channel(`challenge-level:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        payload => {
          const nextLevel = Number((payload.new as { level?: number } | null)?.level ?? 1);
          if (Number.isFinite(nextLevel) && nextLevel > 0) setLevel(nextLevel);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void channel.unsubscribe();
    };
  }, [user?.id]);

  return { level };
}
