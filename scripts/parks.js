/**
 * SkateQuest Parks Data Loader
 * Loads skatepark data from parks.json
 */

async function loadParksData() {
  try {
    // Fetch from root directory, not data/ subdirectory
    const res = await fetch('parks.json', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const parks = await res.json();
    console.log(`✓ Loaded ${parks.length} skateparks`);
    return parks;
  } catch (e) {
    console.error('Failed to load parks.json', e);
    return [];
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.loadParksData = loadParksData;
}
