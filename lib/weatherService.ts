import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 8000;

export interface SpotWeather {
  spot_id: string;
  temperature: number;
  feels_like: number | null;
  humidity: number | null;
  wind_speed: number | null;
  weather_code: number;
  weather_main: string;
  weather_description: string;
  cloud_cover: number | null;
  precipitation: number;
  precipitation_probability: number | null;
  fetched_at: string;
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    precipitation_probability?: Array<number | null>;
  };
}

function weatherCodeLabel(code: number): { main: string; description: string; emoji: string } {
  if (code === 0) return { main: 'Clear', description: 'Clear sky', emoji: '☀️' };
  if (code === 1) return { main: 'Mostly clear', description: 'Mostly clear', emoji: '🌤️' };
  if (code === 2) return { main: 'Partly cloudy', description: 'Partly cloudy', emoji: '⛅' };
  if (code === 3) return { main: 'Cloudy', description: 'Overcast', emoji: '☁️' };
  if (code === 45 || code === 48) return { main: 'Fog', description: 'Foggy', emoji: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { main: 'Drizzle', description: 'Drizzle', emoji: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { main: 'Rain', description: 'Rain', emoji: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { main: 'Snow', description: 'Snow', emoji: '❄️' };
  if ([95, 96, 99].includes(code)) return { main: 'Thunderstorm', description: 'Thunderstorm', emoji: '⛈️' };
  return { main: 'Unknown', description: `Weather code ${code}`, emoji: '❔' };
}

function nearestHourlyRainProbability(data: OpenMeteoResponse): number | null {
  const times = data.hourly?.time;
  const probabilities = data.hourly?.precipitation_probability;
  const currentTime = data.current?.time;
  if (!times?.length || !probabilities?.length || !currentTime) return null;

  const exactIndex = times.indexOf(currentTime);
  if (exactIndex >= 0) {
    const value = probabilities[exactIndex];
    return typeof value === 'number' ? value : null;
  }

  const currentMs = new Date(currentTime).getTime();
  if (!Number.isFinite(currentMs)) return null;

  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;
  times.forEach((time, index) => {
    const distance = Math.abs(new Date(time).getTime() - currentMs);
    if (Number.isFinite(distance) && distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  const value = closestIndex >= 0 ? probabilities[closestIndex] : null;
  return typeof value === 'number' ? value : null;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export const weatherService = {
  async getWeatherForSpot(spotId: string, latitude: number, longitude: number): Promise<SpotWeather> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new ServiceError('Spot is missing valid coordinates', 'WEATHER_INVALID_COORDINATES');
    }

    try {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
        ].join(','),
        hourly: 'precipitation_probability',
        forecast_days: '1',
        timezone: 'auto',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
      });

      const response = await fetchWithTimeout(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Weather service returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as OpenMeteoResponse;
      const temperature = data.current?.temperature_2m;
      const code = data.current?.weather_code;
      if (typeof temperature !== 'number' || typeof code !== 'number') {
        throw new Error('Weather service returned incomplete current conditions');
      }

      const label = weatherCodeLabel(code);
      const weather: SpotWeather = {
        spot_id: spotId,
        temperature,
        feels_like:
          typeof data.current?.apparent_temperature === 'number'
            ? data.current.apparent_temperature
            : null,
        humidity:
          typeof data.current?.relative_humidity_2m === 'number'
            ? data.current.relative_humidity_2m
            : null,
        wind_speed:
          typeof data.current?.wind_speed_10m === 'number'
            ? data.current.wind_speed_10m
            : null,
        weather_code: code,
        weather_main: label.main,
        weather_description: label.description,
        cloud_cover:
          typeof data.current?.cloud_cover === 'number' ? data.current.cloud_cover : null,
        precipitation:
          typeof data.current?.precipitation === 'number' ? data.current.precipitation : 0,
        precipitation_probability: nearestHourlyRainProbability(data),
        fetched_at: new Date().toISOString(),
      };

      Logger.info('Live weather loaded', { spotId, temperature: weather.temperature });
      return weather;
    } catch (error) {
      Logger.error('weatherService.getWeatherForSpot failed', error);
      throw new ServiceError('Live weather is unavailable for this spot', 'WEATHER_GET_FAILED', error);
    }
  },

  async getWeatherForNearbySpots(latitude: number, longitude: number, radiusKm = 5) {
    try {
      const { data: spots, error: spotsError } = await supabase.rpc('get_nearby_spots', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusKm * 1000,
      });
      if (spotsError) throw spotsError;

      const weatherData = await Promise.all(
        (spots ?? []).slice(0, 10).map((spot: any) =>
          this.getWeatherForSpot(spot.id, spot.latitude, spot.longitude).catch(() => null)
        )
      );
      return weatherData.filter((item): item is SpotWeather => item !== null);
    } catch (error) {
      Logger.error('weatherService.getWeatherForNearbySpots failed', error);
      throw new ServiceError('Failed to fetch nearby weather', 'WEATHER_NEARBY_FAILED', error);
    }
  },

  getWeatherEmoji(weatherMain?: string): string {
    const value = weatherMain?.toLowerCase();
    if (!value) return '❔';
    if (value.includes('clear')) return '☀️';
    if (value.includes('partly')) return '⛅';
    if (value.includes('cloud')) return '☁️';
    if (value.includes('rain') || value.includes('drizzle')) return '🌧️';
    if (value.includes('thunder')) return '⛈️';
    if (value.includes('snow')) return '❄️';
    if (value.includes('fog')) return '🌫️';
    return '❔';
  },

  getSkateabilityScore(weather: SpotWeather | null | undefined): number | null {
    if (!weather || typeof weather.temperature !== 'number') return null;

    let score = 100;
    const temp = weather.temperature;
    if (temp < 32 || temp > 100) score -= 35;
    else if (temp < 41 || temp > 90) score -= 20;
    else if (temp < 50 || temp > 85) score -= 8;

    const rainProbability = weather.precipitation_probability;
    if (typeof rainProbability === 'number') {
      if (rainProbability >= 70) score -= 45;
      else if (rainProbability >= 40) score -= 25;
      else if (rainProbability >= 20) score -= 10;
    }

    if (weather.precipitation > 0) score -= 35;
    if (weather.weather_main === 'Rain' || weather.weather_main === 'Drizzle') score -= 30;
    if (weather.weather_main === 'Snow' || weather.weather_main === 'Thunderstorm') score -= 55;
    if (weather.weather_main === 'Fog') score -= 10;

    if (typeof weather.wind_speed === 'number') {
      if (weather.wind_speed >= 30) score -= 25;
      else if (weather.wind_speed >= 20) score -= 12;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  },
};
