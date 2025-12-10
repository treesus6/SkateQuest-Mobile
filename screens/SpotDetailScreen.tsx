import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SkateSpot, SpotPhoto, SpotCondition, Challenge } from '../types';
import { pickImage, uploadImage, saveMediaToDatabase } from '../lib/mediaUpload';

const { width } = Dimensions.get('window');

export default function SpotDetailScreen({ route, navigation }: any) {
  const { spotId } = route.params;
  const { user } = useAuth();
  const [spot, setSpot] = useState<SkateSpot | null>(null);
  const [photos, setPhotos] = useState<SpotPhoto[]>([]);
  const [conditions, setConditions] = useState<SpotCondition[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);

  useEffect(() => {
    loadSpotData();
  }, [spotId]);

  const loadSpotData = async () => {
    try {
      // Load spot
      const { data: spotData, error: spotError } = await supabase
        .from('skate_spots')
        .select('*')
        .eq('id', spotId)
        .single();

      if (spotError) throw spotError;
      setSpot(spotData);

      // Load photos
      const { data: photosData, error: photosError } = await supabase
        .from('spot_photos')
        .select(`
          *,
          media:media_id(*)
        `)
        .eq('spot_id', spotId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      setPhotos(photosData || []);

      // Load active conditions (not expired)
      const { data: conditionsData, error: conditionsError } = await supabase
        .from('spot_conditions')
        .select(`
          *,
          reporter:reported_by(username)
        `)
        .eq('spot_id', spotId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (conditionsError) throw conditionsError;
      setConditions(conditionsData || []);

      // Load challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .eq('spot_id', spotId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);
    } catch (error: any) {
      console.error('Error loading spot:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadSpotPhoto = async () => {
    if (!user) return;

    try {
      setUploading(true);
      const uri = await pickImage();
      if (!uri) return;

      const photoUrl = await uploadImage(uri);

      // Save to media table
      const mediaId = await saveMediaToDatabase({
        user_id: user.id,
        type: 'photo',
        url: photoUrl,
        caption: `Photo of ${spot?.name}`,
        spot_id: spotId,
      });

      // Link to spot_photos
      const { error } = await supabase.from('spot_photos').insert([
        {
          spot_id: spotId,
          media_id: mediaId,
          uploaded_by: user.id,
          is_primary: photos.length === 0, // First photo is primary
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Photo uploaded!');
      loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const reportCondition = async (condition: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('spot_conditions').insert([
        {
          spot_id: spotId,
          reported_by: user.id,
          condition,
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Condition reported!');
      setShowConditionsModal(false);
      loadSpotData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#4CAF50';
      case 'Intermediate':
        return '#FF9800';
      case 'Advanced':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getConditionIcon = (condition: string) => {
    const icons = {
      dry: '☀️',
      wet: '💧',
      crowded: '👥',
      empty: '✨',
      cops: '👮',
      clear: '✅',
      under_construction: '🚧',
    };
    return icons[condition] || '📍';
  };

  const getConditionLabel = (condition: string) => {
    return condition.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d2673d" />
      </View>
    );
  }

  if (!spot) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Spot not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photo Carousel */}
      <View style={styles.carouselContainer}>
        {photos.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActivePhotoIndex(index);
              }}
            >
              {photos.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.media?.url }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            <View style={styles.photoIndicators}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === activePhotoIndex && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noPhotosContainer}>
            <Text style={styles.noPhotosText}>No photos yet</Text>
            <Text style={styles.noPhotosSubtext}>Be the first to add one!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addPhotoButton} onPress={uploadSpotPhoto} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addPhotoButtonText}>📸 Add Photo</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Spot Info */}
      <View style={styles.infoCard}>
        <Text style={styles.spotName}>{spot.name}</Text>

        <View style={styles.metaRow}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(spot.difficulty) }]}>
            <Text style={styles.difficultyText}>{spot.difficulty || 'Unknown'}</Text>
          </View>
          {spot.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>⭐ {spot.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {spot.tricks && spot.tricks.length > 0 && (
          <View style={styles.tricksSection}>
            <Text style={styles.sectionTitle}>Popular Tricks:</Text>
            <View style={styles.tricksContainer}>
              {spot.tricks.map((trick, index) => (
                <View key={index} style={styles.trickTag}>
                  <Text style={styles.trickText}>{trick}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Live Conditions */}
      {conditions.length > 0 && (
        <View style={styles.conditionsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🔴 Live Conditions</Text>
            <Text style={styles.cardSubtitle}>Updated recently</Text>
          </View>
          {conditions.map((condition) => (
            <View key={condition.id} style={styles.conditionRow}>
              <Text style={styles.conditionIcon}>{getConditionIcon(condition.condition)}</Text>
              <View style={styles.conditionInfo}>
                <Text style={styles.conditionText}>{getConditionLabel(condition.condition)}</Text>
                <Text style={styles.conditionMeta}>
                  by {condition.reporter?.username} • {getTimeAgo(condition.created_at)}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setShowConditionsModal(true)}
          >
            <Text style={styles.reportButtonText}>+ Report Condition</Text>
          </TouchableOpacity>
        </View>
      )}

      {conditions.length === 0 && (
        <View style={styles.conditionsCard}>
          <Text style={styles.noConditionsText}>No recent conditions reported</Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setShowConditionsModal(true)}
          >
            <Text style={styles.reportButtonText}>+ Report Condition</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Challenges */}
      {challenges.length > 0 && (
        <View style={styles.challengesCard}>
          <Text style={styles.cardTitle}>🎯 Active Challenges</Text>
          {challenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={styles.challengeRow}
              onPress={() => navigation.navigate('Challenges')}
            >
              <Text style={styles.challengeTrick}>{challenge.trick}</Text>
              <Text style={styles.challengeXP}>+{challenge.xp_reward} XP</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            navigation.navigate('Challenges', { spotId: spot.id })
          }
        >
          <Text style={styles.actionButtonText}>🎯 View All Challenges</Text>
        </TouchableOpacity>
      </View>

      {/* Report Conditions Modal */}
      <Modal
        visible={showConditionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Condition</Text>
            <Text style={styles.modalSubtitle}>What's the spot like right now?</Text>

            <View style={styles.conditionsGrid}>
              {[
                { value: 'dry', label: 'Dry', icon: '☀️' },
                { value: 'wet', label: 'Wet', icon: '💧' },
                { value: 'crowded', label: 'Crowded', icon: '👥' },
                { value: 'empty', label: 'Empty', icon: '✨' },
                { value: 'cops', label: 'Cops', icon: '👮' },
                { value: 'clear', label: 'Clear', icon: '✅' },
                { value: 'under_construction', label: 'Construction', icon: '🚧' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.conditionOption}
                  onPress={() => reportCondition(option.value)}
                >
                  <Text style={styles.conditionOptionIcon}>{option.icon}</Text>
                  <Text style={styles.conditionOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConditionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f0ea',
  },
  errorText: {
    fontSize: 18,
    color: '#999',
  },
  carouselContainer: {
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  carouselImage: {
    width,
    height: 300,
  },
  noPhotosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  noPhotosText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
  addPhotoButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#d2673d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  spotName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tricksSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  tricksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trickTag: {
    backgroundColor: '#f5f0ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trickText: {
    fontSize: 13,
    color: '#d2673d',
    fontWeight: '600',
  },
  conditionsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conditionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  conditionInfo: {
    flex: 1,
  },
  conditionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  conditionMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noConditionsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  reportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  challengesCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  challengeTrick: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  challengeXP: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d2673d',
  },
  actionsCard: {
    padding: 15,
    paddingBottom: 30,
  },
  actionButton: {
    backgroundColor: '#d2673d',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  conditionOption: {
    width: '31%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  conditionOptionIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  conditionOptionText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
