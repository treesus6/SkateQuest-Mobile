import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ghost, Film, Lock, Play } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import Card from './ui/Card';
import Button from './ui/Button';

interface GhostClipViewerProps {
  spotId: string;
}

export default function GhostClipViewer({ spotId }: GhostClipViewerProps) {
  const { user } = useAuthStore();
  const [ghostClip, setGhostClip] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => { fetchGhostClip(); }, [spotId, user?.id]);

  const fetchGhostClip = async () => {
    try {
      const { data: clip } = await supabase
        .from('ghost_clips')
        .select('*')
        .eq('spot_id', spotId)
        .single();

      if (clip) {
        setGhostClip(clip);
        if (user?.id) {
          const { data: unlock } = await supabase
            .from('user_unlocks')
            .select('*')
            .eq('user_id', user.id)
            .eq('ghost_clip_id', clip.id)
            .single();
          setUnlocked(!!unlock);
        }
      }
    } catch (error) {
      console.error('Error fetching ghost clip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mx-4">
        <ActivityIndicator size="small" color="#d2673d" />
      </Card>
    );
  }

  if (!ghostClip) return null;

  return (
    <Card className="mx-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Ghost color="#8b5cf6" size={20} />
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">Ghost Clip</Text>
      </View>

      {unlocked ? (
        <TouchableOpacity
          className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex-row items-center border-2 border-purple-500"
          onPress={() => setShowVideo(true)}
        >
          <Film color="#8b5cf6" size={28} />
          <View className="flex-1 ml-3">
            <Text className="text-base font-bold text-gray-800 dark:text-gray-100">{ghostClip.title || 'Secret Clip'}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">{ghostClip.description || 'Tap to watch'}</Text>
          </View>
          <Play color="#8b5cf6" size={24} />
        </TouchableOpacity>
      ) : (
        <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex-row items-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <View className="opacity-50">
            <Lock color="#666" size={28} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-bold text-gray-500 dark:text-gray-400">Secret Clip Locked</Text>
            <Text className="text-xs text-gray-400 dark:text-gray-500 italic">Scan the QR code at this spot to unlock!</Text>
          </View>
        </View>
      )}

      <Modal visible={showVideo} animationType="slide" onRequestClose={() => setShowVideo(false)}>
        <View className="flex-1 bg-black">
          <Video
            source={{ uri: ghostClip.video_url }}
            style={{ flex: 1 }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            useNativeControls
          />
          <View className="absolute top-0 left-0 right-0 pt-[60px] px-5">
            <Text
              className="text-2xl font-bold text-white mb-3"
              style={{ textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}
            >
              {ghostClip.title || 'Ghost Clip'}
            </Text>
            <Button title="Close" onPress={() => setShowVideo(false)} variant="primary" size="md" className="self-start" />
          </View>
        </View>
      </Modal>
    </Card>
  );
}
