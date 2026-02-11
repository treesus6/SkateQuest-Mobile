import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface GhostClipViewerProps {
  spotId: string;
}

export default function GhostClipViewer({ spotId }: GhostClipViewerProps) {
  const { user } = useAuth();
  const [ghostClip, setGhostClip] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    fetchGhostClip();
  }, [spotId, user?.id]);

  const fetchGhostClip = async () => {
    try {
      // Get ghost clip for this spot
      const { data: clip } = await supabase
        .from('ghost_clips')
        .select('*')
        .eq('spot_id', spotId)
        .single();

      if (clip) {
        setGhostClip(clip);

        // Check if user has unlocked it
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
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#d2673d" />
      </View>
    );
  }

  if (!ghostClip) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👻 Ghost Clip</Text>

      {unlocked ? (
        <TouchableOpacity style={styles.unlockedCard} onPress={() => setShowVideo(true)}>
          <Text style={styles.unlockedEmoji}>🎬</Text>
          <View style={styles.clipInfo}>
            <Text style={styles.clipTitle}>{ghostClip.title || 'Secret Clip'}</Text>
            <Text style={styles.clipDesc}>{ghostClip.description || 'Tap to watch'}</Text>
          </View>
          <Text style={styles.playIcon}>▶️</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedCard}>
          <Text style={styles.lockedEmoji}>🔒</Text>
          <View style={styles.lockInfo}>
            <Text style={styles.lockTitle}>Secret Clip Locked</Text>
            <Text style={styles.lockHint}>Scan the QR code at this spot to unlock!</Text>
          </View>
        </View>
      )}

      {/* Video Modal */}
      <Modal visible={showVideo} animationType="slide" onRequestClose={() => setShowVideo(false)}>
        <View style={styles.videoModal}>
          <Video
            source={{ uri: ghostClip.video_url }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            useNativeControls
          />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoTitle}>{ghostClip.title || 'Ghost Clip'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowVideo(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  unlockedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  unlockedEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  clipInfo: {
    flex: 1,
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  clipDesc: {
    fontSize: 12,
    color: '#aaa',
  },
  playIcon: {
    fontSize: 24,
  },
  lockedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
  },
  lockedEmoji: {
    fontSize: 32,
    marginRight: 12,
    opacity: 0.5,
  },
  lockInfo: {
    flex: 1,
  },
  lockTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  lockHint: {
    fontSize: 12,
    color: '#444',
    fontStyle: 'italic',
  },
  videoModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  videoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  closeButton: {
    backgroundColor: '#d2673d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
