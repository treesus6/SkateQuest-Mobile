import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, Region, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { SPOT_THEMES, SpotType, getMarkerColor } from '../logic/SpotLogic';
import { useAuth } from '../../contexts/AuthContext';
import ClaimSpotModal from '../components/ClaimSpotModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Track recently claimed territories for pulsing animation
interface TerritoryClaimEvent {
  spotId: string;
  crewColor: string;
  crewName: string;
  kingUsername: string;
  timestamp: number;
}

// Territory zone for heatmap
interface TerritoryZone {
  latitude: number;
  longitude: number;
  crewColor: string;
  crewName: string;
  spotCount: number;
  radius: number;
}

// Crew info from JOIN
interface CrewInfo {
  id: string;
  name: string;
  color_hex: string;
}

// King/Quest info attached to a spot
interface QuestInfo {
  id: string;
  current_king_id: string | null;
  king_username: string | null;
  claimed_at: string | null;
  ghost_video_url: string | null;
}

interface Spot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  spot_type: SpotType;
  description?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  needs_bondo?: boolean;
  image_url?: string;
  rating?: number;
  tricks?: string[];
  // Crew data from JOIN
  crew_id?: string | null;
  crews?: CrewInfo | null;
  // Quest/King data
  quest?: QuestInfo | null;
  // Contested status
  pending_claims_count?: number;
}

type FilterType = 'park' | 'street' | 'diy';

const INITIAL_REGION: Region = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Pulsing marker for DIY spots that need bondo
const PulsingBondoMarker: React.FC<{
  spot: Spot;
  onPress: () => void;
}> = ({ spot, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  const markerColor = getMarkerColor(spot);
  const theme = SPOT_THEMES[spot.spot_type];
  const hasKing = !!spot.quest?.current_king_id;

  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} onPress={onPress}>
      <View style={styles.markerContainer}>
        {/* Pulse ring for needs_bondo */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
              borderColor: '#e74c3c',
            },
          ]}
        />
        <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
          <Text style={styles.markerIcon}>{theme.icon}</Text>
        </View>
        {hasKing && (
          <View style={styles.crownBadge}>
            <Text style={styles.crownText}>👑</Text>
          </View>
        )}
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>!</Text>
        </View>
      </View>
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{spot.name}</Text>
          {hasKing && (
            <View style={styles.kingLabel}>
              <Text style={styles.kingLabelText}>
                👑 King: {spot.quest?.king_username || 'Unknown'}
              </Text>
            </View>
          )}
          <Text style={styles.calloutSubtitle}>{theme.label}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

// Contested marker - glowing effect for spots with pending claims
const ContestedMarker: React.FC<{
  spot: Spot;
  onPress: () => void;
}> = ({ spot, onPress }) => {
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [glowAnim, scaleAnim]);

  const markerColor = getMarkerColor(spot);
  const theme = SPOT_THEMES[spot.spot_type];
  const hasKing = !!spot.quest?.current_king_id;

  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} onPress={onPress}>
      <View style={styles.markerContainer}>
        {/* Glow ring for contested spots */}
        <Animated.View
          style={[
            styles.contestedGlow,
            {
              transform: [{ scale: scaleAnim }],
              opacity: glowAnim,
            },
          ]}
        />
        <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
          <Text style={styles.markerIcon}>{theme.icon}</Text>
        </View>
        {hasKing && (
          <View style={styles.crownBadge}>
            <Text style={styles.crownText}>👑</Text>
          </View>
        )}
        {/* Contested badge */}
        <View style={styles.contestedBadge}>
          <Text style={styles.contestedText}>⚔️</Text>
        </View>
      </View>
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{spot.name}</Text>
          {hasKing && (
            <View style={styles.kingLabel}>
              <Text style={styles.kingLabelText}>
                👑 King: {spot.quest?.king_username || 'Unknown'}
              </Text>
            </View>
          )}
          <View style={styles.contestedLabel}>
            <Text style={styles.contestedLabelText}>
              ⚔️ {spot.pending_claims_count} Challenger{spot.pending_claims_count !== 1 ? 's' : ''}!
            </Text>
          </View>
          <Text style={styles.calloutSubtitle}>{theme.label}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

// Regular marker with crew color support
const SpotMarker: React.FC<{
  spot: Spot;
  onPress: () => void;
}> = ({ spot, onPress }) => {
  const markerColor = getMarkerColor(spot);
  const theme = SPOT_THEMES[spot.spot_type];
  const hasKing = !!spot.quest?.current_king_id;

  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} onPress={onPress}>
      <View style={styles.markerContainer}>
        <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
          <Text style={styles.markerIcon}>{theme.icon}</Text>
        </View>
        {hasKing && (
          <View style={styles.crownBadge}>
            <Text style={styles.crownText}>👑</Text>
          </View>
        )}
      </View>
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{spot.name}</Text>
          {hasKing && (
            <View style={styles.kingLabel}>
              <Text style={styles.kingLabelText}>
                👑 King: {spot.quest?.king_username || 'Unknown'}
              </Text>
            </View>
          )}
          <Text style={styles.calloutSubtitle}>{theme.label}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

// Pulsing marker for newly claimed territories
const TerritoryClaimedMarker: React.FC<{
  spot: Spot;
  claimEvent: TerritoryClaimEvent;
  onPress: () => void;
}> = ({ spot, claimEvent, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim, glowAnim]);

  const theme = SPOT_THEMES[spot.spot_type];
  const crewColor = claimEvent.crewColor;

  return (
    <Marker coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} onPress={onPress}>
      <View style={styles.markerContainer}>
        {/* Crew color pulse ring */}
        <Animated.View
          style={[
            styles.territoryClaimPulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
              backgroundColor: crewColor,
            },
          ]}
        />
        {/* Inner glow */}
        <Animated.View
          style={[
            styles.territoryClaimGlow,
            {
              opacity: glowAnim,
              backgroundColor: crewColor,
            },
          ]}
        />
        <View style={[styles.markerPin, { backgroundColor: crewColor }]}>
          <Text style={styles.markerIcon}>{theme.icon}</Text>
        </View>
        {/* Crown badge for new king */}
        <View style={styles.crownBadge}>
          <Text style={styles.crownText}>👑</Text>
        </View>
        {/* Territory claimed badge */}
        <View style={[styles.claimedBadge, { backgroundColor: crewColor }]}>
          <Text style={styles.claimedBadgeText}>NEW!</Text>
        </View>
      </View>
      <Callout tooltip>
        <View style={styles.calloutContainer}>
          <Text style={styles.calloutTitle}>{spot.name}</Text>
          <View style={[styles.territoryClaimedLabel, { backgroundColor: crewColor }]}>
            <Text style={styles.territoryClaimedLabelText}>
              👑 {claimEvent.kingUsername} is the new King!
            </Text>
          </View>
          <Text style={styles.calloutSubtitle}>{theme.label}</Text>
        </View>
      </Callout>
    </Marker>
  );
};

// Territory Taken popup component
const TerritoryTakenPopup: React.FC<{
  visible: boolean;
  claimEvent: TerritoryClaimEvent | null;
  spotName: string;
  onDismiss: () => void;
}> = ({ visible, claimEvent, spotName, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && claimEvent) {
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissPopup();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, claimEvent]);

  const dismissPopup = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible || !claimEvent) return null;

  return (
    <Animated.View
      style={[
        styles.territoryTakenPopup,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.territoryTakenContent, { borderLeftColor: claimEvent.crewColor }]}
        onPress={dismissPopup}
        activeOpacity={0.9}
      >
        <View style={styles.territoryTakenHeader}>
          <Text style={styles.territoryTakenTitle}>👑 Territory Taken!</Text>
          <TouchableOpacity onPress={dismissPopup} style={styles.popupCloseButton}>
            <Text style={styles.popupCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.territoryTakenSpot}>{spotName}</Text>
        <View style={styles.territoryTakenKingRow}>
          <View
            style={[styles.territoryTakenKingAvatar, { backgroundColor: claimEvent.crewColor }]}
          >
            <Text style={styles.territoryTakenKingInitial}>
              {claimEvent.kingUsername.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.territoryTakenKingInfo}>
            <Text style={styles.territoryTakenKingName}>{claimEvent.kingUsername}</Text>
            <Text style={styles.territoryTakenCrewName}>
              {claimEvent.crewName ? `${claimEvent.crewName} Crew` : 'is the new King!'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Duration to show the pulsing claim animation (10 seconds)
const CLAIM_ANIMATION_DURATION = 10000;

export default function MapScreen() {
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(['park', 'street', 'diy'])
  );

  // Track recently claimed territories for visual effects
  const [recentClaims, setRecentClaims] = useState<Map<string, TerritoryClaimEvent>>(new Map());
  const [territoryPopup, setTerritoryPopup] = useState<{
    visible: boolean;
    claimEvent: TerritoryClaimEvent | null;
    spotName: string;
  }>({ visible: false, claimEvent: null, spotName: '' });

  // Heatmap mode state
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [territoryZones, setTerritoryZones] = useState<TerritoryZone[]>([]);

  // Helper to handle spot crew_id changes
  const handleSpotCrewChange = useCallback(
    async (spotId: string, newCrewId: string | null, oldCrewId: string | null) => {
      // Only trigger animation if crew actually changed (not just initial load)
      if (newCrewId && newCrewId !== oldCrewId) {
        try {
          // Fetch the new crew info and current king
          const [crewResult, questResult] = await Promise.all([
            supabase.from('crews').select('name, color_hex').eq('id', newCrewId).single(),
            supabase.from('quests').select('current_king_id').eq('spot_id', spotId).single(),
          ]);

          let kingUsername = 'Unknown';
          if (questResult.data?.current_king_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', questResult.data.current_king_id)
              .single();
            kingUsername = profile?.username || 'Unknown';
          }

          const claimEvent: TerritoryClaimEvent = {
            spotId,
            crewColor: crewResult.data?.color_hex || '#f39c12',
            crewName: crewResult.data?.name || '',
            kingUsername,
            timestamp: Date.now(),
          };

          // Add to recent claims for pulsing marker
          setRecentClaims(prev => {
            const newMap = new Map(prev);
            newMap.set(spotId, claimEvent);
            return newMap;
          });

          // Find spot name for popup
          const spotData = spots.find(s => s.id === spotId);

          // Show the territory taken popup
          setTerritoryPopup({
            visible: true,
            claimEvent,
            spotName: spotData?.name || 'Unknown Spot',
          });

          // Remove from recent claims after animation duration
          setTimeout(() => {
            setRecentClaims(prev => {
              const newMap = new Map(prev);
              newMap.delete(spotId);
              return newMap;
            });
          }, CLAIM_ANIMATION_DURATION);

          // Refresh spots to get updated data
          fetchSpots();
        } catch (error) {
          console.error('Error handling crew change:', error);
          fetchSpots();
        }
      }
    },
    [spots]
  );

  useEffect(() => {
    requestLocationPermission();
    fetchSpots();

    // Real-time subscription for quest changes
    const questSubscription = supabase
      .channel('quest-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quests' }, () => fetchSpots())
      .subscribe();

    // Real-time subscription for claims changes (contested status)
    const claimsSubscription = supabase
      .channel('claims-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchSpots())
      .subscribe();

    // Real-time subscription for spots table - detect crew_id changes
    const spotsSubscription = supabase
      .channel('spots-crew-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'spots' },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const newRecord = payload.new as { crew_id: string | null; id: string };
          const oldRecord = payload.old as { crew_id: string | null; id: string };

          if (newRecord && oldRecord && newRecord.crew_id !== oldRecord.crew_id) {
            handleSpotCrewChange(newRecord.id, newRecord.crew_id, oldRecord.crew_id);
          }
        }
      )
      .subscribe();

    return () => {
      questSubscription.unsubscribe();
      claimsSubscription.unsubscribe();
      spotsSubscription.unsubscribe();
    };
  }, [handleSpotCrewChange]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show your position on the map.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(location);

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const fetchSpots = async () => {
    try {
      setLoading(true);

      // Fetch spots with JOIN to crews table and quests
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select(
          `
          *,
          crews (
            id,
            name,
            color_hex
          ),
          quests (
            id,
            current_king_id,
            claimed_at,
            ghost_video_url
          )
        `
        )
        .in('spot_type', ['park', 'street', 'diy']);

      if (spotsError) {
        console.error('Error fetching spots:', spotsError);
        Alert.alert('Error', 'Failed to load spots');
        return;
      }

      // Fetch pending claims count for each spot
      const { data: claimsData } = await supabase
        .from('claims')
        .select('spot_id')
        .eq('status', 'pending');

      // Count pending claims per spot
      const pendingClaimsCounts: Record<string, number> = {};
      (claimsData || []).forEach(claim => {
        pendingClaimsCounts[claim.spot_id] = (pendingClaimsCounts[claim.spot_id] || 0) + 1;
      });

      // Process spots with king info
      const spotsWithKings = await Promise.all(
        (spotsData || []).map(async spot => {
          const quest = Array.isArray(spot.quests) ? spot.quests[0] : spot.quests;
          const crew = Array.isArray(spot.crews) ? spot.crews[0] : spot.crews;

          let kingUsername = null;
          if (quest?.current_king_id) {
            const { data: kingProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', quest.current_king_id)
              .single();
            kingUsername = kingProfile?.username || 'Unknown';
          }

          return {
            ...spot,
            crews: crew || null,
            quests: undefined,
            quest: quest
              ? {
                  id: quest.id,
                  current_king_id: quest.current_king_id,
                  king_username: kingUsername,
                  claimed_at: quest.claimed_at,
                  ghost_video_url: quest.ghost_video_url,
                }
              : null,
            pending_claims_count: pendingClaimsCounts[spot.id] || 0,
          };
        })
      );

      setSpots(spotsWithKings);
    } catch (error) {
      console.error('Error fetching spots:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else {
      Alert.alert('Location Unavailable', 'Unable to get your current location.');
    }
  };

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) {
        if (newFilters.size > 1) {
          newFilters.delete(filter);
        }
      } else {
        newFilters.add(filter);
      }
      return newFilters;
    });
  };

  const handleMarkerPress = (spot: Spot) => {
    setSelectedSpot(spot);
    setDetailModalVisible(true);
  };

  const handleChallengeKing = () => {
    setDetailModalVisible(false);
    setClaimModalVisible(true);
  };

  const handleClaimModalClose = () => {
    setClaimModalVisible(false);
    fetchSpots(); // Refresh to show new pending claim
  };

  const handleTerritoryPopupDismiss = () => {
    setTerritoryPopup({ visible: false, claimEvent: null, spotName: '' });
  };

  // Calculate territory zones for heatmap mode
  const calculateTerritoryZones = useCallback(() => {
    // Group spots by crew
    const crewSpots: Map<
      string,
      {
        spots: Spot[];
        color: string;
        name: string;
      }
    > = new Map();

    spots.forEach(spot => {
      if (spot.crew_id && spot.crews) {
        if (!crewSpots.has(spot.crew_id)) {
          crewSpots.set(spot.crew_id, {
            spots: [],
            color: spot.crews.color_hex,
            name: spot.crews.name,
          });
        }
        crewSpots.get(spot.crew_id)!.spots.push(spot);
      }
    });

    // Create territory zones - cluster nearby spots and create circles
    const zones: TerritoryZone[] = [];

    crewSpots.forEach((crewData, crewId) => {
      // For each crew, create zones around clusters of their spots
      const processedSpots = new Set<string>();

      crewData.spots.forEach(spot => {
        if (processedSpots.has(spot.id)) return;

        // Find nearby spots (within ~500m)
        const nearbySpots = crewData.spots.filter(s => {
          if (processedSpots.has(s.id)) return false;
          const distance = getDistanceFromLatLonInKm(
            spot.latitude,
            spot.longitude,
            s.latitude,
            s.longitude
          );
          return distance < 0.5; // 500 meters
        });

        // Calculate center of the cluster
        let centerLat = 0;
        let centerLng = 0;
        nearbySpots.forEach(s => {
          centerLat += s.latitude;
          centerLng += s.longitude;
          processedSpots.add(s.id);
        });
        centerLat /= nearbySpots.length;
        centerLng /= nearbySpots.length;

        // Create zone with radius based on spot count
        const baseRadius = 200; // 200 meters base
        const spotBonus = Math.min(nearbySpots.length * 50, 300); // Up to 300m bonus

        zones.push({
          latitude: centerLat,
          longitude: centerLng,
          crewColor: crewData.color,
          crewName: crewData.name,
          spotCount: nearbySpots.length,
          radius: baseRadius + spotBonus,
        });
      });
    });

    setTerritoryZones(zones);
  }, [spots]);

  // Helper function to calculate distance between two points
  const getDistanceFromLatLonInKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  // Recalculate zones when spots change
  useEffect(() => {
    if (heatmapMode) {
      calculateTerritoryZones();
    }
  }, [spots, heatmapMode, calculateTerritoryZones]);

  const toggleHeatmapMode = () => {
    setHeatmapMode(prev => !prev);
  };

  const handleStartSession = () => {
    if (selectedSpot) {
      Alert.alert('Session Started', `Starting session at ${selectedSpot.name}`);
      setDetailModalVisible(false);
    }
  };

  const filteredSpots = spots.filter(spot => activeFilters.has(spot.spot_type as FilterType));

  const renderSpotMarker = (spot: Spot) => {
    // Check if this spot was recently claimed - show pulsing crew color
    const claimEvent = recentClaims.get(spot.id);
    if (claimEvent) {
      return (
        <TerritoryClaimedMarker
          key={spot.id}
          spot={spot}
          claimEvent={claimEvent}
          onPress={() => handleMarkerPress(spot)}
        />
      );
    }

    // Contested spots (has pending claims) - glowing effect
    if (spot.pending_claims_count && spot.pending_claims_count > 0) {
      return <ContestedMarker key={spot.id} spot={spot} onPress={() => handleMarkerPress(spot)} />;
    }

    // DIY spots that need bondo - pulsing red
    if (spot.spot_type === 'diy' && spot.needs_bondo) {
      return (
        <PulsingBondoMarker key={spot.id} spot={spot} onPress={() => handleMarkerPress(spot)} />
      );
    }

    // Regular marker
    return <SpotMarker key={spot.id} spot={spot} onPress={() => handleMarkerPress(spot)} />;
  };

  const isCurrentKing = selectedSpot?.quest?.current_king_id === user?.id;
  const markerColor = selectedSpot ? getMarkerColor(selectedSpot) : '#ccc';

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
      >
        {/* Territory Heatmap Circles */}
        {heatmapMode &&
          territoryZones.map((zone, index) => (
            <Circle
              key={`zone-${index}`}
              center={{
                latitude: zone.latitude,
                longitude: zone.longitude,
              }}
              radius={zone.radius}
              fillColor={`${zone.crewColor}40`} // 25% opacity
              strokeColor={zone.crewColor}
              strokeWidth={2}
            />
          ))}

        {/* Spot Markers (dimmed in heatmap mode) */}
        {filteredSpots.map(renderSpotMarker)}
      </MapView>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#d2673d" />
        </View>
      )}

      {/* Territory Taken Popup */}
      <TerritoryTakenPopup
        visible={territoryPopup.visible}
        claimEvent={territoryPopup.claimEvent}
        spotName={territoryPopup.spotName}
        onDismiss={handleTerritoryPopupDismiss}
      />

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilters.has('park') && { backgroundColor: SPOT_THEMES.park.color },
          ]}
          onPress={() => toggleFilter('park')}
        >
          <Text style={styles.filterIcon}>{SPOT_THEMES.park.icon}</Text>
          <Text style={[styles.filterText, activeFilters.has('park') && styles.filterTextActive]}>
            Parks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilters.has('street') && { backgroundColor: SPOT_THEMES.street.color },
          ]}
          onPress={() => toggleFilter('street')}
        >
          <Text style={styles.filterIcon}>{SPOT_THEMES.street.icon}</Text>
          <Text style={[styles.filterText, activeFilters.has('street') && styles.filterTextActive]}>
            Street
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilters.has('diy') && { backgroundColor: SPOT_THEMES.diy.color },
          ]}
          onPress={() => toggleFilter('diy')}
        >
          <Text style={styles.filterIcon}>{SPOT_THEMES.diy.icon}</Text>
          <Text style={[styles.filterText, activeFilters.has('diy') && styles.filterTextActive]}>
            DIY
          </Text>
        </TouchableOpacity>

        {/* Heatmap Toggle */}
        <TouchableOpacity
          style={[styles.filterButton, heatmapMode && styles.heatmapButtonActive]}
          onPress={toggleHeatmapMode}
        >
          <Text style={styles.filterIcon}>🗺️</Text>
          <Text style={[styles.filterText, heatmapMode && styles.filterTextActive]}>Turf</Text>
        </TouchableOpacity>
      </View>

      {/* Center on Me Button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Text style={styles.centerButtonText}>📍</Text>
      </TouchableOpacity>

      {/* Spot Detail Bottom Sheet */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDetailModalVisible(false)}
          />
          <View style={styles.bottomSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedSpot && (
                <>
                  <View style={styles.handleBar} />

                  {/* Spot Header with Crew Color */}
                  <View style={styles.spotHeader}>
                    <View style={[styles.spotTypeBadge, { backgroundColor: markerColor }]}>
                      <Text style={styles.spotTypeIcon}>
                        {SPOT_THEMES[selectedSpot.spot_type].icon}
                      </Text>
                      <Text style={styles.spotTypeLabel}>
                        {SPOT_THEMES[selectedSpot.spot_type].label}
                      </Text>
                    </View>
                    {selectedSpot.crews && (
                      <View
                        style={[
                          styles.crewBadge,
                          { backgroundColor: selectedSpot.crews.color_hex },
                        ]}
                      >
                        <Text style={styles.crewBadgeText}>{selectedSpot.crews.name}</Text>
                      </View>
                    )}
                    {selectedSpot.needs_bondo && (
                      <View style={styles.bondoWarning}>
                        <Text style={styles.bondoWarningText}>⚠️ Needs Bondo</Text>
                      </View>
                    )}
                  </View>

                  {/* Contested Warning */}
                  {selectedSpot.pending_claims_count > 0 && (
                    <View style={styles.contestedWarning}>
                      <Text style={styles.contestedWarningText}>
                        ⚔️ This spot is being contested! {selectedSpot.pending_claims_count}{' '}
                        challenger
                        {selectedSpot.pending_claims_count !== 1 ? 's' : ''} waiting at the Judges
                        Booth.
                      </Text>
                    </View>
                  )}

                  {/* Spot Name */}
                  <Text style={styles.spotName}>{selectedSpot.name}</Text>

                  {/* King of the Spot Section */}
                  <View style={styles.kingSection}>
                    <View style={styles.kingSectionHeader}>
                      <Text style={styles.kingSectionTitle}>👑 King of the Spot</Text>
                    </View>
                    {selectedSpot.quest?.current_king_id ? (
                      <View style={[styles.kingCard, { borderColor: markerColor }]}>
                        <View style={[styles.kingAvatar, { backgroundColor: markerColor }]}>
                          <Text style={styles.kingAvatarText}>
                            {selectedSpot.quest.king_username?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                        <View style={styles.kingInfo}>
                          <Text style={styles.kingUsername}>
                            {selectedSpot.quest.king_username}
                          </Text>
                          {selectedSpot.quest.claimed_at && (
                            <Text style={styles.kingClaimedAt}>
                              Reigning since{' '}
                              {new Date(selectedSpot.quest.claimed_at).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        {isCurrentKing && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>YOU</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.noKingCard}>
                        <Text style={styles.noKingText}>⚔️ Unclaimed Territory</Text>
                        <Text style={styles.noKingSubtext}>Be the first to claim this spot!</Text>
                      </View>
                    )}
                  </View>

                  {/* Spot Description */}
                  {selectedSpot.description && (
                    <Text style={styles.spotDescription}>{selectedSpot.description}</Text>
                  )}

                  {/* Spot Meta */}
                  <View style={styles.spotMeta}>
                    {selectedSpot.difficulty && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Difficulty</Text>
                        <Text style={styles.metaValue}>{selectedSpot.difficulty}</Text>
                      </View>
                    )}
                    {selectedSpot.rating && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Rating</Text>
                        <Text style={styles.metaValue}>⭐ {selectedSpot.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Tricks */}
                  {selectedSpot.tricks && selectedSpot.tricks.length > 0 && (
                    <View style={styles.tricksContainer}>
                      <Text style={styles.tricksLabel}>Popular Tricks</Text>
                      <View style={styles.tricksList}>
                        {selectedSpot.tricks.slice(0, 5).map((trick, index) => (
                          <View key={index} style={styles.trickChip}>
                            <Text style={styles.trickText}>{trick}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {/* Challenge King / Claim Spot Button */}
                    {!isCurrentKing && (
                      <TouchableOpacity
                        style={styles.challengeButton}
                        onPress={handleChallengeKing}
                      >
                        <Text style={styles.challengeButtonText}>
                          {selectedSpot.quest?.current_king_id
                            ? '⚔️ Challenge the King'
                            : '👑 Claim This Spot'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isCurrentKing && (
                      <View style={styles.alreadyKingBanner}>
                        <Text style={styles.alreadyKingText}>👑 You reign over this spot!</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.startSessionButton}
                      onPress={handleStartSession}
                    >
                      <Text style={styles.startSessionText}>🛹 Start Session</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Claim Spot Modal */}
      {selectedSpot && (
        <ClaimSpotModal
          visible={claimModalVisible}
          spotId={selectedSpot.id}
          spotName={selectedSpot.name}
          currentKingUsername={selectedSpot.quest?.king_username || null}
          ghostVideoUrl={selectedSpot.quest?.ghost_video_url || null}
          onClose={handleClaimModalClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  // Filter styles
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterTextActive: {
    color: '#fff',
  },
  heatmapButtonActive: {
    backgroundColor: '#9b59b6',
  },
  // Center button
  centerButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centerButtonText: {
    fontSize: 24,
  },
  // Marker styles
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerIcon: {
    fontSize: 18,
  },
  pulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
  },
  contestedGlow: {
    position: 'absolute',
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#f39c12',
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownText: {
    fontSize: 14,
  },
  warningBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contestedBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contestedText: {
    fontSize: 12,
  },
  // Callout styles
  calloutContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  kingLabel: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  kingLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  contestedLabel: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  contestedLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // Territory Claimed Marker styles
  territoryClaimPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  territoryClaimGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  claimedBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  claimedBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  territoryClaimedLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  territoryClaimedLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // Territory Taken Popup styles
  territoryTakenPopup: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  territoryTakenContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  territoryTakenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  territoryTakenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  popupCloseButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCloseText: {
    fontSize: 16,
    color: '#999',
  },
  territoryTakenSpot: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  territoryTakenKingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  territoryTakenKingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  territoryTakenKingInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  territoryTakenKingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  territoryTakenKingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  territoryTakenCrewName: {
    fontSize: 12,
    color: '#999',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  spotTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  spotTypeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  spotTypeLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  crewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  crewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bondoWarning: {
    backgroundColor: '#ffeaa7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bondoWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e74c3c',
  },
  contestedWarning: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  contestedWarningText: {
    fontSize: 13,
    color: '#e65100',
    fontWeight: '500',
  },
  spotName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  // King Section
  kingSection: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  kingSectionHeader: {
    marginBottom: 8,
  },
  kingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  kingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
  },
  kingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kingAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  kingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  kingUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  kingClaimedAt: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  noKingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  noKingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noKingSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  spotDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  spotMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    marginRight: 24,
  },
  metaLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tricksContainer: {
    marginBottom: 20,
  },
  tricksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tricksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  trickChip: {
    backgroundColor: '#f5f0ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trickText: {
    fontSize: 12,
    color: '#666',
  },
  // Action Buttons
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  challengeButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  challengeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alreadyKingBanner: {
    backgroundColor: '#f39c12',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  alreadyKingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  startSessionButton: {
    backgroundColor: '#d2673d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startSessionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
