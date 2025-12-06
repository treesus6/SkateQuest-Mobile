import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../lib/supabase';
import { SkateSpot } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [spots, setSpots] = useState<SkateSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    try {
      // TODO: Replace with actual Supabase table name
      const { data, error } = await supabase
        .from('skate_spots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading spots:', error);
      } else {
        setSpots(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Map View</Text>
        <Text style={styles.infoText}>
          Map implementation with react-native-maps will go here
        </Text>
        <Text style={styles.infoText}>
          Spots loaded: {spots.length}
        </Text>
      </View>

      <View style={styles.featuresGrid}>
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Challenges')}
        >
          <Text style={styles.featureIcon}>🏆</Text>
          <Text style={styles.featureText}>Challenges</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Shops')}
        >
          <Text style={styles.featureIcon}>🛒</Text>
          <Text style={styles.featureText}>Shops</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Crews')}
        >
          <Text style={styles.featureIcon}>👥</Text>
          <Text style={styles.featureText}>Crews</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => navigation.navigate('Events')}
        >
          <Text style={styles.featureIcon}>📅</Text>
          <Text style={styles.featureText}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureCard, styles.addSpotCard]}
          onPress={() => navigation.navigate('AddSpot', {})}
        >
          <Text style={styles.featureIcon}>➕</Text>
          <Text style={styles.featureText}>Add Spot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Map')}
        >
          <Text style={styles.navButtonText}>🗺️ Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navButtonText}>👤 Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0ea',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#f5f0ea',
  },
  featureCard: {
    width: '30%',
    margin: '1.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addSpotCard: {
    backgroundColor: '#d2673d',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  navButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    color: '#d2673d',
    fontWeight: '600',
  },
});
