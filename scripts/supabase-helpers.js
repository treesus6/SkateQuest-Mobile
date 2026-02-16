// Supabase Helper Functions for SkateQuest
// Makes Supabase work like Firebase for easier migration

// Get Supabase client from window
const getSupabase = () => window.supabaseClient;
const appId = () => window.appId || 'skatequest';

// ===== AUTH HELPERS =====

export async function signInAnonymously() {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return { user: data.user };
}

export function onAuthStateChanged(callback) {
  const supabase = getSupabase();

  // Check current session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(session?.user || null);
  });

  // Listen for changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  return subscription;
}

// ===== PROFILE HELPERS =====

export async function getProfile(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function createProfile(userId, profileData) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      ...profileData,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const supabase = getSupabase();
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

  if (error) throw error;
}

export async function incrementUserXP(userId, amount) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('increment_xp', {
    user_id: userId,
    amount: amount,
  });

  if (error) {
    // Fallback if RPC doesn't exist
    const profile = await getProfile(userId);
    await updateProfile(userId, { xp: (profile.xp || 0) + amount });
  }
}

export async function incrementSpotsAdded(userId) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('increment_spots_added', {
    user_id: userId,
  });

  if (error) {
    const profile = await getProfile(userId);
    await updateProfile(userId, { spots_added: (profile.spots_added || 0) + 1 });
  }
}

// ===== SKATE SPOTS HELPERS =====

export async function getAllSpots() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('skate_spots')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addSpot(spotData) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('skate_spots').insert(spotData).select().single();

  if (error) throw error;
  return data;
}

// ===== SHOPS HELPERS =====

export async function getAllShops() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('shops').select('*');

  if (error) throw error;
  return data || [];
}

export async function addShop(shopData) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('shops').insert(shopData).select().single();

  if (error) throw error;
  return data;
}

// ===== CREWS HELPERS =====

export async function getAllCrews() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .order('total_xp', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCrewById(crewId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('crews').select('*').eq('id', crewId).single();

  if (error) throw error;
  return data;
}

export async function createCrew(crewData) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('crews').insert(crewData).select().single();

  if (error) throw error;
  return data;
}

export async function addMemberToCrew(crewId, userId, username) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('add_crew_member', {
    crew_id: crewId,
    user_id: userId,
    username: username,
  });

  if (error) {
    // Fallback
    const crew = await getCrewById(crewId);
    const { error: updateError } = await supabase
      .from('crews')
      .update({
        members: [...(crew.members || []), userId],
        member_names: [...(crew.member_names || []), username],
      })
      .eq('id', crewId);

    if (updateError) throw updateError;
  }
}

export async function removeMemberFromCrew(crewId, userId) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('remove_crew_member', {
    crew_id: crewId,
    user_id: userId,
  });

  if (error) {
    // Fallback
    const crew = await getCrewById(crewId);
    const { error: updateError } = await supabase
      .from('crews')
      .update({
        members: (crew.members || []).filter(id => id !== userId),
        member_names: (crew.member_names || []).filter((_, i) => crew.members[i] !== userId),
      })
      .eq('id', crewId);

    if (updateError) throw updateError;
  }
}

export async function deleteCrew(crewId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('crews').delete().eq('id', crewId);

  if (error) throw error;
}

// ===== EVENTS HELPERS =====

export async function getAllEvents() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('datetime', new Date().toISOString())
    .order('datetime', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createEvent(eventData) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('events').insert(eventData).select().single();

  if (error) throw error;
  return data;
}

export async function updateEvent(eventId, updates) {
  const supabase = getSupabase();
  const { error } = await supabase.from('events').update(updates).eq('id', eventId);

  if (error) throw error;
}

// ===== SESSIONS HELPERS =====

export async function getUserSessions(userId, limit = 10) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('end_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function createSession(sessionData) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('sessions').insert(sessionData).select().single();

  if (error) throw error;
  return data;
}

// ===== TRICK CALLOUTS HELPERS =====

export async function getTrickCallouts(userId) {
  const supabase = getSupabase();

  const { data: sent, error: sentError } = await supabase
    .from('trick_callouts')
    .select('*')
    .eq('challenger_id', userId);

  const { data: received, error: receivedError } = await supabase
    .from('trick_callouts')
    .select('*')
    .eq('target_id', userId);

  if (sentError || receivedError) throw sentError || receivedError;

  return {
    sent: sent || [],
    received: received || [],
  };
}

export async function createTrickCallout(calloutData) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trick_callouts')
    .insert(calloutData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ===== STORAGE HELPERS =====

export async function uploadImage(bucket, fileName, file) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function uploadVideo(bucket, fileName, blob) {
  return uploadImage(bucket, fileName, blob);
}

// ===== REAL-TIME SUBSCRIPTIONS =====

export function subscribeToProfile(userId, callback) {
  const supabase = getSupabase();

  const channel = supabase
    .channel(`profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      payload => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToSpots(callback) {
  const supabase = getSupabase();

  const channel = supabase
    .channel('spots-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'skate_spots',
      },
      payload => {
        callback(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToShops(callback) {
  const supabase = getSupabase();

  const channel = supabase
    .channel('shops-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shops',
      },
      payload => {
        callback(payload);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ===== UTILITY FUNCTIONS =====

export function serverTimestamp() {
  return new Date().toISOString();
}

export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export all for easy import
export default {
  signInAnonymously,
  onAuthStateChanged,
  getProfile,
  createProfile,
  updateProfile,
  incrementUserXP,
  incrementSpotsAdded,
  getAllSpots,
  addSpot,
  getAllShops,
  addShop,
  getAllCrews,
  getCrewById,
  createCrew,
  addMemberToCrew,
  removeMemberFromCrew,
  deleteCrew,
  getAllEvents,
  createEvent,
  updateEvent,
  getUserSessions,
  createSession,
  getTrickCallouts,
  createTrickCallout,
  uploadImage,
  uploadVideo,
  subscribeToProfile,
  subscribeToSpots,
  subscribeToShops,
  serverTimestamp,
  escapeHtml,
};
