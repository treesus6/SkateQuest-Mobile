import { supabase } from './supabase';
import { Logger } from './logger';
import { ServiceError } from './serviceError';

// OpenWeather API free tier endpoint (no key needed for basic queries in demo)
const OPENWEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5/weather';

export const weatherService = {
  async getWeatherForSpot(spotId: string, latitude: number, longitude: number) {
    try {
      // Check cache first (valid for 1 hour)
      const { data: cached } = await supabase
        .from('spot_weather')
        .select('*')
        .eq('spot_id', spotId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        Logger.info('Weather cache hit', { spotId });
        return cached;
      }

      // Fetch fresh weather from OpenWeather API
      // Note: In production, you'd need an API key from openweathermap.org
      // For now, we'll gracefully handle unavailable data
      try {
        const response = await fetch(
          `${OPENWEATHER_API_BASE}?lat=${latitude}&lon=${longitude}&units=metric`
        );

        if (!response.ok) {
          throw new Error(`OpenWeather API error: ${response.statusText}`);
        }

        const weatherData = await response.json();

        // Transform and store in Supabase
        const spotWeather = {
          spot_id: spotId,
          temperature: weatherData.main?.temp ?? null,
          feels_like: weatherData.main?.feels_like ?? null,
          humidity: weatherData.main?.humidity ?? null,
          wind_speed: weatherData.wind?.speed ?? null,
          weather_main: weatherData.weather?.[0]?.main ?? null,
          weather_description: weatherData.weather?.[0]?.description ?? null,
          weather_icon: weatherData.weather?.[0]?.icon ?? null,
          cloud_cover: weatherData.clouds?.all ?? null,
          precipitation: weatherData.rain?.['1h'] ?? 0,
          visibility: weatherData.visibility ?? null,
          uvi: null,  // Not in free tier
          expires_at: new Date(Date.now() + 3600000).toISOString(),  // 1 hour cache
        };

        // Upsert into database
        const { data, error } = await supabase
          .from('spot_weather')
          .upsert([spotWeather])
          .select()
          .single();

        if (error) throw error;

        Logger.info('Weather fetched from API', { spotId, temp: data?.temperature });
        return data;
      } catch (apiError) {
        // If API fails, return cached data (even if expired) or null
        Logger.warn('OpenWeather API unavailable', { spotId, error: apiError });

        const { data: anyCache } = await supabase
          .from('spot_weather')
          .select('*')
          .eq('spot_id', spotId)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();

        return anyCache ?? null;
      }
    } catch (error) {
      Logger.error('weatherService.getWeatherForSpot failed', error);
      throw new ServiceError('Failed to fetch weather', 'WEATHER_GET_FAILED', error);
    }
  },

  async getWeatherForNearbySpots(latitude: number, longitude: number, radiusKm: number = 5) {
    try {
      // Get nearby spots first
      const { data: spots, error: spotsError } = await supabase.rpc('get_nearby_spots', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusKm * 1000,
      });

      if (spotsError) throw spotsError;

      // Get weather for up to 10 nearest spots
      const weatherPromises = spots.slice(0, 10).map((spot: any) =>
        this.getWeatherForSpot(spot.id, spot.latitude, spot.longitude).catch(() => null)
      );

      const weatherData = await Promise.all(weatherPromises);
      return weatherData.filter((w): w is Record<string, any> => w !== null);
    } catch (error) {
      Logger.error('weatherService.getWeatherForNearbySpots failed', error);
      throw new ServiceError('Failed to fetch nearby weather', 'WEATHER_NEARBY_FAILED', error);
    }
  },

  async subscribeToSpotWeather(spotId: string, callback: (data: any) => void) {
    try {
      const subscription = supabase
        .channel(`spot_weather:${spotId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'spot_weather',
            filter: `spot_id=eq.${spotId}`,
          },
          (payload) => {
            Logger.info('Weather updated', { spotId });
            callback(payload.new);
          }
        )
        .subscribe();

      return subscription;
    } catch (error) {
      Logger.error('weatherService.subscribeToSpotWeather failed', error);
      throw new ServiceError('Failed to subscribe to weather', 'WEATHER_SUBSCRIBE_FAILED', error);
    }
  },

  // Helper: Get weather condition emoji
  getWeatherEmoji(weatherMain?: string): string {
    switch (weatherMain?.toLowerCase()) {
      case 'clear':
        return '☀️';
      case 'clouds':
        return '☁️';
      case 'rain':
      case 'drizzle':
        return '🌧️';
      case 'thunderstorm':
        return '⛈️';
      case 'snow':
        return '❄️';
      case 'mist':
      case 'smoke':
      case 'haze':
      case 'dust':
      case 'fog':
      case 'sand':
      case 'ash':
      case 'squall':
      case 'tornado':
        return '🌫️';
      default:
        return '🌤️';
    }
  },

  // Helper: Get skateability score (0-100)
  getSkateabilityScore(weather: any): number {
    let score = 75;  // Base score

    // Temperature (best 15-25°C)
    if (weather.temperature) {
      const temp = weather.temperature;
      if (temp < 0 || temp > 35) score -= 20;
      else if (temp < 5 || temp > 30) score -= 10;
    }

    // Precipitation reduces score
    if ((weather.precipitation ?? 0) > 0) {
      score -= 30;
    }

    // Rain in weather main
    if (weather.weather_main?.toLowerCase().includes('rain')) {
      score -= 25;
    }

    // Wind (over 20 m/s is not great for skating)
    if (weather.wind_speed && weather.wind_speed > 20) {
      score -= 15;
    }

    // Visibility issues
    if (weather.visibility && weather.visibility < 1000) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));  // Clamp 0-100
  },
};
