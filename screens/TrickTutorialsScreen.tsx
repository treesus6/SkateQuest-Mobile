import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Linking,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Youtube, ExternalLink, Bookmark, X, Send, Search } from 'lucide-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';

interface Tutorial {
  id: string;
  trick_name: string;
  youtube_url: string;
  difficulty: Difficulty;
  submitted_by: string;
  votes: number;
  is_bookmarked: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner: '#4CAF50',
  Intermediate: '#FF9800',
  Advanced: '#FF6B35',
  Pro: '#9C27B0',
};

const FILTER_TABS: Array<'All' | Difficulty> = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Pro',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const color = DIFFICULTY_COLORS[difficulty];
  return (
    <View
      style={{ backgroundColor: color + '22', borderColor: color + '66' }}
      className="px-2 py-0.5 rounded-full border"
    >
      <Text style={{ color }} className="text-xs font-bold">
        {difficulty}
      </Text>
    </View>
  );
}

function TutorialCard({
  item,
  onBookmark,
  bookmarkLoading,
}: {
  item: Tutorial;
  onBookmark: (id: string, isBookmarked: boolean) => void;
  bookmarkLoading: string | null;
}) {
  const handleOpen = () => {
    Linking.openURL(item.youtube_url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <View className="bg-[#1a1a1a] rounded-xl p-4 mb-3 border border-neutral-800">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-white font-bold text-base" numberOfLines={2}>
            {item.trick_name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <DifficultyBadge difficulty={item.difficulty} />
            <Text className="text-neutral-500 text-xs">
              by @{item.submitted_by}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onBookmark(item.id, item.is_bookmarked)}
          disabled={bookmarkLoading === item.id}
          className="p-1"
        >
          {bookmarkLoading === item.id ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : (
            <Bookmark
              size={20}
              color={item.is_bookmarked ? '#FF6B35' : '#666'}
              fill={item.is_bookmarked ? '#FF6B35' : 'transparent'}
            />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleOpen}
        className="flex-row items-center gap-2 mt-3 bg-red-600/10 border border-red-600/30 rounded-lg px-3 py-2"
      >
        <Youtube size={18} color="#FF0000" />
        <Text className="text-red-400 text-sm font-semibold flex-1" numberOfLines={1}>
          Watch on YouTube
        </Text>
        <ExternalLink size={14} color="#666" />
      </TouchableOpacity>
    </View>
  );
}

function SuggestModal({
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (trickName: string, url: string, difficulty: Difficulty) => void;
  submitting: boolean;
}) {
  const [trickName, setTrickName] = useState('');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');

  const handleSubmit = () => {
    if (!trickName.trim() || !url.trim()) return;
    onSubmit(trickName.trim(), url.trim(), difficulty);
  };

  const handleClose = () => {
    setTrickName('');
    setUrl('');
    setDifficulty('Beginner');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-[#1a1a1a] rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-white text-xl font-black">Suggest a Tutorial</Text>
              <TouchableOpacity onPress={handleClose} className="p-1">
                <X size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <Text className="text-neutral-400 text-sm mb-1.5">Trick Name</Text>
            <TextInput
              value={trickName}
              onChangeText={setTrickName}
              placeholder="e.g. Kickflip, Heelflip..."
              placeholderTextColor="#555"
              className="bg-neutral-800 text-white rounded-xl px-4 py-3 mb-4 text-base border border-neutral-700"
            />

            <Text className="text-neutral-400 text-sm mb-1.5">YouTube URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://youtube.com/..."
              placeholderTextColor="#555"
              autoCapitalize="none"
              keyboardType="url"
              className="bg-neutral-800 text-white rounded-xl px-4 py-3 mb-4 text-base border border-neutral-700"
            />

            <Text className="text-neutral-400 text-sm mb-2">Difficulty</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {(['Beginner', 'Intermediate', 'Advanced', 'Pro'] as Difficulty[]).map((d) => {
                const color = DIFFICULTY_COLORS[d];
                const selected = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={{
                      backgroundColor: selected ? color : color + '22',
                      borderColor: color + '88',
                    }}
                    className="px-3 py-1.5 rounded-full border"
                  >
                    <Text
                      style={{ color: selected ? '#fff' : color }}
                      className="text-sm font-bold"
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !trickName.trim() || !url.trim()}
              className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
                submitting || !trickName.trim() || !url.trim()
                  ? 'bg-neutral-700'
                  : 'bg-orange-500'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
              <Text className="text-white font-bold text-base">Submit Tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TrickTutorialsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'TrickTutorials'>>();
  const initialSearch = route.params?.initialSearch ?? '';

  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState<'All' | Difficulty>('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const fetchTutorials = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);

    const { data: tuts, error } = await supabase
      .from('trick_tutorials')
      .select('id, trick_name, youtube_url, difficulty, submitted_by, votes')
      .order('votes', { ascending: false });

    if (error) {
      console.error('Tutorials fetch error:', error.message);
      setLoading(false);
      return;
    }

    const { data: bookmarks } = await supabase
      .from('tutorial_bookmarks')
      .select('tutorial_id')
      .eq('user_id', currentUserId);

    const bookmarkedIds = new Set((bookmarks ?? []).map((b: any) => b.tutorial_id));

    const mapped: Tutorial[] = (tuts ?? []).map((t: any) => ({
      id: t.id,
      trick_name: t.trick_name,
      youtube_url: t.youtube_url,
      difficulty: t.difficulty as Difficulty,
      submitted_by: t.submitted_by ?? 'community',
      votes: t.votes ?? 0,
      is_bookmarked: bookmarkedIds.has(t.id),
    }));

    setTutorials(mapped);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) fetchTutorials();
  }, [currentUserId, fetchTutorials]);

  const handleBookmark = useCallback(
    async (tutorialId: string, isBookmarked: boolean) => {
      if (!currentUserId || bookmarkLoading) return;
      setBookmarkLoading(tutorialId);

      try {
        if (isBookmarked) {
          await supabase
            .from('tutorial_bookmarks')
            .delete()
            .eq('user_id', currentUserId)
            .eq('tutorial_id', tutorialId);
        } else {
          await supabase
            .from('tutorial_bookmarks')
            .upsert(
              { user_id: currentUserId, tutorial_id: tutorialId },
              { onConflict: 'user_id,tutorial_id' }
            );
        }

        setTutorials((prev) =>
          prev.map((t) =>
            t.id === tutorialId ? { ...t, is_bookmarked: !isBookmarked } : t
          )
        );
      } catch (err) {
        console.error('Bookmark error:', err);
      } finally {
        setBookmarkLoading(null);
      }
    },
    [currentUserId, bookmarkLoading]
  );

  const handleSuggest = useCallback(
    async (trickName: string, youtubeUrl: string, difficulty: Difficulty) => {
      if (!currentUserId) return;
      setSubmitting(true);

      const { error } = await supabase.from('trick_tutorials').insert({
        trick_name: trickName,
        youtube_url: youtubeUrl,
        difficulty,
        submitted_by: currentUserId,
        votes: 0,
      });

      setSubmitting(false);

      if (!error) {
        setModalVisible(false);
        fetchTutorials();
      } else {
        console.error('Suggest error:', error.message);
      }
    },
    [currentUserId, fetchTutorials]
  );

  const filtered = tutorials.filter((t) => {
    const matchesFilter = activeFilter === 'All' || t.difficulty === activeFilter;
    const matchesSearch =
      !searchQuery ||
      t.trick_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      {/* ── Header ── */}
      <View className="px-4 pt-6 pb-4 border-b border-neutral-800">
        <Text className="text-orange-500 text-xs font-bold tracking-widest uppercase">
          Learn
        </Text>
        <Text className="text-white text-3xl font-black mt-1">Trick Tutorials</Text>
        <Text className="text-neutral-400 text-sm mt-1">
          Community-curated YouTube guides
        </Text>
      </View>

      {/* ── Search ── */}
      <View className="px-4 pt-4">
        <View className="flex-row items-center bg-neutral-800 rounded-xl px-3 border border-neutral-700">
          <Search size={18} color="#666" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tricks..."
            placeholderTextColor="#555"
            className="flex-1 text-white px-3 py-3 text-base"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View className="mt-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 gap-2"
        >
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab;
            const color =
              tab === 'All' ? '#FF6B35' : DIFFICULTY_COLORS[tab as Difficulty];
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={{
                  backgroundColor: active ? color : color + '22',
                  borderColor: color + '66',
                }}
                className="px-4 py-2 rounded-full border"
              >
                <Text
                  style={{ color: active ? '#fff' : color }}
                  className="text-sm font-bold"
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Tutorial List ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text className="text-neutral-400 mt-3">Loading tutorials...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TutorialCard
              item={item}
              onBookmark={handleBookmark}
              bookmarkLoading={bookmarkLoading}
            />
          )}
          contentContainerClassName="px-4 pt-4 pb-28"
          ListEmptyComponent={
            <View className="items-center py-16">
              <Youtube size={48} color="#333" />
              <Text className="text-neutral-500 text-base mt-3 text-center">
                {searchQuery
                  ? `No tutorials found for "${searchQuery}"`
                  : 'No tutorials yet. Be the first to suggest one!'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Suggest Button (floating) ── */}
      <View className="absolute bottom-6 left-4 right-4">
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-lg"
        >
          <Youtube size={20} color="#fff" />
          <Text className="text-white font-bold text-base">Suggest a Tutorial</Text>
        </TouchableOpacity>
      </View>

      {/* ── Suggest Modal ── */}
      <SuggestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSuggest}
        submitting={submitting}
      />
    </View>
  );
}
