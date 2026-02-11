import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
      <View className="bg-white rounded-xl p-[15px] mb-3 shadow-md">
        <View className="flex-row justify-between items-start mb-2">
          <View>
            <Text className="text-lg font-bold text-[#333]">{item.name}</Text>
            <Text className="text-[13px] text-[#666] mt-[2px]">by {item.user?.username}</Text>
          </View>
          <TouchableOpacity className="items-center" onPress={() => likePlaylist(item.id)}>
            <Text className="text-2xl">❤️</Text>
            <Text className="text-xs text-[#666] mt-[2px]">{item.likes_count}</Text>
          </TouchableOpacity>
        </View>

        {item.description && <Text className="text-sm text-[#666] mb-3">{item.description}</Text>}

        <View className="flex-row gap-2 flex-wrap">
          {item.spotify_url && (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg bg-[#1DB954]"
              onPress={() => openLink(item.spotify_url!)}
            >
              <Text className="text-white text-[13px] font-bold">🎵 Spotify</Text>
            </TouchableOpacity>
          )}
          {item.apple_music_url && (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg bg-[#FA243C]"
              onPress={() => openLink(item.apple_music_url!)}
            >
              <Text className="text-white text-[13px] font-bold">🎵 Apple</Text>
            </TouchableOpacity>
          )}
          {item.youtube_url && (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg bg-[#FF0000]"
              onPress={() => openLink(item.youtube_url!)}
            >
              <Text className="text-white text-[13px] font-bold">▶️ YouTube</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#f5f0ea]">
      <View className="flex-row justify-between items-center bg-brand-orange p-[15px] rounded-bl-[15px] rounded-br-[15px]">
        <View>
          <Text className="text-2xl font-bold text-white">🎧 Session Playlists</Text>
          <Text className="text-[13px] text-white opacity-90">Music for skating</Text>
        </View>
        <TouchableOpacity
          className="bg-white px-[15px] py-2 rounded-[20px]"
          onPress={() => setShowModal(true)}
        >
          <Text className="text-brand-orange font-bold text-sm">+ Share</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        renderItem={renderPlaylist}
        keyExtractor={(item: Playlist) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View className="items-center mt-[100px]">
            <Text className="text-lg font-bold text-[#999]">No playlists yet</Text>
            <Text className="text-sm text-[#aaa] mt-[5px]">Share your session playlist!</Text>
          </View>
        }
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-tl-[20px] rounded-tr-[20px] p-5 max-h-[90%]">
            <Text className="text-[22px] font-bold text-[#333] mb-[15px]">Share Playlist</Text>

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-3"
              placeholder="Playlist name *"
              value={newPlaylist.name}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, name: text })}
            />

            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-3 h-[60px]"
              style={{ textAlignVertical: 'top' }}
              placeholder="Description (optional)"
              value={newPlaylist.description}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, description: text })}
              multiline
              numberOfLines={2}
            />

            <Text className="text-sm font-semibold text-[#333] my-[5px]">🎵 Spotify URL</Text>
            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-3"
              placeholder="https://open.spotify.com/playlist/..."
              value={newPlaylist.spotifyUrl}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, spotifyUrl: text })}
              autoCapitalize="none"
            />

            <Text className="text-sm font-semibold text-[#333] my-[5px]">🍎 Apple Music URL</Text>
            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-3"
              placeholder="https://music.apple.com/..."
              value={newPlaylist.appleMusicUrl}
              onChangeText={(text: string) =>
                setNewPlaylist({ ...newPlaylist, appleMusicUrl: text })
              }
              autoCapitalize="none"
            />

            <Text className="text-sm font-semibold text-[#333] my-[5px]">▶️ YouTube URL</Text>
            <TextInput
              className="bg-[#f5f5f5] rounded-lg p-3 text-base mb-3"
              placeholder="https://youtube.com/playlist?list=..."
              value={newPlaylist.youtubeUrl}
              onChangeText={(text: string) => setNewPlaylist({ ...newPlaylist, youtubeUrl: text })}
              autoCapitalize="none"
            />

            <View className="flex-row gap-[10px] mt-[10px]">
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-[#e0e0e0]"
                onPress={() => setShowModal(false)}
              >
                <Text className="text-[#333] text-base font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 py-[14px] rounded-lg items-center bg-[#4CAF50]"
                onPress={createPlaylist}
              >
                <Text className="text-white text-base font-bold">Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
