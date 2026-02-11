import React, { useState } from 'react';
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
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { playlistsService } from '../lib/playlistsService';
import { Playlist } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnimatedListItem, ScreenFadeIn } from '../components/ui';
import { EmptyStates } from '../components/EmptyState';
import RetryBanner from '../components/RetryBanner';

export default function PlaylistsScreen() {
  const user = useAuthStore(s => s.user);
  const { data: playlists, loading, error: queryError, refetch } = useSupabaseQuery<Playlist[]>(
    () => playlistsService.getPublic(),
    []
  );
  const [showModal, setShowModal] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    spotifyUrl: '',
    appleMusicUrl: '',
    youtubeUrl: '',
  });

  const createPlaylist = async () => {
    if (!newPlaylist.name.trim() || !user) return;
    if (!newPlaylist.spotifyUrl && !newPlaylist.appleMusicUrl && !newPlaylist.youtubeUrl) {
      Alert.alert('Error', 'Add at least one streaming link');
      return;
    }
    try {
      const { error } = await playlistsService.create({
        user_id: user.id,
        name: newPlaylist.name.trim(),
        description: newPlaylist.description.trim() || null,
        spotify_url: newPlaylist.spotifyUrl.trim() || null,
        apple_music_url: newPlaylist.appleMusicUrl.trim() || null,
        youtube_url: newPlaylist.youtubeUrl.trim() || null,
      });
      if (error) throw error;
      Alert.alert('Success', 'Playlist shared!');
      setShowModal(false);
      setNewPlaylist({ name: '', description: '', spotifyUrl: '', appleMusicUrl: '', youtubeUrl: '' });
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const likePlaylist = async (playlistId: string) => {
    if (!user) return;
    try {
      const { error } = await playlistsService.like(playlistId, user.id);
      if (error) {
        if (error.code === '23505') {
          await playlistsService.unlike(playlistId, user.id);
        } else {
          throw error;
        }
      }
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const renderPlaylist = ({ item, index }: { item: Playlist; index: number }) => (
    <AnimatedListItem index={index}>
    <Card>
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">{item.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {item.user?.username}</Text>
        </View>
        <TouchableOpacity className="items-center" onPress={() => likePlaylist(item.id)}>
          <Text className="text-2xl">❤️</Text>
          <Text className="text-xs text-gray-500 mt-0.5">{item.likes_count}</Text>
        </TouchableOpacity>
      </View>

      {item.description ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">{item.description}</Text>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {item.spotify_url ? (
          <TouchableOpacity
            className="bg-[#1DB954] px-3 py-2 rounded-lg"
            onPress={() => Linking.openURL(item.spotify_url!)}
          >
            <Text className="text-white text-xs font-bold">Spotify</Text>
          </TouchableOpacity>
        ) : null}
        {item.apple_music_url ? (
          <TouchableOpacity
            className="bg-[#FA243C] px-3 py-2 rounded-lg"
            onPress={() => Linking.openURL(item.apple_music_url!)}
          >
            <Text className="text-white text-xs font-bold">Apple</Text>
          </TouchableOpacity>
        ) : null}
        {item.youtube_url ? (
          <TouchableOpacity
            className="bg-[#FF0000] px-3 py-2 rounded-lg"
            onPress={() => Linking.openURL(item.youtube_url!)}
          >
            <Text className="text-white text-xs font-bold">YouTube</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
    </AnimatedListItem>
  );

  return (
    <ScreenFadeIn>
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 rounded-b-xl flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-white">Session Playlists</Text>
          <Text className="text-xs text-white/90">Music for skating</Text>
        </View>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full"
          onPress={() => setShowModal(true)}
        >
          <Text className="text-brand-terracotta font-bold text-sm">+ Share</Text>
        </TouchableOpacity>
      </View>

      <RetryBanner error={queryError} onRetry={refetch} loading={loading} />
      <FlatList
        data={playlists ?? []}
        renderItem={renderPlaylist}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={<EmptyStates.NoPlaylists onAction={() => setShowModal(true)} />}
      />

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 max-h-[90%]">
            <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Share Playlist</Text>

            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 text-gray-800 dark:text-gray-100"
              placeholder="Playlist name *"
              placeholderTextColor="#999"
              value={newPlaylist.name}
              onChangeText={text => setNewPlaylist({ ...newPlaylist, name: text })}
            />
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 h-16 text-gray-800 dark:text-gray-100"
              placeholder="Description (optional)"
              placeholderTextColor="#999"
              value={newPlaylist.description}
              onChangeText={text => setNewPlaylist({ ...newPlaylist, description: text })}
              multiline
              numberOfLines={2}
              style={{ textAlignVertical: 'top' }}
            />

            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1 mb-1">Spotify URL</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 text-gray-800 dark:text-gray-100"
              placeholder="https://open.spotify.com/playlist/..."
              placeholderTextColor="#999"
              value={newPlaylist.spotifyUrl}
              onChangeText={text => setNewPlaylist({ ...newPlaylist, spotifyUrl: text })}
              autoCapitalize="none"
            />
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1 mb-1">Apple Music URL</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 text-gray-800 dark:text-gray-100"
              placeholder="https://music.apple.com/..."
              placeholderTextColor="#999"
              value={newPlaylist.appleMusicUrl}
              onChangeText={text => setNewPlaylist({ ...newPlaylist, appleMusicUrl: text })}
              autoCapitalize="none"
            />
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1 mb-1">YouTube URL</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-3 text-gray-800 dark:text-gray-100"
              placeholder="https://youtube.com/playlist?list=..."
              placeholderTextColor="#999"
              value={newPlaylist.youtubeUrl}
              onChangeText={text => setNewPlaylist({ ...newPlaylist, youtubeUrl: text })}
              autoCapitalize="none"
            />

            <View className="flex-row gap-3 mt-2">
              <View className="flex-1">
                <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" size="lg" />
              </View>
              <View className="flex-1">
                <Button title="Share" onPress={createPlaylist} variant="primary" size="lg" className="bg-brand-green" />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </ScreenFadeIn>
  );
}
