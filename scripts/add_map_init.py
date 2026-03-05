#!/usr/bin/env python3
with open('main.js', 'r') as f:
    content = f.read()

# Find the DOMContentLoaded line
old_code = '''document.addEventListener('DOMContentLoaded', function() {
    const spotSelect = document.getElementById('spot-select');'''

new_code = '''document.addEventListener('DOMContentLoaded', function() {
    // Initialize Leaflet map
    window.map = L.map('map').setView([39.8283, -98.5795], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(window.map);
    console.log('✓ Map initialized');
    
    const spotSelect = document.getElementById('spot-select');'''

content = content.replace(old_code, new_code)

with open('main.js', 'w') as f:
    f.write(content)

print("✓ Map initialization added to main.js")
