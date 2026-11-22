// App Setup & Leaflet Integration
var map;
var markers = [];
var defaultCenter = [12.9716, 77.5946];

// CARTO Basemaps API keys (manage at https://dashboard.basemaps.carto.com).
// Client-side tile keys are public by design: the production key is restricted
// to the host manubhargav.github.io (Referer) so it cannot be used elsewhere.
// CARTO requires a SEPARATE key for localhost (a key listing localhost cannot
// also list public hosts). Paste one into CARTO_KEY_LOCAL for clean local dev;
// without it, local pages fall back to unkeyed (watermarked) tiles, not 403s.
var CARTO_KEY = 'cb1_5c4v_1_6e0ee0f67bbbe6bd8bfe8a7a';
var CARTO_KEY_LOCAL = 'cb1_5c4v_2_82fe5641d67b6e873c971dae';
var myViewModelInstance; // Global reference for tour trigger

// Assign locations from external file or default to empty
var locations = typeof metroStations !== 'undefined' ? metroStations : [];

// Polyline colors
var lineColors = {
    'Purple': '#ba68c8',
    'Green': '#4CAF50',
    'Yellow': '#ffff00'
};

// Common/local names that should also find a station (all lowercase).
var stationAliases = {
    'Mahatma Gandhi Road': ['mg road', 'mg rd'],
    'Krishnarajapura': ['kr puram', 'k r puram'],
    'Krantivira Sangolli Rayanna Railway Station': ['city railway station', 'bangalore city', 'bengaluru city', 'ksr'],
    'Nadaprabhu Kempegowda Station, Majestic': ['majestic', 'nadaprabhu', 'kempegowda'],
    'Central Silk Board': ['silk board', 'silkboard'],
    'Yeshwanthpur': ['yeshwantpur', 'yesvantpur'],
    'Rashtreeya Vidyalaya Road': ['rv road', 'r v road', 'vidyalaya road'],
    'Dr. B. R. Ambedkar Station, Vidhana Soudha': ['vidhana soudha', 'ambedkar'],
    'Sir M. Visvesvaraya Stn., Central College': ['central college', 'visvesvaraya'],
    'Sri Balagangadharanatha Swamiji Station, Hosahalli': ['hosahalli'],
    'Mantri Square Sampige Road': ['sampige road', 'mantri square'],
    'Mahakavi Kuvempu Road': ['kuvempu road'],
    'Nallurahalli': ['nallurhalli'],
    'Pantharapalya - Nayandahalli': ['nayandahalli'],
    'Infosys Foundation Konappana Agrahara': ['infosys', 'konappana agrahara'],
    'Delta Electronics Bommasandra': ['bommasandra', 'delta electronics'],
    'Rajarajeshwari Nagar': ['rr nagar'],
    'Vijayanagar': ['vijayanagara'],
    'Jnanabharathi': ['jnanabharati']
};

var polylinesGroup = L.layerGroup();
var markersGroup = L.layerGroup();

// Build ordered list of stations in exact transit line route order
var orderedNames = [];
if (typeof metroRoutes !== 'undefined') {
    if (metroRoutes.Purple) {
        metroRoutes.Purple.forEach(function (name) {
            if (!orderedNames.includes(name)) orderedNames.push(name);
        });
    }
    if (metroRoutes.Green) {
        metroRoutes.Green.forEach(function (name) {
            if (!orderedNames.includes(name)) orderedNames.push(name);
        });
    }
    if (metroRoutes.Yellow) {
        metroRoutes.Yellow.forEach(function (name) {
            if (!orderedNames.includes(name)) orderedNames.push(name);
        });
    }
}

$(document).ready(function () {
    // Initialize Leaflet Map
    map = L.map('map', {
        zoomControl: false // Move zoom control if needed, or disable to match previous minimal look
    }).setView(defaultCenter, 12);

    // Add Zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Positron Tiles for a cleaner, modern look.
    // Use the localhost key when running locally (the production key is
    // Referer-locked to manubhargav.github.io and 403s on localhost).
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
    var activeCartoKey = isLocal ? CARTO_KEY_LOCAL : CARTO_KEY;
    var cartoTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' +
        (activeCartoKey ? '?key=' + encodeURIComponent(activeCartoKey) : '');
    var minimalLayer = L.tileLayer(cartoTileUrl, {
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

    L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

    markersGroup.addTo(map);
    polylinesGroup.addTo(map);

    // Initialize map features
    initMapFeatures();

    // Activating Knockout with a global instance reference
    myViewModelInstance = new myViewModel();
    ko.applyBindings(myViewModelInstance);

    // Tab changes: update polyline emphasis and reframe once (not per keystroke)
    myViewModelInstance.activeTab.subscribe(function () {
        updatePolylineVisibility();
        fitToResults();
        // Slight delay to allow map zoom & layer updates to settle
        setTimeout(startOnboardingTour, 400);
    });

    // Initial map framing + onboarding tour on page load
    updatePolylineVisibility();
    fitToResults();
    setTimeout(startOnboardingTour, 600);

    // Open sidebar by default on larger screens; phones/tablets (<= 768px)
    // land on the map with the sidebar closed (responsive overlay + backdrop).
    if (window.innerWidth > 768) openview();
});

function initMapFeatures() {
    // Clear existing
    markersGroup.clearLayers();
    markers = [];

    // Create markers
    locations.forEach(function (loc) {
        // Create colorful dots instead of pins
        var primaryLineColor = lineColors[loc.lines[0]] || '#333';

        // Stylized dots for the two interchange stations (diagonal gradient division)
        var fillColor = primaryLineColor;
        if (loc.name === "Nadaprabhu Kempegowda Station, Majestic") {
            fillColor = "url(#purple-green-gradient)";
        } else if (loc.name === "Rashtreeya Vidyalaya Road") {
            fillColor = "url(#green-yellow-gradient)";
        }

        var marker = L.circleMarker([loc.location.lat, loc.location.lng], {
            radius: 8,
            fillColor: fillColor,
            color: '#000',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
        }).addTo(markersGroup);

        marker.title = loc.name;
        // Custom popup setup
        function onMarkerClick(e) {
            endOnboardingTour(); // Clicking ends onboarding tour
            populateInfoWindow(marker, loc);
        }
        marker.on('click', onMarkerClick);

        // Setup premium custom tooltip (autoClose: false allows multiple edge tooltips in tour)
        var lineNames = loc.lines.join(", ");
        var indicatorHtml = '';
        loc.lines.forEach(function (line) {
            var col = lineColors[line] || '#fff';
            indicatorHtml += `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${col}; margin-right:4px;"></span>`;
        });

        var tooltipContent = `
            <div class="tooltip-title">${loc.name}</div>
            <div style="display:flex; align-items:center; margin-bottom:4px; font-size:11px; color:#cbd5e1;">
                ${indicatorHtml} <span style="margin-left:2px;">${lineNames} Line${loc.lines.length > 1 ? 's' : ''}</span>
            </div>
            <div class="tooltip-hint">Click station for details</div>
        `;

        marker.bindTooltip(tooltipContent, {
            direction: 'top',
            className: 'station-tooltip',
            offset: [0, -8],
            opacity: 0.95,
            autoClose: false
        });

        // Add mouseover / mouseout with 250ms debounce for flicker-free bouncing
        marker.on('mouseover', function () {
            // Clear any pending mouseout timeout (debounce)
            if (loc.hoverTimeout) {
                clearTimeout(loc.hoverTimeout);
                loc.hoverTimeout = null;
            }

            endOnboardingTour(); // Hovering ends onboarding tour

            if (!marker.isPopupOpen()) {
                marker.openTooltip();

                // Dim any open popups to ensure hovered tooltip visibility
                $('.leaflet-popup').addClass('dimmed');

                var element = marker.getElement();
                if (element && !element.classList.contains('bounce-animation')) {
                    element.classList.add('bounce-animation');
                    $(element).one('animationend webkitAnimationEnd oAnimationEnd', function () {
                        element.classList.remove('bounce-animation');
                    });
                }
            }
        });

        marker.on('mouseout', function () {
            // Debounce: delay cleanup by 250ms to prevent flicker from bounce translation
            loc.hoverTimeout = setTimeout(function () {
                loc.hoverTimeout = null;
                marker.closeTooltip();

                // Restore open popup opacity
                $('.leaflet-popup').removeClass('dimmed');

                var element = marker.getElement();
                if (element) {
                    element.classList.remove('bounce-animation');
                }
            }, 250);
        });

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
    locations.forEach(function (loc) {
        locDict[loc.name] = [loc.location.lat, loc.location.lng];
    });

    if (typeof metroRoutes === 'undefined') return;

    for (var line in metroRoutes) {
        if (!lineColors[line]) continue;

        var orderedLatlngs = [];
        metroRoutes[line].forEach(function (stationName) {
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

// Polyline emphasis per active tab (routing handled by the journey planner)
function updatePolylineVisibility() {
    var activeLine = myViewModelInstance ? myViewModelInstance.activeTab() : 'explore';
    if (activeLine === 'routing') {
        if (map.hasLayer(polylinesGroup)) map.removeLayer(polylinesGroup);
        return;
    }
    if (!map.hasLayer(polylinesGroup)) map.addLayer(polylinesGroup);
    polylinesGroup.eachLayer(function (layer) {
        if (activeLine === 'explore') {
            layer.setStyle({ opacity: 0.7 });
            return;
        }
        var lineName = activeLine.charAt(0).toUpperCase() + activeLine.slice(1);
        layer.setStyle({ opacity: layer.options.color === lineColors[lineName] ? 1 : 0 });
    });
}

// Reframe the map on the current results. Called on tab change, Enter in search,
// and initial load; deliberately NOT while the user is typing.
function fitToResults() {
    if (!map || !myViewModelInstance) return;
    if (myViewModelInstance.activeTab() === 'routing') return;
    var bounds = myViewModelInstance.filterResults().map(function (loc) {
        return [loc.location.lat, loc.location.lng];
    });
    if (!bounds.length) return;
    var latLngBounds = L.latLngBounds(bounds);
    var center = latLngBounds.getCenter();
    var targetZoom = map.getBoundsZoom(latLngBounds, false, [80, 80]);

    // Subtract 1 zoom level for long-spanning lines to avoid cropping terminals
    if (myViewModelInstance.activeTab() === 'purple') {
        targetZoom = targetZoom - 1;
    }

    // Cap zoom to prevent over-zooming on search filters
    targetZoom = Math.min(targetZoom, 14);

    map.setView(center, targetZoom);
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
        success: function (response) {
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
        error: function () {
            marker.setPopupContent('<strong>' + loc.name + '</strong><br>Sorry, Wikipedia Information could not be loaded.');
        }
    });
}

function openview() {
    document.body.classList.add('sidebar-open');
    if (map) setTimeout(function () { map.invalidateSize(); }, 400);
}

function closeview() {
    document.body.classList.remove('sidebar-open');
    if (map) setTimeout(function () { map.invalidateSize(); }, 400);
}

// --> ViewModel
var myViewModel = function () {
    var self = this;

    self.locations = ko.observableArray(locations);
    self.query = ko.observable('').extend({ rateLimit: { timeout: 200, method: 'notifyWhenChangesStop' } });
    self.activeTab = ko.observable('explore'); // explore (all), purple, green, yellow
    self.lineColors = lineColors;

    self.hoverStation = function (place) {
        // Clear any pending mouseout timeout (debounce)
        if (place.hoverTimeout) {
            clearTimeout(place.hoverTimeout);
            place.hoverTimeout = null;
        }

        endOnboardingTour(); // Hovering ends the onboarding tour

        if (place.marker) {
            if (!place.marker.isPopupOpen()) {
                place.marker.openTooltip();

                // Dim any open popups to ensure hovered tooltip visibility
                $('.leaflet-popup').addClass('dimmed');

                var element = place.marker.getElement();
                if (element && !element.classList.contains('bounce-animation')) {
                    element.classList.add('bounce-animation');
                    $(element).one('animationend webkitAnimationEnd oAnimationEnd', function () {
                        element.classList.remove('bounce-animation');
                    });
                }
            }
        }
    };

    self.hoverStationOut = function (place) {
        // Debounce: delay cleanup by 250ms to prevent flicker
        place.hoverTimeout = setTimeout(function () {
            place.hoverTimeout = null;
            if (place.marker) {
                place.marker.closeTooltip();

                // Restore open popup opacity
                $('.leaflet-popup').removeClass('dimmed');

                var element = place.marker.getElement();
                if (element) {
                    element.classList.remove('bounce-animation');
                }
            }
        }, 250);
    };

    self.displayInfo = function (place) {
        endOnboardingTour(); // Clicking ends the onboarding tour

        // Find marker and open popup
        map.setView([place.location.lat, place.location.lng], 15);
        if (place.marker) {
            populateInfoWindow(place.marker, place);
        }
        if (window.innerWidth <= 768) closeview(); // auto close sidebar on phones/tablets
    };

    // Pure list filter: no map side effects (map updates live in separate reactions).
    self.filterResults = ko.pureComputed(function () {
        var activeLine = self.activeTab();
        var q = self.query().trim().toLowerCase();

        var filteredList = ko.utils.arrayFilter(self.locations(), function (loc) {
            // Check line tab
            if (activeLine === 'routing') return false; // Hidden in routing view
            if (activeLine === 'purple' && !loc.lines.includes("Purple")) return false;
            if (activeLine === 'green' && !loc.lines.includes("Green")) return false;
            if (activeLine === 'yellow' && !loc.lines.includes("Yellow")) return false;

            if (!q) return true;
            if (loc.name.toLowerCase().indexOf(q) > -1) return true;
            if (loc.nameKn && loc.nameKn.indexOf(q) > -1) return true;
            var aliases = stationAliases[loc.name] || [];
            for (var i = 0; i < aliases.length; i++) {
                if (aliases[i].indexOf(q) > -1) return true;
            }
            return false;
        });

        // Group & Sort logically based on exact route sequence
        var orderList = orderedNames;
        if (typeof metroRoutes !== 'undefined') {
            if (activeLine === 'purple' && metroRoutes.Purple) orderList = metroRoutes.Purple;
            else if (activeLine === 'green' && metroRoutes.Green) orderList = metroRoutes.Green;
            else if (activeLine === 'yellow' && metroRoutes.Yellow) orderList = metroRoutes.Yellow;
        }
        filteredList.sort(function (a, b) {
            return orderList.indexOf(a.name) - orderList.indexOf(b.name);
        });

        return filteredList;
    });

    // Marker visibility follows the filtered list (debounced via query), but the
    // map camera never moves here: reframing happens on tab change / Enter / click.
    self.visibleMarkers = ko.computed(function () {
        var list = self.filterResults();
        var visible = {};
        list.forEach(function (loc) { visible[loc.name] = true; });
        locations.forEach(function (loc) {
            if (!loc.marker) return;
            var shouldShow = !!visible[loc.name];
            if (shouldShow && !markersGroup.hasLayer(loc.marker)) markersGroup.addLayer(loc.marker);
            if (!shouldShow && markersGroup.hasLayer(loc.marker)) markersGroup.removeLayer(loc.marker);
        });
        return list.length;
    });

    self.resultCountText = ko.pureComputed(function () {
        var n = self.filterResults().length;
        var line = self.activeTab();
        var text = n + (n === 1 ? ' station' : ' stations');
        if (line !== 'explore' && line !== 'routing') {
            text += ' on ' + line.charAt(0).toUpperCase() + line.slice(1);
        }
        if (self.query()) text += ' matching \u201c' + self.query() + '\u201d';
        return text;
    });
};

// Passive Onboarding Tour Helpers & Management
var tourActive = false;

function getLineEndpoints(line) {
    if (typeof metroRoutes === 'undefined' || !metroRoutes[line]) return [];
    var route = metroRoutes[line];
    var activeNames = locations.map(function (loc) { return loc.name; });

    // Find the first active station in the route
    var startNode = null;
    for (var i = 0; i < route.length; i++) {
        if (activeNames.includes(route[i])) {
            startNode = route[i];
            break;
        }
    }

    // Find the last active station in the route
    var endNode = null;
    for (var j = route.length - 1; j >= 0; j--) {
        if (activeNames.includes(route[j]) && route[j] !== startNode) {
            endNode = route[j];
            break;
        }
    }

    var endpoints = [];
    if (startNode) endpoints.push(startNode);
    if (endNode) endpoints.push(endNode);
    return endpoints;
}

function startOnboardingTour() {
    // End any existing tour tooltips first
    endOnboardingTour();

    var activeLine = myViewModelInstance ? myViewModelInstance.activeTab() : 'explore';
    var endpointsToShow = [];

    if (activeLine === 'explore') {
        // Show endpoints of all lines
        endpointsToShow = endpointsToShow.concat(getLineEndpoints('Purple'));
        endpointsToShow = endpointsToShow.concat(getLineEndpoints('Green'));
        endpointsToShow = endpointsToShow.concat(getLineEndpoints('Yellow'));
    } else {
        // Show endpoints of the selected line
        var capitalizeLine = activeLine.charAt(0).toUpperCase() + activeLine.slice(1);
        endpointsToShow = getLineEndpoints(capitalizeLine);
    }

    // Unique list
    endpointsToShow = [...new Set(endpointsToShow)];

    // Open the tooltips
    locations.forEach(function (loc) {
        if (loc.marker && endpointsToShow.includes(loc.name)) {
            // Only open if the marker is currently visible on the map
            if (markersGroup.hasLayer(loc.marker)) {
                loc.marker.openTooltip();
                tourActive = true;
            }
        }
    });
}

function endOnboardingTour() {
    if (!tourActive) return;
    tourActive = false;
    locations.forEach(function (loc) {
        if (loc.marker) {
            loc.marker.closeTooltip();
        }
    });
}
