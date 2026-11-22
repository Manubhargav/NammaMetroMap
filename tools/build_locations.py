"""Build js/locations.js from committed raw OSM data. Replaces the keyword-matching
pipeline (fetch_stations.py / sort_metro.py / fix_routes.py), which dropped stations
whose OSM node tags did not match its hardcoded keyword lists.

Inputs (all committed, fully offline build):
  - tools/raw_data/line_*.json           Full-direction OSM route relations (stop order).
  - tools/raw_data/station_nodes.json    Node id -> {lat, lon, name, nameKn} for every
                                         stop in those relations (fetched once from the
                                         OSM main API /api/0.6/nodes multi-fetch).

Route-order arrays below are the source of truth for sequence and official English
names. Yellow Line is 16 stations (Wikipedia + OSM agree); an earlier revision of
this data carried a phantom "Bommasandra" station between Biocon Hebbagodi and
Delta Electronics Bommasandra, which does not exist.

Validation gate: positional zip per line, alias-normalized name equality, Bengaluru
bbox, unique names, interchange sets, and name:kn coverage. Any failure aborts the
build before js/locations.js is touched.
"""

import json
import os
import sys
from typing import NoReturn

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw_data")
OUT = os.path.join(HERE, "..", "js", "locations.js")

RELATION_FILES = {
    "Purple": "line_Purple_Line__Whitefield__Kadugodi____Challaghatta_.json",
    "Green": "line_Green_Line__Madavara____Silk_Institute_.json",
    "Yellow": "line_Yellow_Line__Rashtreeya_Vidyalaya_Road___Delta_Electronics_Bommasandra_.json",
}

PURPLE_ORDER = [
    "Whitefield (Kadugodi)", "Hopefarm Channasandra", "Kadugodi Tree Park", "Pattandur Agrahara",
    "Sri Sathya Sai Hospital", "Nallurahalli", "Kundalahalli", "Seetharampalya", "Hoodi",
    "Garudacharpalya", "Singayyanapalya", "Krishnarajapura", "Benniganahalli", "Baiyappanahalli",
    "Swami Vivekananda Road", "Indiranagar", "Halasuru", "Trinity", "Mahatma Gandhi Road",
    "Cubbon Park", "Dr. B. R. Ambedkar Station, Vidhana Soudha", "Sir M. Visvesvaraya Stn., Central College",
    "Nadaprabhu Kempegowda Station, Majestic", "Krantivira Sangolli Rayanna Railway Station",
    "Magadi Road", "Sri Balagangadharanatha Swamiji Station, Hosahalli", "Vijayanagar", "Attiguppe",
    "Deepanjali Nagar", "Mysore Road", "Pantharapalya - Nayandahalli", "Rajarajeshwari Nagar",
    "Jnanabharathi", "Pattanagere", "Kengeri Bus Terminal", "Kengeri", "Challaghatta",
]

GREEN_ORDER = [
    "Madavara", "Chikkabidarakallu", "Manjunathanagara", "Nagasandra", "Dasarahalli", "Jalahalli",
    "Peenya Industry", "Peenya", "Goraguntepalya", "Yeshwanthpur", "Sandal Soap Factory",
    "Mahalakshmi", "Rajajinagar", "Mahakavi Kuvempu Road", "Srirampura", "Mantri Square Sampige Road",
    "Nadaprabhu Kempegowda Station, Majestic", "Chickpete", "Krishna Rajendra Market", "National College",
    "Lalbagh", "South End Circle", "Jayanagar", "Rashtreeya Vidyalaya Road", "Banashankari",
    "Jaya Prakash Nagar", "Yelachenahalli", "Konanakunte Cross", "Doddakallasandra", "Vajarahalli",
    "Thalaghattapura", "Silk Institute",
]

YELLOW_ORDER = [
    "Rashtreeya Vidyalaya Road", "Ragigudda", "Jayadeva Hospital", "BTM Layout", "Central Silk Board",
    "Bommanahalli", "Hongasandra", "Kudlu Gate", "Singasandra", "Hosa Road", "Beratena Agrahara",
    "Electronic City", "Infosys Foundation Konappana Agrahara", "Huskur Road", "Biocon Hebbagodi",
    "Delta Electronics Bommasandra",
]

ROUTES = {"Purple": PURPLE_ORDER, "Green": GREEN_ORDER, "Yellow": YELLOW_ORDER}

# OSM name -> curated name (line qualifier suffixes and spelling variants).
ALIASES = {
    "Nadaprabhu Kempegowda Station, Majestic (Purple Line)": "Nadaprabhu Kempegowda Station, Majestic",
    "Nadaprabhu Kempegowda Station, Majestic (Green Line)": "Nadaprabhu Kempegowda Station, Majestic",
    "Sri Balagangadharanatha Swamiji Stn., Hosahalli": "Sri Balagangadharanatha Swamiji Station, Hosahalli",
    "Vijayanagara": "Vijayanagar",
    "Yeshwantpur": "Yeshwanthpur",
}

EXPECTED_INTERCHANGES = {
    "Nadaprabhu Kempegowda Station, Majestic": {"Purple", "Green"},
    "Rashtreeya Vidyalaya Road": {"Green", "Yellow"},
}

# Bengaluru metro area sanity bbox.
BBOX = (12.70, 77.35, 13.20, 77.85)  # latMin, lngMin, latMax, lngMax


def fail(msg) -> NoReturn:
    print("BUILD FAILED: " + msg, file=sys.stderr)
    sys.exit(1)


def load_stops(line):
    path = os.path.join(RAW, RELATION_FILES[line])
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [m for m in data["members"] if m["type"] == "node" and m.get("role") in ("stop", "station")]


def main():
    with open(os.path.join(RAW, "station_nodes.json"), encoding="utf-8") as f:
        nodes = json.load(f)

    stations = {}  # curated name -> station dict (first line wins coordinates)
    for line in ("Purple", "Green", "Yellow"):
        stops = load_stops(line)
        order = ROUTES[line]
        if len(stops) != len(order):
            fail(f"{line}: relation has {len(stops)} stops, curated route has {len(order)}")
        for idx, (member, expected) in enumerate(zip(stops, order)):
            node = nodes.get(str(member["ref"]))
            if node is None:
                fail(f"{line}[{idx}] {expected}: node {member['ref']} missing from station_nodes.json")
            osm_name = node["name"]
            normalized = ALIASES.get(osm_name, osm_name)
            if normalized != expected:
                fail(f"{line}[{idx}]: OSM name {osm_name!r} does not reconcile with curated {expected!r}")
            lat, lng = node["lat"], node["lon"]
            if not (BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lng <= BBOX[3]):
                fail(f"{line}[{idx}] {expected}: coordinates {lat},{lng} outside Bengaluru bbox")
            if expected in stations:
                stations[expected]["lines"].append(line)
            else:
                stations[expected] = {
                    "name": expected,
                    "location": {"lat": lat, "lng": lng},
                    "lines": [line],
                    "address": "",
                    "nameKn": node.get("nameKn", ""),
                }

    ordered = []
    seen = set()
    for line in ("Purple", "Green", "Yellow"):
        for name in ROUTES[line]:
            if name not in seen:
                seen.add(name)
                ordered.append(stations[name])

    if len(ordered) != 83:
        fail(f"expected 83 unique stations, built {len(ordered)}")
    for name, lines in EXPECTED_INTERCHANGES.items():
        actual = set(stations[name]["lines"])
        if actual != lines:
            fail(f"interchange {name}: expected {sorted(lines)}, got {sorted(actual)}")
    missing_kn = [s["name"] for s in ordered if not s["nameKn"]]
    if len(ordered) - len(missing_kn) < 80:
        fail(f"name:kn coverage unexpectedly low: {len(ordered) - len(missing_kn)}/83")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("var metroRoutes = " + json.dumps(ROUTES, indent=2, ensure_ascii=False) + ";\n")
        f.write("var metroStations = " + json.dumps(ordered, indent=2, ensure_ascii=False) + ";\n")

    print(f"Wrote {os.path.normpath(OUT)}")
    print(f"Stations: {len(ordered)} (Purple {len(PURPLE_ORDER)}, Green {len(GREEN_ORDER)}, Yellow {len(YELLOW_ORDER)})")
    print(f"name:kn coverage: {len(ordered) - len(missing_kn)}/{len(ordered)}")
    if missing_kn:
        print("Without Kannada name:", ", ".join(missing_kn))
    print("Integrity gate: PASS (names reconciled, bbox, unique, interchanges)")


if __name__ == "__main__":
    main()
