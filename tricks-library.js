// Comprehensive Skateboard Tricks Library
// Organized by difficulty level

const TRICKS_LIBRARY = {
  beginner: [
    { id: 'ollie', name: 'Ollie', category: 'Basic', difficulty: 1 },
    { id: 'push', name: 'Push', category: 'Basic', difficulty: 1 },
    { id: 'manual', name: 'Manual', category: 'Balance', difficulty: 1 },
    { id: 'kickturn', name: 'Kickturn', category: 'Basic', difficulty: 1 },
    { id: 'fs180', name: 'Frontside 180', category: 'Rotation', difficulty: 2 },
    { id: 'bs180', name: 'Backside 180', category: 'Rotation', difficulty: 2 },
    { id: 'pop-shuvit', name: 'Pop Shuvit', category: 'Shuvit', difficulty: 2 },
    { id: 'nollie', name: 'Nollie', category: 'Basic', difficulty: 2 },
    { id: 'fakie-ollie', name: 'Fakie Ollie', category: 'Basic', difficulty: 2 },
    { id: '50-50', name: '50-50 Grind', category: 'Grind', difficulty: 2 },
    { id: 'boardslide', name: 'Boardslide', category: 'Slide', difficulty: 2 },
  ],
  intermediate: [
    { id: 'kickflip', name: 'Kickflip', category: 'Flip', difficulty: 3 },
    { id: 'heelflip', name: 'Heelflip', category: 'Flip', difficulty: 3 },
    { id: 'fs-shuvit', name: 'Frontside Shuvit', category: 'Shuvit', difficulty: 3 },
    { id: 'bs-shuvit', name: 'Backside Shuvit', category: 'Shuvit', difficulty: 3 },
    { id: 'fs-180-kickflip', name: 'FS 180 Kickflip', category: 'Flip', difficulty: 4 },
    { id: 'bs-180-kickflip', name: 'BS 180 Kickflip', category: 'Flip', difficulty: 4 },
    { id: 'varial-kickflip', name: 'Varial Kickflip', category: 'Flip', difficulty: 4 },
    { id: 'varial-heelflip', name: 'Varial Heelflip', category: 'Flip', difficulty: 4 },
    { id: '5-0', name: '5-0 Grind', category: 'Grind', difficulty: 3 },
    { id: 'nosegrind', name: 'Nosegrind', category: 'Grind', difficulty: 3 },
    { id: 'crooked-grind', name: 'Crooked Grind', category: 'Grind', difficulty: 4 },
    { id: 'smith-grind', name: 'Smith Grind', category: 'Grind', difficulty: 4 },
    { id: 'feeble-grind', name: 'Feeble Grind', category: 'Grind', difficulty: 4 },
    { id: 'nose-manual', name: 'Nose Manual', category: 'Balance', difficulty: 3 },
    { id: 'lipslide', name: 'Lipslide', category: 'Slide', difficulty: 4 },
    { id: 'noseslide', name: 'Noseslide', category: 'Slide', difficulty: 3 },
    { id: 'tailslide', name: 'Tailslide', category: 'Slide', difficulty: 3 },
  ],
  advanced: [
    { id: 'tre-flip', name: 'Tre Flip (360 Flip)', category: 'Flip', difficulty: 5 },
    { id: 'hardflip', name: 'Hardflip', category: 'Flip', difficulty: 5 },
    { id: 'inward-heelflip', name: 'Inward Heelflip', category: 'Flip', difficulty: 5 },
    { id: 'laser-flip', name: 'Laser Flip', category: 'Flip', difficulty: 6 },
    { id: 'bigflip', name: 'Bigflip', category: 'Flip', difficulty: 5 },
    { id: 'bigspin', name: 'Bigspin', category: 'Rotation', difficulty: 4 },
    { id: 'fs-360', name: 'Frontside 360', category: 'Rotation', difficulty: 5 },
    { id: 'bs-360', name: 'Backside 360', category: 'Rotation', difficulty: 5 },
    { id: 'nollie-flip', name: 'Nollie Flip', category: 'Flip', difficulty: 5 },
    { id: 'fakie-flip', name: 'Fakie Flip', category: 'Flip', difficulty: 4 },
    { id: 'switch-flip', name: 'Switch Flip', category: 'Flip', difficulty: 6 },
    { id: 'bluntslide', name: 'Bluntslide', category: 'Slide', difficulty: 5 },
    { id: 'noseblunt-slide', name: 'Noseblunt Slide', category: 'Slide', difficulty: 5 },
    { id: 'salad-grind', name: 'Salad Grind', category: 'Grind', difficulty: 5 },
    { id: 'suski-grind', name: 'Suski Grind', category: 'Grind', difficulty: 5 },
    { id: 'overcrook', name: 'Overcrook', category: 'Grind', difficulty: 5 },
    { id: 'hurricane', name: 'Hurricane', category: 'Grind', difficulty: 6 },
  ],
  expert: [
    { id: 'fs-flip', name: 'Frontside Flip', category: 'Flip', difficulty: 6 },
    { id: 'bs-flip', name: 'Backside Flip', category: 'Flip', difficulty: 6 },
    { id: 'nollie-tre', name: 'Nollie Tre Flip', category: 'Flip', difficulty: 7 },
    { id: 'switch-tre', name: 'Switch Tre Flip', category: 'Flip', difficulty: 7 },
    { id: 'fakie-tre', name: 'Fakie Tre Flip', category: 'Flip', difficulty: 6 },
    { id: 'double-flip', name: 'Double Kickflip', category: 'Flip', difficulty: 7 },
    { id: 'triple-flip', name: 'Triple Kickflip', category: 'Flip', difficulty: 8 },
    { id: 'impossible', name: 'Impossible', category: 'Wrap', difficulty: 6 },
    { id: 'casper-flip', name: 'Casper Flip', category: 'Flip', difficulty: 7 },
    { id: 'hospital-flip', name: 'Hospital Flip', category: 'Flip', difficulty: 7 },
    { id: 'gazelle-flip', name: 'Gazelle Flip', category: 'Flip', difficulty: 8 },
    { id: '540-flip', name: '540 Flip', category: 'Flip', difficulty: 9 },
    { id: 'fs-540', name: 'Frontside 540', category: 'Rotation', difficulty: 7 },
    { id: 'bs-540', name: 'Backside 540', category: 'Rotation', difficulty: 7 },
    { id: '720', name: '720', category: 'Rotation', difficulty: 8 },
  ],
};

// Get all tricks as flat array
function getAllTricks() {
  return [
    ...TRICKS_LIBRARY.beginner,
    ...TRICKS_LIBRARY.intermediate,
    ...TRICKS_LIBRARY.advanced,
    ...TRICKS_LIBRARY.expert,
  ];
}

// Get tricks by difficulty level
function getTricksByLevel(level) {
  return TRICKS_LIBRARY[level] || [];
}

// Get trick by ID
function getTrickById(id) {
  const allTricks = getAllTricks();
  return allTricks.find(trick => trick.id === id);
}

// Export for use in app
if (typeof window !== 'undefined') {
  window.TRICKS_LIBRARY = TRICKS_LIBRARY;
  window.getAllTricks = getAllTricks;
  window.getTricksByLevel = getTricksByLevel;
  window.getTrickById = getTrickById;
}
