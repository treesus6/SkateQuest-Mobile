import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

interface Claim {
  id: string;
  spot_id: string;
  challenger_id: string;
  video_url: string;
  status: 'pending' | 'approved' | 'rejected';
  stomp_count: number;
  bail_count: number;
  created_at: string;
  // Joined data
  challenger_username?: string;
  spot_name?: string;
}

interface VoteOverlayProps {
  type: 'stomp' | 'bail' | null;
  opacity: Animated.AnimatedInterpolation<number>;
}

const VoteOverlay: React.FC<VoteOverlayProps> = ({ type, opacity }) => {
  if (!type) return null;

  const isStomp = type === 'stomp';

  return (
    <Animated.View
      style={[
        styles.voteOverlay,
        {
          opacity,
          backgroundColor: isStomp ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)',
        },
      ]}
    >
      <Animated.Text style={[styles.voteOverlayText, { color: isStomp ? '#2ecc71' : '#e74c3c' }]}>
        {isStomp ? '🔥 STOMPED!' : '💀 BAIL!'}
      </Animated.Text>
    </Animated.View>
  );
};

export default function JudgesBooth() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [newKingName, setNewKingName] = useState('');

  const videoRef = useRef<Video>(null);
  const position = useRef(new Animated.ValueXY()).current;
  const stompScale = useRef(new Animated.Value(1)).current;
  const bailScale = useRef(new Animated.Value(1)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;

  // Swipe gesture detection
  const swipeDirection = useRef<'stomp' | 'bail' | null>(null);

  useEffect(() => {
    fetchPendingClaims();

    // Real-time subscription for new claims
    const subscription = supabase
      .channel('claims-booth')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () =>
        fetchPendingClaims()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingClaims = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('claims')
        .select(
          `
          *,
          profiles:challenger_id (username),
          spots:spot_id (name)
        `
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching claims:', error);
        return;
      }

      const formattedClaims = (data || []).map(claim => ({
        ...claim,
        challenger_username: claim.profiles?.username || 'Unknown',
        spot_name: claim.spots?.name || 'Unknown Spot',
        profiles: undefined,
        spots: undefined,
      }));

      setClaims(formattedClaims);
    } catch (error) {
      console.error('Error fetching claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: 0 });

        // Update swipe direction for overlay
        if (gestureState.dx > 50) {
          swipeDirection.current = 'stomp';
        } else if (gestureState.dx < -50) {
          swipeDirection.current = 'bail';
        } else {
          swipeDirection.current = null;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - STOMP
          swipeCard('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - BAIL
          swipeCard('left');
        } else {
          // Reset position
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
          swipeDirection.current = null;
        }
      },
    })
  ).current;

  const swipeCard = (direction: 'left' | 'right') => {
    const toValue = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;

    Animated.timing(position, {
      toValue: { x: toValue, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Submit vote after animation
      handleVote(direction === 'right' ? 'stomp' : 'bail');
    });
  };

  const handleVote = async (voteType: 'stomp' | 'bail') => {
    if (!user || voting || currentIndex >= claims.length) return;

    const claim = claims[currentIndex];
    setVoting(true);

    try {
      // Insert vote record
      const { error: voteError } = await supabase.from('votes').insert({
        claim_id: claim.id,
        user_id: user.id,
        vote_type: voteType,
        value: voteType === 'stomp' ? 1 : -1,
        created_at: new Date().toISOString(),
      });

      if (voteError) {
        // Check if user already voted
        if (voteError.code === '23505') {
          Alert.alert('Already Voted', "You've already voted on this clip!");
        } else {
          throw voteError;
        }
        resetCardPosition();
        return;
      }

      // Update claim counts
      const updateField = voteType === 'stomp' ? 'stomp_count' : 'bail_count';
      const newCount = claim[updateField] + 1;

      const { error: updateError } = await supabase
        .from('claims')
        .update({ [updateField]: newCount })
        .eq('id', claim.id);

      if (updateError) throw updateError;

      // Check if claim hit 10 stomps - crown the new king!
      if (voteType === 'stomp' && newCount >= 10) {
        await crownNewKing(claim);
      }

      // Move to next claim
      goToNextClaim();
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
      resetCardPosition();
    } finally {
      setVoting(false);
    }
  };

  const crownNewKing = async (claim: Claim) => {
    try {
      // Call Supabase function to set new king
      const { error } = await supabase.rpc('crown_new_king', {
        p_spot_id: claim.spot_id,
        p_new_king_id: claim.challenger_id,
        p_claim_id: claim.id,
      });

      if (error) {
        // If RPC doesn't exist, do it manually
        console.log('RPC not found, updating manually');

        // Update the quest to set new king
        const { error: questError } = await supabase.from('quests').upsert(
          {
            spot_id: claim.spot_id,
            current_king_id: claim.challenger_id,
            claimed_at: new Date().toISOString(),
            ghost_video_url: claim.video_url,
          },
          {
            onConflict: 'spot_id',
          }
        );

        if (questError) throw questError;

        // Mark claim as approved
        await supabase.from('claims').update({ status: 'approved' }).eq('id', claim.id);
      }

      // Show celebration!
      setNewKingName(claim.challenger_username || 'Unknown');
      setShowCelebration(true);

      Animated.sequence([
        Animated.spring(celebrationScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
        }),
        Animated.delay(2500),
        Animated.timing(celebrationScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCelebration(false);
      });
    } catch (error) {
      console.error('Error crowning new king:', error);
    }
  };

  const resetCardPosition = () => {
    position.setValue({ x: 0, y: 0 });
    swipeDirection.current = null;
  };

  const goToNextClaim = () => {
    position.setValue({ x: 0, y: 0 });
    swipeDirection.current = null;
    setCurrentIndex(prev => prev + 1);
  };

  const handleStompPress = () => {
    // Animate button
    Animated.sequence([
      Animated.timing(stompScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(stompScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();

    swipeCard('right');
  };

  const handleBailPress = () => {
    // Animate button
    Animated.sequence([
      Animated.timing(bailScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(bailScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();

    swipeCard('left');
  };

  const cardRotation = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const stompOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const bailOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9b59b6" />
        <Text style={styles.loadingText}>Loading the Judges Booth...</Text>
      </View>
    );
  }

  if (claims.length === 0 || currentIndex >= claims.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>⚖️</Text>
        <Text style={styles.emptyTitle}>No Pending Claims</Text>
        <Text style={styles.emptySubtitle}>Check back later for tricks to judge!</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchPendingClaims}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentClaim = claims[currentIndex];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚖️ Judges Booth</Text>
        <Text style={styles.claimCounter}>
          {currentIndex + 1} / {claims.length}
        </Text>
      </View>

      {/* Video Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ translateX: position.x }, { rotate: cardRotation }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* STOMP Overlay */}
        <Animated.View style={[styles.stompOverlay, { opacity: stompOpacity }]}>
          <Text style={styles.stompOverlayText}>🔥 STOMPED!</Text>
        </Animated.View>

        {/* BAIL Overlay */}
        <Animated.View style={[styles.bailOverlay, { opacity: bailOpacity }]}>
          <Text style={styles.bailOverlayText}>💀 BAIL!</Text>
        </Animated.View>

        {/* Video */}
        <Video
          ref={videoRef}
          source={{ uri: currentClaim.video_url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={false}
        />

        {/* Claim Info Overlay */}
        <View style={styles.claimInfo}>
          <Text style={styles.challengerName}>🛹 {currentClaim.challenger_username}</Text>
          <Text style={styles.spotName}>📍 {currentClaim.spot_name}</Text>
          <View style={styles.voteStats}>
            <Text style={styles.stompStat}>🔥 {currentClaim.stomp_count}</Text>
            <Text style={styles.bailStat}>💀 {currentClaim.bail_count}</Text>
          </View>
          {currentClaim.stomp_count >= 7 && (
            <View style={styles.almostThereTag}>
              <Text style={styles.almostThereText}>
                🔥 {10 - currentClaim.stomp_count} more to crown!
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Voting Buttons */}
      <View style={styles.votingButtons}>
        <Animated.View style={{ transform: [{ scale: bailScale }] }}>
          <TouchableOpacity style={styles.bailButton} onPress={handleBailPress} disabled={voting}>
            <Text style={styles.bailButtonEmoji}>💀</Text>
            <Text style={styles.bailButtonText}>BAIL</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>← Swipe to vote →</Text>
        </View>

        <Animated.View style={{ transform: [{ scale: stompScale }] }}>
          <TouchableOpacity style={styles.stompButton} onPress={handleStompPress} disabled={voting}>
            <Text style={styles.stompButtonEmoji}>🔥</Text>
            <Text style={styles.stompButtonText}>STOMPED</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Celebration Overlay */}
      {showCelebration && (
        <Animated.View
          style={[styles.celebrationOverlay, { transform: [{ scale: celebrationScale }] }]}
        >
          <Text style={styles.celebrationEmoji}>👑</Text>
          <Text style={styles.celebrationTitle}>NEW KING CROWNED!</Text>
          <Text style={styles.celebrationName}>{newKingName}</Text>
          <Text style={styles.celebrationSubtitle}>has taken the throne!</Text>
        </Animated.View>
      )}

      {/* Voting Indicator */}
      {voting && (
        <View style={styles.votingIndicator}>
          <ActivityIndicator color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  claimCounter: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  // Card
  cardContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
  },
  // Overlays
  stompOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#2ecc71',
    transform: [{ rotate: '-15deg' }],
  },
  stompOverlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  bailOverlay: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#e74c3c',
    transform: [{ rotate: '15deg' }],
  },
  bailOverlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Claim Info
  claimInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  challengerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  spotName: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  voteStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stompStat: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: '600',
  },
  bailStat: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  almostThereTag: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  almostThereText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Voting Buttons
  votingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bailButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  bailButtonEmoji: {
    fontSize: 28,
  },
  bailButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  swipeHint: {
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: '#666',
  },
  stompButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2ecc71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  stompButtonEmoji: {
    fontSize: 28,
  },
  stompButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  // Celebration
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f39c12',
    marginBottom: 12,
  },
  celebrationName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 18,
    color: '#888',
  },
  // Voting indicator
  votingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  voteOverlayText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
});
