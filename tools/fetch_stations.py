import requests
import json

query = """
[out:json];
area["name"="Bengaluru"]->.searchArea;
node["railway"="station"]["network"="Namma Metro"](area.searchArea);
out body;
"""

response = requests.post("https://overpass-api.de/api/interpreter", data={"data": query})
data = response.json()

stations = []
purple_keywords = ["Whitefield", "Kadugodi", "Hopefarm", "Channasandra", "Pattandur", "Sadarmangala", "Nallurhalli", "Kundalahalli", "Seetharamapalya", "Hoodi", "Garudacharapalya", "Singayyanapalya", "Krishnarajapura", "Benniganahalli", "Baiyappanahalli", "Swami Vivekananda Road", "Indiranagar", "Halasuru", "Trinity", "Mahatma Gandhi Road", "Cubbon Park", "Vidhana Soudha", "Sir M. Visveshwaraya", "Majestic", "City Railway Station", "Magadi Road", "Hosahalli", "Vijayanagar", "Attiguppe", "Deepanjali Nagar", "Mysuru Road", "Pantharapalya - Nayandahalli", "Rajarajeshwari Nagar", "Jnanabharathi", "Pattanagere", "Kengeri Bus Terminal", "Kengeri", "Challaghatta", "Nadaprabhu Kempegowda", "Krantivira Sangolli Rayanna"]
green_keywords = ["Madavara", "Chikkabidarakallu", "Manjunathanagar", "Nagasandra", "Dasarahalli", "Jalahalli", "Peenya Industry", "Peenya", "Goraguntepalya", "Yeshwanthpur", "Sandal Soap Factory", "Mahalakshmi", "Rajajinagar", "Kuvempu Road", "Srirampura", "Mantri Square Sampige Road", "Majestic", "Chickpete", "Krishna Rajendra Market", "National College", "Lalbagh", "South End Circle", "Jayanagar", "Rashtreeya Vidyalaya Road", "Banashankari", "Jaya Prakash Nagar", "Yelachenahalli", "Konanakunte Cross", "Doddakallasandra", "Vajarahalli", "Thalaghattapura", "Silk Institute", "Nadaprabhu Kempegowda"]
yellow_keywords = ["Rashtreeya Vidyalaya Road", "Ragigudda", "Jayadeva Hospital", "BTM Layout", "Central Silk Board", "Bommanahalli", "Hongasandra", "Kudlu Gate", "Singasandra", "Hosa Road", "Beratena Agrahara", "Electronic City", "Infosys Foundation Konappana Agrahara", "Huskur Road", "Biocon Hebbagodi", "Bommasandra", "Delta Electronics"]
pink_keywords = ["Kalena Agrahara", "Hulimavu", "IIMB", "JP Nagar 4th Phase", "Jayadeva Hospital", "Swagath Road Cross", "Dairy Circle", "Lakkasandra", "Langford Town", "Rashtriya Military School", "MG Road", "Shivajinagar", "Cantonment", "Pottery Town", "Tannery Road", "Venkateshpura", "Kadugondanahalli", "Nagawara"]
blue_keywords = ["Silk Board", "HSR Layout", "Agara", "Iblur", "Bellandur", "Kadubeesanahalli", "Kodibisanahalli", "Marathahalli", "ISRO", "Doddanekundi", "DRDO", "Saraswathi Nagar", "KR Puram", "Kasturi Nagar", "Horamavu", "Babusapalaya", "Kalyan Nagar", "HBR Layout", "Nagawara", "Veerannapalya", "Kempapura", "Hebbal", "Kodigehalli", "Jakkur Cross", "Yelahanka", "Bagalur Cross", "Bettahalasuru", "Doddajala", "Airport City", "KIAL Terminals"]

for element in data['elements']:
    name = element.get('tags', {}).get('name', 'Unknown')
    if name == 'Unknown': continue
    lat = element['lat']
    lon = element['lon']
    
    lines = []
    nl = name.lower()
    for kw in purple_keywords:
        if kw.lower() in nl:
            lines.append("Purple")
            break
    for kw in green_keywords:
        if kw.lower() in nl:
            lines.append("Green")
            break
    for kw in yellow_keywords:
        if kw.lower() in nl:
            lines.append("Yellow")
            break
    for kw in pink_keywords:
        if kw.lower() in nl:
            lines.append("Pink")
            break
    for kw in blue_keywords:
        if kw.lower() in nl:
            lines.append("Blue")
            break
    
    # default to Purple if nothing matched but it's a metro station
    if not lines:
        lines.append("Purple")
        
    stations.append({
        'name': name,
        'location': {'lat': lat, 'lng': lon},
        'lines': lines,
        'address': ''
    })

with open("stations_data.json", "w") as f:
    json.dump(stations, f, indent=2)

print(f"Extracted {len(stations)} stations")
