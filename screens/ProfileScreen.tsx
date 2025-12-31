import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface LevelProgress {
  current_level: number;
  current_xp: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  xp_progress: number;
  xp_needed: number;
  progress_percentage: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await createProfile();
      } else if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);

        // Load level progress
        if (data && data.xp !== undefined) {
          const { data: progressData, error: progressError } = await supabase
            .rpc('get_level_progress', { user_xp: data.xp });

          if (!progressError && progressData) {
            setLevelProgress(progressData);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!user) return;

    const newProfile: Partial<UserProfile> = {
      id: user.id,
      username: `Skater${Math.floor(Math.random() * 10000)}`,
      level: 1,
      xp: 0,
      spots_added: 0,
      challenges_completed: [],
      streak: 0,
      badges: {},
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
    } else {
      setProfile(data);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>{profile?.username || 'Skater'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.xp || 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.level || 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile?.spots_added || 0}</Text>
          <Text style={styles.statLabel}>Spots</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {profile?.challenges_completed?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Challenges</Text>
        </View>
      </View>

      {/* Level Progress Bar */}
      {levelProgress && (
        <View style={styles.levelProgressContainer}>
          <View style={styles.levelProgressHeader}>
            <Text style={styles.levelProgressTitle}>
              Level {levelProgress.current_level} → {levelProgress.current_level + 1}
            </Text>
            <Text style={styles.levelProgressXP}>
              {levelProgress.xp_progress} / {levelProgress.xp_for_next_level - levelProgress.xp_for_current_level} XP
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(100, levelProgress.progress_percentage)}%` },
              ]}
            />
          </View>
          <Text style={styles.levelProgressSubtext}>
            {levelProgress.xp_needed} XP needed for next level
          </Text>
        </View>
      )}

      {profile?.streak && profile.streak > 0 && (
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>
            🔥 {profile.streak} Day Streak
          </Text>
        </View>
      )}

      {profile?.badges && Object.keys(profile.badges).length > 0 && (
        <View style={styles.badgesContainer}>
          <Text style={styles.sectionTitle}>Badges</Text>
          {Object.entries(profile.badges).map(([badge, unlocked]) =>
            unlocked ? (
              <Text key={badge} style={styles.badgeText}>
                🏅 {badge}
              </Text>
            ) : null
          )}
        </View>
      )}

      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔧 Sentry Debug Tools (Dev Only)</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              throw new Error('Sentry Test Crash - JavaScript Error');
            }}
          >
            <Text style={styles.testButtonText}>Test JS Crash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              Sentry.nativeCrash();
            }}
          >
            <Text style={styles.testButtonText}>Test Native Crash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              Sentry.captureMessage('Test message from ProfileScreen', 'info');
              Alert.alert('Sentry Test', 'Test message sent to Sentry!');
            }}
          >
            <Text style={styles.testButtonText}>Send Test Message</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    backgroundColor: '#d2673d',
    padding: 30,
    alignItems: 'center',
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 8,
    padding: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d2673d',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  levelProgressContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    padding: 15,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelProgressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  levelProgressXP: {
    fontSize: 14,
    color: '#d2673d',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  levelProgressSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  streakContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  streakText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  badgesContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 5,
  },
  debugContainer: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 5,
  },
  testButtonText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
