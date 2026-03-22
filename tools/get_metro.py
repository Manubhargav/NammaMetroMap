import requests
import json
import re

query = """
[out:json];
area["name"="Bengaluru"]->.searchArea;
relation["route"="subway"]["network"="Namma Metro"](area.searchArea);
out geom;
"""

response = requests.post("https://overpass-api.de/api/interpreter", data={"data": query})
data = response.json()

lines = {}
for element in data['elements']:
    tags = element.get('tags', {})
    name = tags.get('name', 'Unknown')
    color = tags.get('colour', 'Unknown')
    clean_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
    print(f"Found Line: {name} (Color: {color})")
    
    with open(f"line_{clean_name}.json", "w", encoding="utf-8") as f:
        json.dump(element, f, indent=2)

print("Check generated json files for details")
