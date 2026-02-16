import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Sun,
  Droplets,
  Users,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Circle,
} from 'lucide-react-native';
import { SpotCondition } from '../types';
import { supabase } from '../lib/supabase';

interface SpotConditionsWidgetProps {
  spotId: string;
  compact?: boolean;
  onPress?: () => void;
}

const CONDITION_ICONS: Record<string, { icon: any; color: string }> = {
  dry: { icon: Sun, color: '#4CAF50' },
  wet: { icon: Droplets, color: '#2196F3' },
  crowded: { icon: Users, color: '#FF9800' },
  empty: { icon: Sparkles, color: '#4CAF50' },
  cops: { icon: ShieldAlert, color: '#f44336' },
  clear: { icon: CheckCircle, color: '#4CAF50' },
  under_construction: { icon: AlertTriangle, color: '#FF9800' },
};

export default function SpotConditionsWidget({
  spotId,
  compact = false,
  onPress,
}: SpotConditionsWidgetProps) {
  const [conditions, setConditions] = useState<SpotCondition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConditions();

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

  const getConditionLabel = (condition: string) => condition.replace('_', ' ').toUpperCase();

  if (loading || conditions.length === 0) return null;

  if (compact) {
    const condition = conditions[0];
    const iconData = CONDITION_ICONS[condition.condition] || { icon: MapPin, color: '#999' };
    const Icon = iconData.icon;

    return (
      <TouchableOpacity
        className="w-7 h-7 rounded-full justify-center items-center border-2 border-white shadow-lg"
        style={{ backgroundColor: iconData.color }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon color="#fff" size={14} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="bg-white dark:bg-gray-800 rounded-xl p-3 my-2 shadow-sm"
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center gap-1.5">
          <Circle color="#ef4444" size={8} fill="#ef4444" />
          <Text className="text-sm font-bold text-gray-800 dark:text-gray-100">
            Live Conditions
          </Text>
        </View>
        <Text className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {conditions.length}
        </Text>
      </View>
      {conditions.map(condition => {
        const iconData = CONDITION_ICONS[condition.condition] || { icon: MapPin, color: '#999' };
        const Icon = iconData.icon;
        return (
          <View
            key={condition.id}
            className="flex-row items-center py-2 pl-2 mb-1.5"
            style={{ borderLeftWidth: 3, borderLeftColor: iconData.color }}
          >
            <Icon color={iconData.color} size={18} />
            <View className="flex-1 ml-2.5">
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {getConditionLabel(condition.condition)}
              </Text>
              <Text className="text-[11px] text-gray-400 mt-0.5">
                {getTimeAgo(condition.created_at)}
              </Text>
            </View>
          </View>
        );
      })}
    </TouchableOpacity>
  );
}

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 21600) return `${Math.floor(seconds / 3600)}h ago`;
  return 'today';
}
