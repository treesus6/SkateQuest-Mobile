import { supabase } from '../lib/supabase';
import { SkateSpot, SpotPhoto, SpotCondition, Challenge } from '../types';

export async function getNearbySpots(lat: number, lng: number, radiusKm = 50) {
  const radiusMeters = radiusKm * 1000;

  const { data, error } = await supabase.rpc('get_nearby_spots', {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    // Fallback: load all spots if the RPC function doesn't exist
    const { data: allData, error: allError } = await supabase
      .from('skate_spots')
      .select('*')
      .limit(500);

    if (allError) throw allError;
    return (allData as SkateSpot[]) || [];
  }

  return (data as SkateSpot[]) || [];
}

export async function getSpotById(spotId: string) {
  const { data, error } = await supabase
    .from('skate_spots')
    .select('*')
    .eq('id', spotId)
    .single();

  if (error) throw error;
  return data as SkateSpot;
}

export async function getSpotPhotos(spotId: string) {
  const { data, error } = await supabase
    .from('spot_photos')
    .select(`*, media:media_id(*)`)
    .eq('spot_id', spotId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as SpotPhoto[]) || [];
}

export async function getSpotConditions(spotId: string) {
  const { data, error } = await supabase
    .from('spot_conditions')
    .select(`*, reporter:reported_by(username)`)
    .eq('spot_id', spotId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return (data as SpotCondition[]) || [];
}

export async function getSpotChallenges(spotId: string) {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('spot_id', spotId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data as Challenge[]) || [];
}

export async function createSpot(spot: {
  name: string;
  latitude: number;
  longitude: number;
  difficulty: string;
  spot_type: string;
  obstacles: string[];
  bust_risk: string | null;
  has_qr: boolean;
  tricks: string[];
  added_by: string;
}) {
  const { error } = await supabase.from('skate_spots').insert([spot]);
  if (error) throw error;
}

export async function reportCondition(spotId: string, userId: string, condition: string) {
  const { error } = await supabase.from('spot_conditions').insert([{
    spot_id: spotId,
    reported_by: userId,
    condition,
    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  }]);
  if (error) throw error;
}

export async function addSpotPhoto(spotId: string, mediaId: string, userId: string, isPrimary: boolean) {
  const { error } = await supabase.from('spot_photos').insert([{
    spot_id: spotId,
    media_id: mediaId,
    uploaded_by: userId,
    is_primary: isPrimary,
  }]);
  if (error) throw error;
}
