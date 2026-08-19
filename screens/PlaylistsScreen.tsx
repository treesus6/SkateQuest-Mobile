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
import { Music, Plus, Heart, Headphones, ExternalLink } from 'lucide-react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { playlistsService } from '../lib/playlistsService';
import { Playlist } from '../types';
import { ScreenFadeIn } from '../components/ui';
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
        if (error.code === '23505') await playlistsService.unlike(playlistId, user.id);
        else throw error;
      }
      refetch();
    } catch (error: any) {
      console.error('Error:', error);
    }
  };

  const allPlaylists = playlists ?? [];
  const totalLikes = allPlaylists.reduce((sum, playlist) => sum + Number(playlist.likes_count || 0), 0);

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <View className="bg-[#10151D] border border-[#252D39] rounded-[20px] p-4 mb-3">
      <View className="flex-row items-start gap-3">
        <View className="w-12 h-12 rounded-2xl bg-[#171020] border border-[#3B2850] items-center justify-center">
          <Music size={22} color="#C084FC" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="text-white text-[17px] font-black">{item.name}</Text>
              <Text className="text-[#7B8493] text-xs mt-1">by @{item.user?.username || 'skater'}</Text>
            </View>
            <TouchableOpacity onPress={() => likePlaylist(item.id)} className="bg-[#251112] border border-[#532326] rounded-xl px-3 py-2 flex-row items-center gap-1.5">
              <Heart size={14} color="#FB7185" fill="#FB7185" />
              <Text className="text-[#FDA4AF] text-xs font-black">{item.likes_count}</Text>
            </TouchableOpacity>
          </View>
          {item.description ? <Text className="text-[#A7AFBA] text-sm leading-5 mt-3">{item.description}</Text> : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-4">
        {item.spotify_url ? (
          <TouchableOpacity className="bg-[#12331F] border border-[#285D39] px-3 py-2.5 rounded-xl flex-row items-center gap-2" onPress={() => Linking.openURL(item.spotify_url!)}>
            <Headphones size={14} color="#4ADE80" />
            <Text className="text-[#4ADE80] text-xs font-black">Spotify</Text>
          </TouchableOpacity>
        ) : null}
        {item.apple_music_url ? (
          <TouchableOpacity className="bg-[#351115] border border-[#64212A] px-3 py-2.5 rounded-xl flex-row items-center gap-2" onPress={() => Linking.openURL(item.apple_music_url!)}>
            <ExternalLink size={14} color="#FB7185" />
            <Text className="text-[#FB7185] text-xs font-black">Apple</Text>
          </TouchableOpacity>
        ) : null}
        {item.youtube_url ? (
          <TouchableOpacity className="bg-[#351010] border border-[#662020] px-3 py-2.5 rounded-xl flex-row items-center gap-2" onPress={() => Linking.openURL(item.youtube_url!)}>
            <ExternalLink size={14} color="#F87171" />
            <Text className="text-[#F87171] text-xs font-black">YouTube</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const fieldClass = 'bg-[#090D13] border border-[#252D39] rounded-xl p-3.5 text-base mb-3 text-white';

  return (
    <ScreenFadeIn>
      <View className="flex-1 bg-[#07090D]">
        <View className="px-5 pt-12 pb-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[#C084FC] text-[11px] font-black tracking-[2px]">SESSION SOUNDTRACK</Text>
              <Text className="text-white text-[30px] font-black mt-1">Playlists</Text>
              <Text className="text-[#7B8493] text-sm mt-1">Community music for sessions, pushes and late-night missions.</Text>
            </View>
            <TouchableOpacity className="bg-[#7C3AED] px-4 py-3 rounded-2xl flex-row items-center gap-2" onPress={() => setShowModal(true)}>
              <Plus color="#fff" size={15} />
              <Text className="text-white font-black text-sm">Share</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2 mt-4">
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Music size={16} color="#C084FC" />
              <Text className="text-white text-xl font-black mt-1">{allPlaylists.length}</Text>
              <Text className="text-[#697383] text-[11px]">shared mixes</Text>
            </View>
            <View className="flex-1 bg-[#10151D] border border-[#252D39] rounded-2xl p-3">
              <Heart size={16} color="#FB7185" />
              <Text className="text-white text-xl font-black mt-1">{totalLikes}</Text>
              <Text className="text-[#697383] text-[11px]">community likes</Text>
            </View>
          </View>
        </View>

        <RetryBanner error={queryError} onRetry={refetch} loading={loading} />
        <FlatList
          data={allPlaylists}
          renderItem={renderPlaylist}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshing={loading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center mt-20 px-8">
              <View className="w-16 h-16 rounded-2xl bg-[#10151D] border border-[#252D39] items-center justify-center">
                <Music size={28} color="#596271" />
              </View>
              <Text className="text-white text-lg font-black mt-4">No playlists yet</Text>
              <Text className="text-[#697383] text-sm text-center mt-2">Share a real streaming playlist and give the next session a soundtrack.</Text>
              <TouchableOpacity onPress={() => setShowModal(true)} className="bg-[#7C3AED] rounded-xl px-5 py-3 mt-4">
                <Text className="text-white font-black">Share first playlist</Text>
              </TouchableOpacity>
            </View>
          }
        />

        <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
          <View className="flex-1 bg-black/70 justify-end">
            <View className="bg-[#10151D] border border-[#2A303A] rounded-t-[28px] p-5 max-h-[90%]">
              <View className="w-10 h-1 bg-[#343B47] rounded-full self-center mb-4" />
              <Text className="text-[#C084FC] text-[10px] font-black tracking-[1.5px]">ADD TO THE SOUNDTRACK</Text>
              <Text className="text-white text-[22px] font-black mt-1 mb-4">Share Playlist</Text>

              <TextInput className={fieldClass} placeholder="Playlist name *" placeholderTextColor="#596271" value={newPlaylist.name} onChangeText={text => setNewPlaylist({ ...newPlaylist, name: text })} />
              <TextInput className={`${fieldClass} h-20`} placeholder="Description (optional)" placeholderTextColor="#596271" value={newPlaylist.description} onChangeText={text => setNewPlaylist({ ...newPlaylist, description: text })} multiline numberOfLines={2} style={{ textAlignVertical: 'top' }} />
              <TextInput className={fieldClass} placeholder="Spotify URL" placeholderTextColor="#596271" value={newPlaylist.spotifyUrl} onChangeText={text => setNewPlaylist({ ...newPlaylist, spotifyUrl: text })} autoCapitalize="none" />
              <TextInput className={fieldClass} placeholder="Apple Music URL" placeholderTextColor="#596271" value={newPlaylist.appleMusicUrl} onChangeText={text => setNewPlaylist({ ...newPlaylist, appleMusicUrl: text })} autoCapitalize="none" />
              <TextInput className={fieldClass} placeholder="YouTube playlist URL" placeholderTextColor="#596271" value={newPlaylist.youtubeUrl} onChangeText={text => setNewPlaylist({ ...newPlaylist, youtubeUrl: text })} autoCapitalize="none" />

              <View className="flex-row gap-2.5 mt-2">
                <TouchableOpacity className="flex-1 bg-[#0B1017] border border-[#252D39] rounded-xl py-4 items-center" onPress={() => setShowModal(false)}>
                  <Text className="text-[#AEB5C0] font-black">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`flex-1 rounded-xl py-4 items-center ${newPlaylist.name.trim() ? 'bg-[#7C3AED]' : 'bg-[#353B45]'}`} onPress={createPlaylist} disabled={!newPlaylist.name.trim()}>
                  <Text className="text-white font-black">Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenFadeIn>
  );
}
