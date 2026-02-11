import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { Flag } from 'lucide-react-native';
import { crewsService } from '../lib/crewsService';
import { profilesService } from '../lib/profilesService';
import { useAuthStore } from '../stores/useAuthStore';
import Card from './ui/Card';
import Button from './ui/Button';

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
  const { user } = useAuthStore();
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
      const { data } = await crewsService.getTerritoryForSpot(spotId);

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
      const { data } = await crewsService.getUserCrew(user.id);

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
      const captureXP = 100;
      const { data: profile } = await profilesService.getById(user?.id || '');

      if (!profile || profile.xp < captureXP) {
        Alert.alert('Not Enough XP', `You need ${captureXP} XP to capture territory!`);
        setCapturing(false);
        return;
      }

      const { data: existing } = await crewsService.getCrewTerritory(spotId, userCrew.id);

      if (existing) {
        await crewsService.updateTerritory(existing.id, { total_points: existing.total_points + captureXP, last_activity: new Date().toISOString() });
      } else {
        await crewsService.createTerritory({ spot_id: spotId, crew_id: userCrew.id, total_points: captureXP });
      }

      await profilesService.update(user?.id || '', { xp: profile.xp - captureXP });

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
    return <Card className="mx-4"><ActivityIndicator size="small" color="#d2673d" /></Card>;
  }

  return (
    <Card className="mx-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Flag color="#d2673d" size={20} />
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Territory Control</Text>
      </View>

      {territory ? (
        <View
          className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 flex-row justify-between items-center"
          style={{ borderLeftWidth: 4, borderLeftColor: territory.crew_color }}
        >
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100">{territory.crew_name}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{territory.total_points} pts</Text>
          </View>
          <View className="w-10 h-10 rounded-full" style={{ backgroundColor: territory.crew_color }} />
        </View>
      ) : (
        <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-3 items-center">
          <Text className="text-sm text-gray-500 italic">No crew owns this spot yet!</Text>
        </View>
      )}

      {userCrew && (
        <Button
          title={capturing ? 'Fighting...' : territory?.crew_id === userCrew.id ? 'Defend Territory (-100 XP)' : 'Capture Territory (-100 XP)'}
          onPress={handleCapture}
          variant="primary"
          size="lg"
          className={territory?.crew_id === userCrew.id ? 'bg-emerald-500' : ''}
          disabled={capturing}
        />
      )}

      {!userCrew && (
        <Text className="text-xs text-gray-500 text-center mt-2 italic">Join a crew to capture territory!</Text>
      )}
    </Card>
  );
}
