import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Playlist } from '../types';
import * as playlistService from '../services/playlists';

export default function PlaylistsScreen() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    spotifyUrl: '',
    appleMusicUrl: '',
    youtubeUrl: '',
  });

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await playlistService.getPublicPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylist.name.trim() || !user) return;

    if (!newPlaylist.spotifyUrl && !newPlaylist.appleMusicUrl && !newPlaylist.youtubeUrl) {
      Alert.alert('Error', 'Add at least one streaming link');
      return;
    }

    try {
      await playlistService.createPlaylist({
        userId: user.id,
        name: newPlaylist.name.trim(),
        description: newPlaylist.description.trim(),
        spotifyUrl: newPlaylist.spotifyUrl.trim(),
        appleMusicUrl: newPlaylist.appleMusicUrl.trim(),
        youtubeUrl: newPlaylist.youtubeUrl.trim(),
      });

      Alert.alert('Success', 'Playlist shared!');
      setShowModal(false);
      setNewPlaylist({
        name: '',
        description: '',
        spotifyUrl: '',
        appleMusicUrl: '',
        youtubeUrl: '',
      });
      loadPlaylists();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const likePlaylist = async (playlistId: string) => {
    if (!user) return;

    try {
      await playlistService.togglePlaylistLike(playlistId, user.id);
      loadPlaylists();
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => {
    return (
      <View style={styles.playlistCard}>
        <View style={styles.playlistHeader}>
          <View>
            <Text style={styles.playlistName}>{item.name}</Text>
            <Text style={styles.playlistAuthor}>by {item.user?.username}</Text>
          </View>
          <TouchableOpacity style={styles.likeButton} onPress={() => likePlaylist(item.id)}>
            <Text style={styles.likeIcon}>❤️</Text>
            <Text style={styles.likeCount}>{item.likes_count}</Text>
          </TouchableOpacity>
        </View>

        {item.description && <Text style={styles.playlistDescription}>{item.description}</Text>}

        <View style={styles.linksContainer}>
          {item.spotify_url && (
            <TouchableOpacity
              style={[styles.linkButton, styles.spotifyButton]}
              onPress={() => openLink(item.spotify_url!)}
            >
              <Text style={styles.linkButtonText}>🎵 Spotify</Text>
            </TouchableOpacity>
          )}
          {item.apple_music_url && (
            <TouchableOpacity
              style={[styles.linkButton, styles.appleButton]}
              onPress={() => openLink(item.apple_music_url!)}
            >
              <Text style={styles.linkButtonText}>🎵 Apple</Text>
            </TouchableOpacity>
          )}
          {item.youtube_url && (
            <TouchableOpacity
              style={[styles.linkButton, styles.youtubeButton]}
              onPress={() => openLink(item.youtube_url!)}
            >
              <Text style={styles.linkButtonText}>▶️ YouTube</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🎧 Session Playlists</Text>
          <Text style={styles.headerSubtitle}>Music for skating</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+ Share</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        renderItem={renderPlaylist}
        keyExtractor={(item: Playlist) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No playlists yet</Text>
            <Text style={styles.emptySubtext}>Share your session playlist!</Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Playlist</Text>

            <TextInput
              style={styles.input}
              placeholder="Playlist name *"
              value={newPlaylist.name}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, name: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newPlaylist.description}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, description: text })}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.linkLabel}>🎵 Spotify URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://open.spotify.com/playlist/..."
              value={newPlaylist.spotifyUrl}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, spotifyUrl: text })}
              autoCapitalize="none"
            />

            <Text style={styles.linkLabel}>🍎 Apple Music URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://music.apple.com/..."
              value={newPlaylist.appleMusicUrl}
              onChangeText={(text: string) =>
                setNewPlaylist({ ...newPlaylist, appleMusicUrl: text })
              }
              autoCapitalize="none"
            />

            <Text style={styles.linkLabel}>▶️ YouTube URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/playlist?list=..."
              value={newPlaylist.youtubeUrl}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, youtubeUrl: text })}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={createPlaylist}
              >
                <Text style={styles.saveButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d2673d',
    padding: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#d2673d',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  playlistCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  playlistAuthor: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  likeButton: {
    alignItems: 'center',
  },
  likeIcon: {
    fontSize: 24,
  },
  likeCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spotifyButton: {
    backgroundColor: '#1DB954',
  },
  appleButton: {
    backgroundColor: '#FA243C',
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
    marginBottom: 5,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
