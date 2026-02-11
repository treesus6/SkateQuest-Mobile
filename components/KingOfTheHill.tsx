import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

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

export default function KingOfTheHill({ spotId, onUpdate: _onUpdate }: KingOfTheHillProps) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [king, setKing] = useState<King | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    fetchKing();
  }, [spotId]);

  const fetchKing = async () => {
    try {
      const { data, error: _error } = await supabase
        .from('spot_claims')
        .select(
          `
          user_id,
          video_url,
          trick_description,
          claimed_at,
          profiles!spot_claims_user_id_fkey(username)
        `
        )
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
      {
        text: 'Record Video',
        onPress: () => {
          // Navigate to upload media with spot context
          (navigation as any).navigate('UploadMedia', {
            spotId,
            challengeType: 'king_of_hill',
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      <Text style={styles.title}>👑 King of the Hill</Text>

      {king ? (
        <>
          <View style={styles.kingCard}>
            <View style={styles.kingInfo}>
              <Text style={styles.kingName}>@{king.username}</Text>
              <Text style={styles.trickText}>{king.trick_description}</Text>
              <Text style={styles.timeText}>{new Date(king.claimed_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.crown}>👑</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.watchButton} onPress={() => setShowVideo(true)}>
              <Text style={styles.watchButtonText}>▶️ Watch</Text>
            </TouchableOpacity>

            {user?.id !== king.user_id && (
              <TouchableOpacity style={styles.challengeButton} onPress={handleChallenge}>
                <Text style={styles.challengeButtonText}>⚔️ Challenge</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Video Modal */}
          <Modal
            visible={showVideo}
            animationType="slide"
            onRequestClose={() => setShowVideo(false)}
          >
            <View style={styles.videoModal}>
              <Video
                source={{ uri: king.video_url }}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowVideo(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <View style={styles.unclaimedCard}>
            <Text style={styles.unclaimedText}>No king yet! Claim this spot!</Text>
          </View>

          <TouchableOpacity style={styles.claimButton} onPress={handleChallenge}>
            <Text style={styles.claimButtonText}>👑 Claim Throne</Text>
          </TouchableOpacity>
        </>
      )}
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
  kingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  kingInfo: {
    flex: 1,
  },
  kingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  trickText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  crown: {
    fontSize: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  watchButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  challengeButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  challengeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  claimButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#d2673d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
