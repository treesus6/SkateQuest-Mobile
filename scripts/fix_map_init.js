// Map initialization code to inject at the start of DOMContentLoaded

// Initialize Leaflet map
window.map = L.map('map').setView([39.8283, -98.5795], 4); // Center of USA

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
}).addTo(window.map);

// Make map globally available
window.L = L;

console.log('✓ Map initialized');
