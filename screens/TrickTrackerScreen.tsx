import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Target,
  Star,
  Zap,
  Plus,
  Trash2,
  CheckCircle,
  BookOpen,
  MapPin,
  ChevronRight,
  Lightbulb,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/useAuthStore';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { userTricksService } from '../lib/userTricksService';
import { feedService } from '../lib/feedService';
import { profilesService } from '../lib/profilesService';
import {
  getRecommendedSpotsForTrick,
  getProgressionTip,
  SpotRecommendation,
} from '../lib/trickSpotMatcher';
import { UserTrick, RootStackParamList } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const COMMON_TRICKS = [
  'Ollie',
  'Kickflip',
  'Heelflip',
  'Pop Shove-it',
  'Frontside 180',
  'Backside 180',
  'Varial Kickflip',
  'Hardflip',
  'Treflip',
  '50-50 Grind',
  'Boardslide',
  'Noseslide',
  'Tailslide',
  'Feeble Grind',
  'Smith Grind',
];

const STATUS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  trying: { icon: Zap, color: '#FF9800', label: 'TRYING' },
  landed: { icon: Target, color: '#2196F3', label: 'LANDED' },
  consistent: { icon: Star, color: '#4CAF50', label: 'CONSISTENT' },
};

function getDailyTrick(): string {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return COMMON_TRICKS[seed % COMMON_TRICKS.length];
}

// ── Spot Recommendation Panel ─────────────────────────────────────────────────
function SpotRecommendationPanel({
  trick,
  onNavigate,
}: {
  trick: UserTrick;
  onNavigate: (spotId: string) => void;
}) {
  const [spots, setSpots] = useState<SpotRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const tip = getProgressionTip(trick.trick_name, trick.status);

  const loadSpots = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location needed', 'Enable location to find nearby spots for this trick.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const results = await getRecommendedSpotsForTrick(
        trick.trick_name,
        loc.coords.latitude,
        loc.coords.longitude,
        15
      );
      setSpots(results);
      setLoaded(true);
    } catch {
      Alert.alert('Error', 'Could not load nearby spots.');
    } finally {
      setLoading(false);
    }
  }, [trick.trick_name, loaded]);

  return (
    <View className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
      {/* Progression Tip */}
      <View className="flex-row items-start gap-2 mb-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
        <Lightbulb size={14} color="#F59E0B" />
        <Text className="text-xs text-amber-700 dark:text-amber-400 flex-1 leading-4">{tip}</Text>
      </View>

      {/* Find Spots Button */}
      {!loaded && (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 bg-brand-terracotta/10 border border-brand-terracotta/30 py-2.5 rounded-xl"
          onPress={loadSpots}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#d2673d" />
          ) : (
            <>
              <MapPin size={14} color="#d2673d" />
              <Text className="text-brand-terracotta text-sm font-bold">
                Find Spots Nearby for This Trick
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Spot List */}
      {loaded && spots.length > 0 && (
        <View>
          <Text className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Best Nearby Spots
          </Text>
          {spots.map(spot => (
            <TouchableOpacity
              key={spot.id}
              className="flex-row items-center bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 mb-1.5"
              onPress={() => onNavigate(spot.id)}
            >
              <MapPin size={13} color="#d2673d" />
              <View className="flex-1 ml-2">
                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                  {spot.name}
                </Text>
                <Text className="text-xs text-gray-400" numberOfLines={1}>
                  {spot.matchReason}
                  {spot.distance ? ` · ${spot.distance.toFixed(1)} km` : ''}
                </Text>
              </View>
              <ChevronRight size={14} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loaded && spots.length === 0 && (
        <Text className="text-xs text-gray-400 text-center py-2">
          No spots found nearby — try expanding your search radius on the map.
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TrickTrackerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrickName, setNewTrickName] = useState('');
  const [expandedTrickId, setExpandedTrickId] = useState<string | null>(null);

  const { data: tricks, refetch } = useSupabaseQuery<UserTrick[]>(
    () => userTricksService.getAll(user?.id || ''),
    [user?.id],
    { cacheKey: `tricks-${user?.id}`, enabled: !!user }
  );

  const todayTrick = getDailyTrick();
  const todayTrickDone =
    tricks?.some(
      t =>
        t.trick_name.toLowerCase() === todayTrick.toLowerCase() &&
        (t.status === 'landed' || t.status === 'consistent')
    ) ?? false;

  const addTrick = async () => {
    if (!newTrickName.trim() || !user) return;
    try {
      const { error } = await userTricksService.create({
        user_id: user.id,
        trick_name: newTrickName.trim(),
        status: 'trying',
      });
      if (error) {
        if ((error as any).code === '23505') {
          Alert.alert('Error', 'You already have this trick in your list');
        } else throw error;
      } else {
        setNewTrickName('');
        setShowAddModal(false);
        refetch();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateTrickStatus = async (
    trick: UserTrick,
    newStatus: 'trying' | 'landed' | 'consistent'
  ) => {
    if (!user) return;
    try {
      const { error } = await userTricksService.updateStatus(trick.id, newStatus);
      if (error) throw error;

      if (newStatus === 'landed' && trick.status === 'trying') {
        // Activity feed creation is handled by the service which now uses the correct table
        await feedService.create({
          user_id: user.id,
          activity_type: 'trick_landed',
          title: `Landed a ${trick.trick_name}!`,
          xp_earned: 25,
        });
        await profilesService.incrementXp(user.id, 25);
        Alert.alert('Congrats!', `You landed a ${trick.trick_name}! +25 XP`);
      }
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const incrementAttempts = async (trick: UserTrick) => {
    try {
      const { error } = await userTricksService.incrementAttempts(trick.id);
      if (error) {
        await userTricksService.update(trick.id, {
          attempts: trick.attempts + 1,
          updated_at: new Date().toISOString(),
        });
      }
      refetch();
    } catch {}
  };

  const deleteTrick = (trick: UserTrick) => {
    Alert.alert('Delete Trick', `Remove ${trick.trick_name} from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await userTricksService.delete(trick.id);
          refetch();
        },
      },
    ]);
  };

  const handleNavigateToSpot = (spotId: string) => {
    navigation.navigate('SpotDetail', { spotId });
  };

  const renderTrick = ({ item }: { item: UserTrick }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.trying;
    const Icon = config.icon;
    const isExpanded = expandedTrickId === item.id;

    return (
      <Card>
        {/* Header Row */}
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => setExpandedTrickId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <Icon color={config.color} size={28} />
          <View className="flex-1 ml-3">
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {item.trick_name}
            </Text>
            <View className="flex-row gap-2.5 mt-1">
              <Text style={{ color: config.color }} className="text-xs font-bold">
                {config.label}
              </Text>
              <Text className="text-xs text-gray-500">{item.attempts} attempts</Text>
            </View>
          </View>
          <ChevronRight
            size={16}
            color="#9CA3AF"
            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {/* Action Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 bg-brand-terracotta py-2.5 rounded-lg items-center"
            onPress={() => incrementAttempts(item)}
          >
            <Text className="text-white text-sm font-bold">+1 Try</Text>
          </TouchableOpacity>

          {item.status === 'trying' && (
            <TouchableOpacity
              className="flex-1 bg-brand-green py-2.5 rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'landed')}
            >
              <Text className="text-white text-sm font-bold">Landed!</Text>
            </TouchableOpacity>
          )}

          {item.status === 'landed' && (
            <TouchableOpacity
              className="flex-1 bg-blue-500 py-2.5 rounded-lg items-center"
              onPress={() => updateTrickStatus(item, 'consistent')}
            >
              <Text className="text-white text-sm font-bold">Consistent</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="bg-red-500 px-3 py-2.5 rounded-lg items-center"
            onPress={() => deleteTrick(item)}
          >
            <Trash2 color="#fff" size={16} />
          </TouchableOpacity>
        </View>

        {/* Expanded: Spot Recommendations */}
        {isExpanded && (
          <SpotRecommendationPanel trick={item} onNavigate={handleNavigateToSpot} />
        )}
      </Card>
    );
  };

  const trickOfTheDayHeader = (
    <View className="bg-purple-50 dark:bg-purple-950/40 rounded-2xl p-4 mb-4 border border-purple-200 dark:border-purple-800">
      <View className="flex-row items-center gap-1.5 mb-1">
        <Star color="#9333EA" size={14} fill="#9333EA" />
        <Text className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
          Trick of the Day
        </Text>
      </View>
      <Text className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-3">
        {todayTrick}
      </Text>
      <View className="flex-row gap-2">
        {todayTrickDone ? (
          <View className="flex-1 flex-row items-center justify-center gap-1.5 bg-green-500 py-2.5 rounded-xl">
            <CheckCircle size={14} color="#fff" />
            <Text className="text-white text-sm font-bold">Landed!</Text>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-1 bg-purple-600 py-2.5 rounded-xl items-center"
            onPress={() => {
              setNewTrickName(todayTrick);
              setShowAddModal(true);
            }}
          >
            <Text className="text-white text-sm font-bold">Add to My Tricks</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-1 border border-purple-400 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
          onPress={() => navigation.navigate('TrickTutorials', { initialSearch: todayTrick })}
        >
          <BookOpen size={13} color="#9333EA" />
          <Text className="text-purple-600 dark:text-purple-400 text-sm font-bold">Tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-brand-beige dark:bg-gray-900">
      <View className="bg-brand-terracotta p-4 rounded-b-2xl flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-white">Trick Tracker</Text>
          <Text className="text-white/70 text-xs mt-0.5">Tap a trick to find spots nearby</Text>
        </View>
        <TouchableOpacity
          className="bg-white px-4 py-2 rounded-full flex-row items-center gap-1.5"
          onPress={() => setShowAddModal(true)}
        >
          <Plus color="#d2673d" size={14} />
          <Text className="text-brand-terracotta font-bold text-sm">Add Trick</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tricks ?? []}
        renderItem={renderTrick}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={trickOfTheDayHeader}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Text className="text-lg font-bold text-gray-400">No tricks yet</Text>
            <Text className="text-sm text-gray-300 mt-1">Add a trick you're working on!</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-5" style={{ maxHeight: '80%' }}>
            <Text className="text-[22px] font-bold text-gray-800 dark:text-gray-100 mb-4">
              Add New Trick
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-base mb-4 text-gray-800 dark:text-gray-100"
              placeholder="Trick name"
              placeholderTextColor="#999"
              value={newTrickName}
              onChangeText={setNewTrickName}
              autoFocus
            />
            <Text className="text-sm font-semibold text-gray-500 mb-2.5">Common Tricks:</Text>
            <ScrollView>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {COMMON_TRICKS.map(trick => (
                  <TouchableOpacity
                    key={trick}
                    className="bg-gray-200 dark:bg-gray-600 px-3 py-1.5 rounded-full"
                    onPress={() => setNewTrickName(trick)}
                  >
                    <Text className="text-sm text-gray-700 dark:text-gray-200">{trick}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View className="flex-row gap-2.5">
              <Button
                title="Cancel"
                onPress={() => { setShowAddModal(false); setNewTrickName(''); }}
                variant="secondary"
                size="lg"
                className="flex-1"
              />
              <Button
                title="Add"
                onPress={addTrick}
                variant="primary"
                size="lg"
                className="flex-1 bg-brand-green"
                disabled={!newTrickName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
