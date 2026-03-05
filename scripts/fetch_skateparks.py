#!/usr/bin/env python3
"""
Fetch skateparks from OpenStreetMap using Overpass API
"""
import requests
import json
import time

def get_skateparks_by_state(state_name):
    """Fetch skateparks for a given state from OSM"""
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    query = f"""
    [out:json][timeout:60];
    area["name"="{state_name}"]["admin_level"="4"]->.searchArea;
    (
      node["leisure"="skatepark"](area.searchArea);
      way["leisure"="skatepark"](area.searchArea);
      node["leisure"="pitch"]["sport"="skateboard"](area.searchArea);
      way["leisure"="pitch"]["sport"="skateboard"](area.searchArea);
    );
    out center;
    """
    
    try:
        response = requests.get(overpass_url, params={'data': query}, timeout=90)
        response.raise_for_status()
        data = response.json()
        
        skateparks = []
        for element in data['elements']:
            tags = element.get('tags', {})
            
            # Get coordinates (nodes have lat/lon directly, ways need center)
            if element['type'] == 'node':
                lat = element.get('lat')
                lon = element.get('lon')
            else:
                center = element.get('center', {})
                lat = center.get('lat')
                lon = center.get('lon')
            
            if lat and lon:
                park = {
                    'id': f"osm-{element['type']}-{element['id']}",
                    'name': tags.get('name', f'Skatepark in {state_name}'),
                    'type': 'park',
                    'lat': lat,
                    'lng': lon
                }
                skateparks.append(park)
        
        print(f"✓ Found {len(skateparks)} skateparks in {state_name}")
        return skateparks
    
    except Exception as e:
        print(f"✗ Error fetching {state_name}: {e}")
        return []

# ALL 50 US STATES - comprehensive coverage
all_states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
    'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

print("Fetching skateparks from OpenStreetMap...")
print("Querying all 50 US states - this will take 5-10 minutes...\n")

all_parks = []
for i, state in enumerate(all_states, 1):
    print(f"[{i}/{len(all_states)}] {state}...", end=" ")
    parks = get_skateparks_by_state(state)
    all_parks.extend(parks)
    time.sleep(2)  # Be nice to the API

# Save to parks.json
with open('parks.json', 'w') as f:
    json.dump(all_parks, f, indent=2)

print(f"\n{'='*50}")
print(f"✓ Total skateparks fetched: {len(all_parks)}")
print(f"✓ Saved to parks.json")
print(f"{'='*50}")
