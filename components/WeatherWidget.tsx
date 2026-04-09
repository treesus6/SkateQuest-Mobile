import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Cloud, ThermometerSun, Wind, Droplets } from 'lucide-react-native';
import Card from './ui/Card';
import { weatherService } from '../lib/weatherService';

interface Weather {
  temperature?: number;
  feels_like?: number;
  humidity?: number;
  wind_speed?: number;
  weather_main?: string;
  weather_description?: string;
  precipitation?: number;
}

interface WeatherWidgetProps {
  weather?: Weather | null;
  loading?: boolean;
  compact?: boolean;
}

export default function WeatherWidget({ weather, loading = false, compact = false }: WeatherWidgetProps) {
  if (loading) {
    return (
      <Card className="items-center justify-center h-32">
        <ActivityIndicator size="large" color="#d2673d" />
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="opacity-60">
        <View className="flex-row items-center gap-2">
          <Cloud size={20} color="#999" strokeWidth={1.5} />
          <Text className="text-sm text-gray-500">Weather unavailable</Text>
        </View>
      </Card>
    );
  }

  const skateScore = weatherService.getSkateabilityScore(weather);
  const emoji = weatherService.getWeatherEmoji(weather.weather_main);

  // Determine score color
  let scoreColor = '#EF4444';  // Red
  if (skateScore >= 75) scoreColor = '#22C55E';  // Green
  else if (skateScore >= 50) scoreColor = '#F59E0B';  // Amber
  else if (skateScore >= 25) scoreColor = '#EF4444';  // Red

  if (compact) {
    // Inline compact widget (for MapScreen spot details)
    return (
      <View className="flex-row items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
        <Text className="text-2xl">{emoji}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <ThermometerSun size={14} color="#0EA5E9" strokeWidth={1.5} />
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              {Math.round(weather.temperature || 0)}°C
            </Text>
            <Text className="text-xs text-gray-500">
              {Math.round(weather.feels_like || weather.temperature || 0)}° feels
            </Text>
          </View>
        </View>
        <View
          className="px-2 py-1 rounded-full"
          style={{ backgroundColor: `${scoreColor}20` }}
        >
          <Text className="text-xs font-bold" style={{ color: scoreColor }}>
            {Math.round(skateScore)}%
          </Text>
        </View>
      </View>
    );
  }

  // Full card view
  return (
    <Card>
      <View className="gap-3">
        {/* Weather emoji and main condition */}
        <View className="flex-row items-center gap-3">
          <Text className="text-4xl">{emoji}</Text>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-white capitalize">
              {weather.weather_description || weather.weather_main || 'Unknown'}
            </Text>
            <Text className="text-xs text-gray-500">Skateability Score</Text>
          </View>
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: `${scoreColor}20` }}
          >
            <Text className="text-2xl font-black" style={{ color: scoreColor }}>
              {Math.round(skateScore)}%
            </Text>
          </View>
        </View>

        {/* Temperature details */}
        <View className="flex-row gap-4">
          {/* Actual temperature */}
          <View className="flex-1 flex-row items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <ThermometerSun size={18} color="#F59E0B" strokeWidth={1.5} />
            <View className="flex-1">
              <Text className="text-xs text-gray-600 dark:text-gray-300">Temperature</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(weather.temperature || 0)}°C
              </Text>
              {weather.feels_like && weather.feels_like !== weather.temperature && (
                <Text className="text-xs text-gray-500">
                  Feels {Math.round(weather.feels_like)}°C
                </Text>
              )}
            </View>
          </View>

          {/* Wind speed */}
          {weather.wind_speed !== undefined && (
            <View className="flex-1 flex-row items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wind size={18} color="#0EA5E9" strokeWidth={1.5} />
              <View className="flex-1">
                <Text className="text-xs text-gray-600 dark:text-gray-300">Wind</Text>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {Math.round(weather.wind_speed * 3.6)} km/h
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Humidity and precipitation */}
        <View className="flex-row gap-4">
          {/* Humidity */}
          {weather.humidity !== undefined && (
            <View className="flex-1 flex-row items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Droplets size={18} color="#A855F7" strokeWidth={1.5} />
              <View className="flex-1">
                <Text className="text-xs text-gray-600 dark:text-gray-300">Humidity</Text>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {weather.humidity}%
                </Text>
              </View>
            </View>
          )}

          {/* Precipitation */}
          {(weather.precipitation ?? 0) > 0 && (
            <View className="flex-1 flex-row items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Cloud size={18} color="#EF4444" strokeWidth={1.5} />
              <View className="flex-1">
                <Text className="text-xs text-gray-600 dark:text-gray-300">Rain</Text>
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {weather.precipitation}mm
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Skateability advice */}
        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {skateScore >= 75
              ? '✅ Perfect conditions for skating!'
              : skateScore >= 50
              ? '⚠️  Conditions are okay, but could be better'
              : skateScore >= 25
              ? '❌ Not ideal for skating today'
              : '🚫 Poor conditions, consider indoor practice'}
          </Text>
        </View>
      </View>
    </Card>
  );
}
