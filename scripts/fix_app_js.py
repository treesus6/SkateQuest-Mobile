#!/usr/bin/env python3
with open('app.js', 'r') as f:
    content = f.read()

# Remove the broken .addTo(map) line and just use window.map instead
old_code = '''    let map;
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        }).addTo(map);

        // Expose map globally for error recovery
        window.map = map;'''

new_code = '''    let map;
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }

        // Use the map created in main.js
        map = window.map;
        
        if (!map) {
            throw new Error('Map not initialized in main.js');
        }

        // Expose map globally for error recovery
        window.map = map;'''

content = content.replace(old_code, new_code)

with open('app.js', 'w') as f:
    f.write(content)

print("✓ Fixed app.js to use map from main.js")
