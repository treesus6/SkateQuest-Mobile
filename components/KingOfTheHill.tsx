import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ActivityIndicator, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Crown } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import Card from './ui/Card';
import Button from './ui/Button';

interface KingOfTheHillProps {
  spotId: string;
  onUpdate?: () => void;
}

interface King {
  user_id: string;
  username: string;
  video_url: string;
  trick_description: string;
  claimed_at: string;
}

export default function KingOfTheHill({ spotId }: KingOfTheHillProps) {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [king, setKing] = useState<King | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => { fetchKing(); }, [spotId]);

  const fetchKing = async () => {
    try {
      const { data } = await supabase
        .from('spot_claims')
        .select(`user_id, video_url, trick_description, claimed_at, profiles!spot_claims_user_id_fkey(username)`)
        .eq('spot_id', spotId)
        .eq('status', 'active')
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setKing({
          user_id: data.user_id,
          username: (data as any).profiles?.username || 'Unknown',
          video_url: data.video_url,
          trick_description: data.trick_description,
          claimed_at: data.claimed_at,
        });
      }
    } catch (error) {
      console.error('Error fetching king:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = () => {
    Alert.alert('Challenge the King!', 'Record a trick video to dethrone the current king!', [
      { text: 'Record Video', onPress: () => (navigation as any).navigate('UploadMedia', { spotId, challengeType: 'king_of_hill' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return <Card className="mx-4"><ActivityIndicator size="small" color="#d2673d" /></Card>;
  }

  return (
    <Card className="mx-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Crown color="#f59e0b" size={20} />
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">King of the Hill</Text>
      </View>

      {king ? (
        <>
          <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3 flex-row justify-between items-center border-2 border-amber-500">
            <View className="flex-1">
              <Text className="text-base font-bold text-amber-500 mb-1">@{king.username}</Text>
              <Text className="text-sm text-gray-800 dark:text-gray-100">{king.trick_description}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{new Date(king.claimed_at).toLocaleDateString()}</Text>
            </View>
            <Crown color="#f59e0b" size={36} />
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button title="Watch" onPress={() => setShowVideo(true)} variant="secondary" size="md" />
            </View>
            {user?.id !== king.user_id && (
              <View className="flex-1">
                <Button title="Challenge" onPress={handleChallenge} variant="primary" size="md" className="bg-red-500" />
              </View>
            )}
          </View>

          <Modal visible={showVideo} animationType="slide" onRequestClose={() => setShowVideo(false)}>
            <View className="flex-1 bg-black justify-center">
              <Video
                source={{ uri: king.video_url }}
                style={{ flex: 1 }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls
              />
              <View className="absolute top-[60px] right-5">
                <Button title="Close" onPress={() => setShowVideo(false)} variant="primary" size="md" />
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-3 items-center">
            <Text className="text-sm text-gray-500 italic">No king yet! Claim this spot!</Text>
          </View>
          <Button title="Claim Throne" onPress={handleChallenge} variant="primary" size="lg" className="bg-amber-500" />
        </>
      )}
    </Card>
  );
}
