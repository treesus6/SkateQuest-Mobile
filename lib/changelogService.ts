import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

interface Changelog {
  id: string;
  version: string;
  title: string;
  description?: string;
  release_notes?: string;
  features?: string[];
  bug_fixes?: string[];
  known_issues?: string[];
  release_date: string;
  released_by?: string;
  platform: string[];
  is_critical: boolean;
  created_at: string;
}

export const changelogService = {
  // =========================================================================
  // CHANGELOGS
  // =========================================================================

  async getLatestChangelog(): Promise<Changelog | null> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .order('release_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;  // 116 = no rows
      return data || null;
    } catch (error) {
      Logger.error('changelogService.getLatestChangelog failed', error);
      throw new ServiceError('Failed to get latest changelog', 'GET_LATEST_FAILED', error);
    }
  },

  async getMostRecentChangelogs(limit: number = 10): Promise<Changelog[]> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .order('release_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('changelogService.getMostRecentChangelogs failed', error);
      throw new ServiceError('Failed to get changelogs', 'GET_CHANGELOGS_FAILED', error);
    }
  },

  async getChangelogByVersion(version: string): Promise<Changelog | null> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .eq('version', version)
        .single();

      if (error && error.code !== 'PGRST116') throw error;  // 116 = no rows
      return data || null;
    } catch (error) {
      Logger.error('changelogService.getChangelogByVersion failed', error);
      throw new ServiceError('Failed to get changelog by version', 'GET_VERSION_FAILED', error);
    }
  },

  async getChangelogsSinceVersion(version: string): Promise<Changelog[]> {
    try {
      // Get the release date of the specified version
      const { data: versionData, error: versionError } = await supabase
        .from('changelogs')
        .select('release_date')
        .eq('version', version)
        .single();

      if (versionError) throw versionError;
      if (!versionData) throw new Error('Version not found');

      // Get all changelogs after that date
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .gt('release_date', versionData.release_date)
        .order('release_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('changelogService.getChangelogsSinceVersion failed', error);
      throw new ServiceError('Failed to get changelogs since version', 'GET_SINCE_VERSION_FAILED', error);
    }
  },

  async getCriticalUpdates(): Promise<Changelog[]> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .select('*')
        .eq('is_critical', true)
        .order('release_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.error('changelogService.getCriticalUpdates failed', error);
      throw new ServiceError('Failed to get critical updates', 'GET_CRITICAL_FAILED', error);
    }
  },

  // =========================================================================
  // ADMIN: CREATE/UPDATE CHANGELOGS
  // =========================================================================

  async createChangelog(
    version: string,
    title: string,
    releaseDate: string,
    description?: string,
    releaseNotes?: string,
    features?: string[],
    bugFixes?: string[],
    knownIssues?: string[],
    isCritical: boolean = false,
    platforms: string[] = ['ios', 'android']
  ): Promise<Changelog> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .insert({
          version,
          title,
          release_date: releaseDate,
          description,
          release_notes: releaseNotes,
          features,
          bug_fixes: bugFixes,
          known_issues: knownIssues,
          is_critical: isCritical,
          platform: platforms,
        })
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create changelog');
      return data;
    } catch (error) {
      Logger.error('changelogService.createChangelog failed', error);
      throw new ServiceError('Failed to create changelog', 'CREATE_CHANGELOG_FAILED', error);
    }
  },

  async updateChangelog(
    version: string,
    updates: { title?: string; description?: string; release_notes?: string; is_critical?: boolean }
  ): Promise<Changelog> {
    try {
      const { data, error } = await supabase
        .from('changelogs')
        .update(updates)
        .eq('version', version)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to update changelog');
      return data;
    } catch (error) {
      Logger.error('changelogService.updateChangelog failed', error);
      throw new ServiceError('Failed to update changelog', 'UPDATE_CHANGELOG_FAILED', error);
    }
  },

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // =========================================================================

  subscribeToChangelogs(
    onUpdate: (payload: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel('changelogs_all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'changelogs',
        },
        onUpdate
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },
};
