import json

with open("stations_data.json", "r") as f:
    stations = json.load(f)

# Sort them exactly as they appear in the Bangalore Metro schematic map
# Purple Line (East to West)
purple_order = [
    "Whitefield (Kadugodi)", "Hopefarm Channasandra", "Kadugodi Tree Park", "Pattandur Agrahara",
    "Sri Sathya Sai Hospital", "Nallurahalli", "Kundalahalli", "Seetharampalya", "Hoodi",
    "Garudacharpalya", "Singayyanapalya", "Krishnarajapura", "Benniganahalli", "Baiyappanahalli",
    "Swami Vivekananda Road", "Indiranagar", "Halasuru", "Trinity", "Mahatma Gandhi Road",
    "Cubbon Park", "Dr. B. R. Ambedkar Station, Vidhana Soudha", "Sir M. Visvesvaraya Stn., Central College",
    "Nadaprabhu Kempegowda Station, Majestic", "Krantivira Sangolli Rayanna Railway Station", 
    "Magadi Road", "Sri Balagangadharanatha Swamiji Station, Hosahalli", "Vijayanagar", "Attiguppe",
    "Deepanjali Nagar", "Mysore Road", "Pantharapalya - Nayandahalli", "Rajarajeshwari Nagar",
    "Jnanabharathi", "Pattanagere", "Kengeri Bus Terminal", "Kengeri", "Challaghatta"
]

# Green Line (North to South)
green_order = [
    "Madavara", "Chikkabidarakallu", "Manjunathanagara", "Nagasandra", "Dasarahalli", "Jalahalli",
    "Peenya Industry", "Peenya", "Goraguntepalya", "Yeshwanthpur", "Sandal Soap Factory",
    "Mahalakshmi", "Rajajinagar", "Mahakavi Kuvempu Road", "Srirampura", "Mantri Square Sampige Road",
    "Nadaprabhu Kempegowda Station, Majestic", "Chickpete", "Krishna Rajendra Market", "National College",
    "Lalbagh", "South End Circle", "Jayanagar", "Rashtreeya Vidyalaya Road", "Banashankari",
    "Jaya Prakash Nagar", "Yelachenahalli", "Konanakunte Cross", "Doddakallasandra", "Vajarahalli",
    "Thalaghattapura", "Silk Institute"
]

# Yellow Line (North to South)
yellow_order = [
    "Rashtreeya Vidyalaya Road", "Ragigudda", "Jayadeva Hospital", "BTM Layout", "Central Silk Board",
    "Bommanahalli", "Hongasandra", "Kudlu Gate", "Singasandra", "Hosa Road", "Beratena Agrahara",
    "Electronic City", "Infosys Foundation Konappana Agrahara", "Huskur Road", "Biocon Hebbagodi",
    "Bommasandra", "Delta Electronics Bommasandra"
]

station_dict = {}
for s in stations:
    station_dict[s['name']] = s

print(f"Total parsed stations: {len(station_dict)}")

final_locations = []
added = set()

def add_line(stations_list, line_name):
    for name in stations_list:
        if name in station_dict:
            s_obj = station_dict[name]
            lines = s_obj.get('lines', [])
            if line_name not in lines:
                lines.append(line_name)
            
            # Clean up the lines field, only keep real lines, wait, if Majestic has Purple and Green, we keep both.
            s_obj['lines'] = list(set([l for l in lines if l in ['Purple', 'Green', 'Yellow', 'Pink', 'Blue']]))
            # Also overwrite the list lines of the station in the dict
            
            new_obj = {
                'name': name,
                'location': station_dict[name]['location'],
                'lines': s_obj['lines'],
                'address': ''
            }
            if name not in added:
                final_locations.append(new_obj)
                added.add(name)
        else:
            print(f"MISSING: {name}")

add_line(purple_order, "Purple")
add_line(green_order, "Green")
add_line(yellow_order, "Yellow")

with open('js/locations.js', 'w') as f:
    f.write('var metroStations = ' + json.dumps(final_locations, indent=2) + ';')

print(f"Generated {len(final_locations)} ordered stations.")
