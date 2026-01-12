import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { SpotCondition } from '../types';

interface SpotConditionsWidgetProps {
  spotId: string;
  compact?: boolean;
  onPress?: () => void;
}

export default function SpotConditionsWidget({
  spotId,
  compact = false,
  onPress,
}: SpotConditionsWidgetProps) {
  const [conditions, setConditions] = useState<SpotCondition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConditions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`spot-conditions-${spotId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'spot_conditions',
          filter: `spot_id=eq.${spotId}`,
        },
        () => {
          loadConditions();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spotId]);

  const loadConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('spot_conditions')
        .select('*')
        .eq('spot_id', spotId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(compact ? 1 : 3);

      if (error) throw error;

      setConditions(data || []);
    } catch (error) {
      console.error('Error loading conditions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionIcon = (condition: string) => {
    const icons: Record<string, string> = {
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

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      dry: '#4CAF50',
      wet: '#2196F3',
      crowded: '#FF9800',
      empty: '#4CAF50',
      cops: '#f44336',
      clear: '#4CAF50',
      under_construction: '#FF9800',
    };
    return colors[condition] || '#999';
  };

  const getConditionLabel = (condition: string) => {
    return condition.replace('_', ' ').toUpperCase();
  };

  if (loading || conditions.length === 0) {
    return null;
  }

  if (compact) {
    // Compact mode: single badge with icon
    const condition = conditions[0];
    return (
      <TouchableOpacity
        style={[styles.compactBadge, { backgroundColor: getConditionColor(condition.condition) }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.compactIcon}>{getConditionIcon(condition.condition)}</Text>
      </TouchableOpacity>
    );
  }

  // Full mode: list of conditions
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>🔴 Live Conditions</Text>
        <Text style={styles.countBadge}>{conditions.length}</Text>
      </View>
      {conditions.map(condition => (
        <View
          key={condition.id}
          style={[styles.conditionRow, { borderLeftColor: getConditionColor(condition.condition) }]}
        >
          <Text style={styles.icon}>{getConditionIcon(condition.condition)}</Text>
          <View style={styles.conditionInfo}>
            <Text style={styles.conditionText}>{getConditionLabel(condition.condition)}</Text>
            <Text style={styles.timeText}>{getTimeAgo(condition.created_at)}</Text>
          </View>
        </View>
      ))}
    </TouchableOpacity>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 21600) return `${Math.floor(seconds / 3600)}h ago`;
  return 'today';
}

const styles = StyleSheet.create({
  // Compact mode styles
  compactBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  compactIcon: {
    fontSize: 14,
  },

  // Full mode styles
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  countBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 8,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  conditionInfo: {
    flex: 1,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});
