import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TerritoryControlProps {
  spotId: string;
  onUpdate?: () => void;
}

interface Territory {
  crew_id: string;
  crew_name: string;
  crew_color: string;
  total_points: number;
}

export default function TerritoryControl({ spotId, onUpdate }: TerritoryControlProps) {
  const { user } = useAuth();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [userCrew, setUserCrew] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    fetchTerritory();
    fetchUserCrew();
  }, [spotId, user?.id]);

  const fetchTerritory = async () => {
    try {
      const { data } = await supabase
        .from('crew_territories')
        .select(
          `
          crew_id,
          total_points,
          crews!crew_territories_crew_id_fkey(name, color_hex)
        `
        )
        .eq('spot_id', spotId)
        .order('total_points', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setTerritory({
          crew_id: data.crew_id,
          crew_name: (data as any).crews?.name || 'Unknown',
          crew_color: (data as any).crews?.color_hex || '#d2673d',
          total_points: data.total_points,
        });
      }
    } catch (error) {
      console.error('Error fetching territory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCrew = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('crew_members')
        .select(
          `
          crew_id,
          crews!crew_members_crew_id_fkey(name, color_hex)
        `
        )
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserCrew({
          id: data.crew_id,
          name: (data as any).crews?.name,
          color: (data as any).crews?.color_hex,
        });
      }
    } catch (error) {
      console.error('Error fetching user crew:', error);
    }
  };

  const handleCapture = async () => {
    if (!userCrew) {
      Alert.alert('No Crew', 'You must join a crew to capture territory!');
      return;
    }

    setCapturing(true);
    try {
      // Check if user has enough XP to challenge
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user?.id)
        .single();

      const captureXP = 100;
      if (!profile || profile.xp < captureXP) {
        Alert.alert('Not Enough XP', `You need ${captureXP} XP to capture territory!`);
        setCapturing(false);
        return;
      }

      // Add territory points for user's crew
      const { data: existing } = await supabase
        .from('crew_territories')
        .select('*')
        .eq('spot_id', spotId)
        .eq('crew_id', userCrew.id)
        .single();

      if (existing) {
        await supabase
          .from('crew_territories')
          .update({
            total_points: existing.total_points + captureXP,
            last_activity: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('crew_territories').insert({
          spot_id: spotId,
          crew_id: userCrew.id,
          total_points: captureXP,
        });
      }

      // Deduct XP from user
      await supabase
        .from('profiles')
        .update({ xp: profile.xp - captureXP })
        .eq('id', user?.id);

      // Create activity
      await supabase.from('activities').insert({
        user_id: user?.id,
        activity_type: 'territory_captured',
        title: 'Territory Battle!',
        description: `Added ${captureXP} points to ${userCrew.name}'s territory`,
        xp_earned: 0,
      });

      Alert.alert('Success!', `Added ${captureXP} points to your crew's territory!`);
      fetchTerritory();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error capturing territory:', error);
      Alert.alert('Error', error.message || 'Failed to capture territory');
    } finally {
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#d2673d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏴 Territory Control</Text>

      {territory ? (
        <View style={[styles.territoryCard, { borderLeftColor: territory.crew_color }]}>
          <View style={styles.crewInfo}>
            <Text style={styles.crewName}>{territory.crew_name}</Text>
            <Text style={styles.points}>{territory.total_points} pts</Text>
          </View>
          <View style={[styles.colorBadge, { backgroundColor: territory.crew_color }]} />
        </View>
      ) : (
        <View style={styles.unclaimedCard}>
          <Text style={styles.unclaimedText}>No crew owns this spot yet!</Text>
        </View>
      )}

      {userCrew && (
        <TouchableOpacity
          style={[
            styles.captureButton,
            capturing && styles.captureButtonDisabled,
            territory?.crew_id === userCrew.id && styles.captureButtonOwned,
          ]}
          onPress={handleCapture}
          disabled={capturing}
        >
          <Text style={styles.captureButtonText}>
            {capturing
              ? 'Fighting...'
              : territory?.crew_id === userCrew.id
                ? 'Defend Territory (-100 XP)'
                : 'Capture Territory (-100 XP)'}
          </Text>
        </TouchableOpacity>
      )}

      {!userCrew && <Text style={styles.hint}>Join a crew to capture territory!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  territoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  points: {
    fontSize: 14,
    color: '#aaa',
  },
  colorBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  unclaimedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  unclaimedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  captureButton: {
    backgroundColor: '#d2673d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonOwned: {
    backgroundColor: '#10b981',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
