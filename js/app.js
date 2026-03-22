// App Setup & Leaflet Integration
var map;
var markers = [];
var defaultCenter = [12.9716, 77.5946];

// Assign locations from external file or default to empty
var locations = typeof metroStations !== 'undefined' ? metroStations : [];

// Polyline colors
var lineColors = {
    'Purple': '#ba68c8',
    'Green': '#4CAF50',
    'Yellow': '#ffff00'
};

var polylinesGroup = L.layerGroup();
var markersGroup = L.layerGroup();

$(document).ready(function() {
    // Initialize Leaflet Map
    map = L.map('map', {
        zoomControl: false // Move zoom control if needed, or disable to match previous minimal look
    }).setView(defaultCenter, 12);
    
    // Add Zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Positron Tiles for a cleaner, modern look
    var minimalLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors © CARTO'
    });
    
    // Standard OSM
    var standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    });
    
    // Satellite
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    minimalLayer.addTo(map);

    function buildThumbnail(color, text) {
        return `<div style="display:inline-block; margin-right:5px; vertical-align:middle;">
                  <div style="width:24px; height:24px; background:${color}; border-radius:4px; border:1px solid #ccc; font-size:10px; line-height:24px; text-align:center; color:${text.length > 3 ? '#fff' : '#333'}; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
                    ${text}
                  </div>
                </div>`;
    }

    var baseMaps = {};
    baseMaps[buildThumbnail('#eee', 'Min') + " <b>Minimal</b>"] = minimalLayer;
    baseMaps[buildThumbnail('#a5c09e', 'Str') + " <b>Streets</b>"] = standardLayer;
    baseMaps[buildThumbnail('#3b4d40', 'Sat') + " <b>Satellite</b>"] = satelliteLayer;

    L.control.layers(baseMaps, null, {position: 'bottomright'}).addTo(map);

    markersGroup.addTo(map);
    polylinesGroup.addTo(map);

    // Initialize map features
    initMapFeatures();

    // Activating Knockout
    ko.applyBindings(new myViewModel());
});

function initMapFeatures() {
    // Clear existing
    markersGroup.clearLayers();
    markers = [];

    // Create markers
    locations.forEach(function(loc) {
        // Create colorful dots instead of pins
        var primaryLineColor = lineColors[loc.lines[0]] || '#333';
        var marker = L.circleMarker([loc.location.lat, loc.location.lng], {
            radius: 8,
            fillColor: primaryLineColor,
            color: '#000',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
        }).addTo(markersGroup);

        marker.title = loc.name;
        // Custom popup setup
        function onMarkerClick(e) {
            populateInfoWindow(marker, loc);
        }
        marker.on('click', onMarkerClick);
        
        loc.marker = marker;
        markers.push(marker);
        marker.addTo(markersGroup);
    });

    drawPolylines();
}

function drawPolylines() {
    polylinesGroup.clearLayers();
    
    // Convert current locations array into a fast lookup dictionary
    var locDict = {};
    locations.forEach(function(loc) {
        locDict[loc.name] = [loc.location.lat, loc.location.lng];
    });

    if (typeof metroRoutes === 'undefined') return;

    for (var line in metroRoutes) {
        if (!lineColors[line]) continue;
        
        var orderedLatlngs = [];
        metroRoutes[line].forEach(function(stationName) {
            if (locDict[stationName]) {
                orderedLatlngs.push(locDict[stationName]);
            }
        });

        if (orderedLatlngs.length > 1) {
            var pline = L.polyline(orderedLatlngs, {
                color: lineColors[line],
                weight: 5,
                opacity: 0.7
            });
            pline.addTo(polylinesGroup);
        }
    }
}

// Function to Create the Infowindows that contain additional information
function populateInfoWindow(marker, loc) {
    if (marker.isPopupOpen()) return;
    
    var popupContent = '<div><strong>' + loc.name + '</strong></div><em>Station Lines: ' + loc.lines.join(", ") + '</em><div>Loading info...</div>';
    marker.bindPopup(popupContent).openPopup();

    var searchTerm = loc.name + ' metro station, Bangalore';
    var wikipediaURL = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(searchTerm) + '&gsrlimit=1&prop=extracts&exintro&explaintext&format=json&origin=*';
    
    $.ajax({
        url: wikipediaURL,
        dataType: "json",
        success: function(response) {
            var pages = response.query && response.query.pages;
            var content = "No detailed Wikipedia summary available for this station.";
            var finalTitle = searchTerm.replace(/ /g, "_");
            if (pages) {
                var pageId = Object.keys(pages)[0];
                if (pageId != "-1" && pages[pageId].extract) {
                    content = pages[pageId].extract.substring(0, 300) + '...';
                    finalTitle = pages[pageId].title.replace(/ /g, "_");
                }
            }
            var link = "https://en.wikipedia.org/wiki/" + encodeURIComponent(finalTitle);
            
            var newContent = '<strong>' + loc.name + '</strong><br><em>Lines: ' + loc.lines.join(", ") + '</em><br><p style="margin:8px 0; font-size:13px;">' + content + '</p><a href="' + link + '" target="_blank">Related Wiki</a>';
            marker.setPopupContent(newContent);
            if (marker.isPopupOpen() && marker.getPopup()) {
                marker.getPopup().update();
            }
        },
        error: function() {
            marker.setPopupContent('<strong>' + loc.name + '</strong><br>Sorry, Wikipedia Information could not be loaded.');
        }
    });
}

function openview() {
    var sidebarWidth = "400px";
    document.getElementById("sidebar").style.width = sidebarWidth;
    if (window.innerWidth > 600) {
        document.getElementById("map").style.marginLeft = sidebarWidth;
    }
}

function closeview() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("map").style.marginLeft = "0";
}

// --> ViewModel
var myViewModel = function() {
    var self = this;
    
    self.locations = ko.observableArray(locations);
    self.query = ko.observable('');
    self.activeTab = ko.observable('explore'); // explore (all), purple, green, yellow
    
    self.displayInfo = function(place) {
        // Find marker and open popup
        map.setView([place.location.lat, place.location.lng], 15);
        if (place.marker) {
            populateInfoWindow(place.marker, place);
        }
        if (window.innerWidth < 600) closeview(); // auto close sidebar on mobile
    };
    
    self.filterResults = ko.computed(function() {
        var activeLine = self.activeTab();
        var q = self.query().toLowerCase();
        
        var bounds = [];
        var filteredList = ko.utils.arrayFilter(self.locations(), function(loc) {
            // Check text query
            var textMatch = loc.name.toLowerCase().indexOf(q) > -1;
            
            // Check line tab
            var tabMatch = true;
            if (activeLine === 'purple') tabMatch = loc.lines.includes("Purple");
            else if (activeLine === 'green') tabMatch = loc.lines.includes("Green");
            else if (activeLine === 'yellow') tabMatch = loc.lines.includes("Yellow");
            else if (activeLine === 'routing') tabMatch = false; // Hide from list in routing view
            
            var isVisible = textMatch && tabMatch;
            
            if (loc.marker) {
                if (isVisible) {
                    if (!markersGroup.hasLayer(loc.marker)) markersGroup.addLayer(loc.marker);
                    bounds.push([loc.location.lat, loc.location.lng]);
                } else {
                    if (markersGroup.hasLayer(loc.marker)) markersGroup.removeLayer(loc.marker);
                }
            }
            
            return isVisible;
        });

        // Hide/Show Polylines based on active tab
        if (activeLine === 'routing') {
            if (map.hasLayer(polylinesGroup)) map.removeLayer(polylinesGroup);
        } else if (activeLine === 'explore') {
            if (!map.hasLayer(polylinesGroup)) map.addLayer(polylinesGroup);
            polylinesGroup.eachLayer(function(layer) { layer.setStyle({opacity: 0.7}); });
        } else {
            if (!map.hasLayer(polylinesGroup)) map.addLayer(polylinesGroup);
            polylinesGroup.eachLayer(function(layer) {
                // Determine if this polyline matches the active tab's color
                if (layer.options.color === lineColors[activeLine.charAt(0).toUpperCase() + activeLine.slice(1)]) {
                    layer.setStyle({opacity: 1});
                } else {
                    layer.setStyle({opacity: 0});
                }
            });
        }

        // Fit map bounds if there are visible markers and we are not in routing tab
        if (bounds.length > 0 && map && activeLine !== 'routing') {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
        
        return filteredList;
    });
};
