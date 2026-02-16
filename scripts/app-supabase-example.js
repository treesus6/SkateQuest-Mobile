// Example: SkateQuest with Supabase
// This shows how to migrate key sections of app.js to use Supabase

import {
  signInAnonymously,
  onAuthStateChanged,
  getProfile,
  createProfile,
  updateProfile,
  incrementUserXP,
  getAllSpots,
  addSpot,
  getAllShops,
  addShop,
  getAllCrews,
  createCrew,
  getAllEvents,
  getUserSessions,
  createSession,
  subscribeToProfile,
  subscribeToSpots,
  serverTimestamp,
  escapeHtml,
} from './supabase-helpers.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase initialization
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (window.supabaseClient) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  const supabase = window.supabaseClient;
  console.log('✓ Supabase client ready');

  // ===== AUTHENTICATION =====
  let currentUserId = null;
  let userProfile = {};

  // Sign in anonymously on load
  try {
    const { user } = await signInAnonymously();
    console.log('✓ Signed in anonymously', user.id);
  } catch (error) {
    console.error('Auth error:', error);
  }

  // Listen for auth changes
  onAuthStateChanged(async user => {
    if (user) {
      currentUserId = user.id;
      console.log('User authenticated:', currentUserId);

      // Load or create profile
      let profile = await getProfile(currentUserId);

      if (!profile) {
        // Create new profile
        profile = await createProfile(currentUserId, {
          username: `Skater${Math.floor(Math.random() * 10000)}`,
          xp: 0,
          level: 1,
          spots_added: 0,
          challenges_completed: 0,
        });
        console.log('✓ Profile created', profile);
      }

      userProfile = profile;

      // Subscribe to profile changes
      subscribeToProfile(currentUserId, updatedProfile => {
        userProfile = updatedProfile;
        console.log('Profile updated:', updatedProfile);
      });

      // Enable UI
      document.querySelectorAll('nav button').forEach(b => (b.disabled = false));
    }
  });

  // ===== SKATE SPOTS =====
  let skateSpots = [];

  async function loadSpots() {
    try {
      skateSpots = await getAllSpots();
      console.log(`✓ Loaded ${skateSpots.length} spots`);
      renderSpots();
    } catch (error) {
      console.error('Error loading spots:', error);
    }
  }

  // Subscribe to real-time spot changes
  subscribeToSpots(payload => {
    if (payload.eventType === 'INSERT') {
      skateSpots.push(payload.new);
      console.log('New spot added:', payload.new);
    } else if (payload.eventType === 'UPDATE') {
      const index = skateSpots.findIndex(s => s.id === payload.new.id);
      if (index !== -1) skateSpots[index] = payload.new;
    } else if (payload.eventType === 'DELETE') {
      skateSpots = skateSpots.filter(s => s.id !== payload.old.id);
    }
    renderSpots();
  });

  function renderSpots() {
    // Your spot rendering logic here
    console.log('Rendering spots...', skateSpots.length);
  }

  // ===== ADD SPOT =====
  async function addNewSpot(spotData) {
    try {
      const newSpot = await addSpot({
        name: spotData.name,
        latitude: spotData.latitude,
        longitude: spotData.longitude,
        difficulty: spotData.difficulty,
        type: spotData.type,
        tricks: spotData.tricks,
        added_by: currentUserId,
        created_at: serverTimestamp(),
      });

      // Increment user's spots count
      await incrementSpotsAdded(currentUserId);

      // Award XP
      await incrementUserXP(currentUserId, 100);

      console.log('✓ Spot added:', newSpot);
      return newSpot;
    } catch (error) {
      console.error('Error adding spot:', error);
      throw error;
    }
  }

  // ===== CREWS =====
  let allCrews = [];

  async function loadCrews() {
    try {
      allCrews = await getAllCrews();
      console.log(`✓ Loaded ${allCrews.length} crews`);
    } catch (error) {
      console.error('Error loading crews:', error);
    }
  }

  async function createNewCrew(name, tag, bio) {
    try {
      const crew = await createCrew({
        name,
        tag,
        bio,
        founder_id: currentUserId,
        founder_name: userProfile.username,
        members: [currentUserId],
        member_names: [userProfile.username],
        total_xp: userProfile.xp || 0,
        created_at: serverTimestamp(),
      });

      // Update user profile with crew
      await updateProfile(currentUserId, {
        crew_id: crew.id,
        crew_tag: tag,
      });

      console.log('✓ Crew created:', crew);
      return crew;
    } catch (error) {
      console.error('Error creating crew:', error);
      throw error;
    }
  }

  // ===== SESSIONS =====
  async function startSession() {
    try {
      await updateProfile(currentUserId, {
        active_session: {
          start_time: serverTimestamp(),
          spots_visited: [],
          tricks_attempted: 0,
          tricks_landed: 0,
        },
      });

      console.log('✓ Session started');
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  async function endSession() {
    if (!userProfile.active_session) return;

    try {
      const startTime = new Date(userProfile.active_session.start_time);
      const endTime = new Date();
      const duration = Math.floor((endTime - startTime) / 1000);

      // Save session
      await createSession({
        user_id: currentUserId,
        start_time: userProfile.active_session.start_time,
        end_time: serverTimestamp(),
        duration,
        spots_visited: userProfile.active_session.spots_visited || [],
        tricks_attempted: userProfile.active_session.tricks_attempted || 0,
        tricks_landed: userProfile.active_session.tricks_landed || 0,
        xp_earned: Math.min(Math.floor(duration / 60) * 5, 200),
      });

      // Clear active session
      await updateProfile(currentUserId, {
        active_session: null,
      });

      // Award XP
      const sessionXP = Math.min(Math.floor(duration / 60) * 5, 200);
      await incrementUserXP(currentUserId, sessionXP);

      console.log(`✓ Session ended: ${duration}s, +${sessionXP} XP`);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async function loadSessionHistory() {
    try {
      const sessions = await getUserSessions(currentUserId, 10);
      console.log(`✓ Loaded ${sessions.length} sessions`);
      return sessions;
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  // ===== SHOPS =====
  async function loadShops() {
    try {
      const shops = await getAllShops();
      console.log(`✓ Loaded ${shops.length} shops`);
      return shops;
    } catch (error) {
      console.error('Error loading shops:', error);
      return [];
    }
  }

  // ===== EVENTS =====
  async function loadEvents() {
    try {
      const events = await getAllEvents();
      console.log(`✓ Loaded ${events.length} upcoming events`);
      return events;
    } catch (error) {
      console.error('Error loading events:', error);
      return [];
    }
  }

  // ===== INITIALIZE APP =====
  await loadSpots();
  await loadCrews();

  console.log('✓ SkateQuest initialized with Supabase!');
});
