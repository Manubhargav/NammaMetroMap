import json

with open("stations_data.json", "r") as f:
    stations = json.load(f)

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

green_order = [
    "Madavara", "Chikkabidarakallu", "Manjunathanagara", "Nagasandra", "Dasarahalli", "Jalahalli",
    "Peenya Industry", "Peenya", "Goraguntepalya", "Yeshwanthpur", "Sandal Soap Factory",
    "Mahalakshmi", "Rajajinagar", "Mahakavi Kuvempu Road", "Srirampura", "Mantri Square Sampige Road",
    "Nadaprabhu Kempegowda Station, Majestic", "Chickpete", "Krishna Rajendra Market", "National College",
    "Lalbagh", "South End Circle", "Jayanagar", "Rashtreeya Vidyalaya Road", "Banashankari",
    "Jaya Prakash Nagar", "Yelachenahalli", "Konanakunte Cross", "Doddakallasandra", "Vajarahalli",
    "Thalaghattapura", "Silk Institute"
]

yellow_order = [
    "Rashtreeya Vidyalaya Road", "Ragigudda", "Jayadeva Hospital", "BTM Layout", "Central Silk Board",
    "Bommanahalli", "Hongasandra", "Kudlu Gate", "Singasandra", "Hosa Road", "Beratena Agrahara",
    "Electronic City", "Infosys Foundation Konappana Agrahara", "Huskur Road", "Biocon Hebbagodi",
    "Bommasandra", "Delta Electronics Bommasandra"
]

routes = {
    'Purple': purple_order,
    'Green': green_order,
    'Yellow': yellow_order
}

# The stations are already properly formatted in stations_data.json, we just need to ensure we don't include Blue/Pink in lines
station_dict = {}
for s in stations:
    s['lines'] = [l for l in s['lines'] if l in ['Purple', 'Green', 'Yellow']]
    # Remove empty line arrays or fix Vijayanagar
    if s['name'] == 'Vijayanagar' and 'Green' in s['lines']:
        s['lines'].remove('Green')
    if len(s['lines']) > 0:
        station_dict[s['name']] = s

final_locations = list(station_dict.values())

with open('js/locations.js', 'w') as f:
    f.write('var metroRoutes = ' + json.dumps(routes, indent=2) + ';\n')
    f.write('var metroStations = ' + json.dumps(final_locations, indent=2) + ';')

print("Created locations.js with metroRoutes and cleaned up Blue/Pink lines.")
