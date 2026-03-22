import json
import glob
import os

files = glob.glob("line_*.json")

lines_data = {}

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    line_name = data.get('tags', {}).get('name', 'Unknown')
    print(f"Processing {line_name}...")
    
    stations = []
    # In OSM relations, nodes with role stop/station represent the stations backwards or forwards
    # We also have members of type 'way' which represents the track. 
    # Let's extract station 'nodes'
    for member in data.get('members', []):
        if member['type'] == 'node' and member.get('role', '') in ['stop', 'station']:
            stations.append({
                'id': member.get('ref')
            })

    # We don't have lat/lon directly in the relation member unless out geom was fully complete. 
    # Let's check if 'lat' is there
    valid_stations = []
    if stations and 'lat' not in data.get('members', [])[0]:
        print(f"WARNING: no lat/lon in {file}")
        # Wait, out geom provides coordinates for ways, but what about nodes?
        for member in data.get('members', []):
            if member['type'] == 'node':
                if 'lat' in member:
                    valid_stations.append({
                        'name': 'Unknown Node', # Will need to fetch node details or use Wikipedia
                        'lat': member['lat'],
                        'lng': member['lon']
                    })
    
    print(f"Stations found: {len(valid_stations)}")
    
