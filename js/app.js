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
var locationsByName = {};
locations.forEach(function (loc) { locationsByName[loc.name] = loc; });

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

    // Basemap failure fallback: repeated tile errors switch to keyless Streets
    // (covers 127.0.0.1 where the localhost-only CARTO key is rejected) and
    // surface a toast instead of failing silently.
    var tileErrorCount = 0;
    function onBasemapTileError() {
        tileErrorCount++;
        if (tileErrorCount !== 3) return;
        if (map.hasLayer(minimalLayer)) {
            map.removeLayer(minimalLayer);
            map.addLayer(standardLayer);
            showMapToast('CARTO tiles unavailable. Switched to Streets.');
        } else {
            showMapToast('Basemap tiles unavailable. Station list and search still work.');
        }
    }
    minimalLayer.on('tileerror', onBasemapTileError);
    standardLayer.on('tileerror', onBasemapTileError);
    satelliteLayer.on('tileerror', onBasemapTileError);

    markersGroup.addTo(map);
    polylinesGroup.addTo(map);

    // Initialize map features
    initMapFeatures();

    // Activating Knockout with a global instance reference
    myViewModelInstance = new myViewModel();
    ko.applyBindings(myViewModelInstance);

    // Deep links: ?line= restores the tab, ?station= opens a station popup
    var urlParams = new URLSearchParams(location.search);
    var lineToTab = { purple: 'purple', green: 'green', yellow: 'yellow', all: 'explore', explore: 'explore', route: 'routing', routing: 'routing' };
    var requestedLine = (urlParams.get('line') || '').toLowerCase();
    if (lineToTab[requestedLine]) myViewModelInstance.activeTab(lineToTab[requestedLine]);

    // Tab changes: update polyline emphasis, reframe once, sync ?line=
    myViewModelInstance.activeTab.subscribe(function () {
        updatePolylineVisibility();
        fitToResults();
        replaceUrlParams(function (params) {
            var tab = myViewModelInstance.activeTab();
            if (tab === 'explore') params.delete('line');
            else params.set('line', tab);
            // Leaving the planner clears its deep-link params
            if (tab !== 'routing') { params.delete('from'); params.delete('to'); }
        });

        var tab = myViewModelInstance.activeTab();
        if (tab === 'routing' && myViewModelInstance.routeResult()) {
            drawRouteHighlight(myViewModelInstance.routeResult().path);
        } else {
            routeHighlight.clearLayers();
            if (map.hasLayer(routeHighlight)) map.removeLayer(routeHighlight);
        }
        refreshStationLabels();
        updateRouteEndpointLabels();
        updateMarkerSizes();
        // Reveal the map after choosing a view on phones/tablets
        if (window.innerWidth <= 768) closeview();
    });

    // Initial map framing on page load
    updatePolylineVisibility();
    fitToResults();

    var requestedStation = urlParams.get('station');

    // Auto tour only on the very first visit; replay anytime via the ? button.
    if (!requestedStation && !localStorage.getItem('nammaTourSeen')) {
        setTimeout(function () {
            localStorage.setItem('nammaTourSeen', '1');
            startOnboardingTour();
        }, 600);
    }

    // ?station= deep link: center and open the station popup on load
    if (requestedStation) {
        var target = null;
        for (var i = 0; i < locations.length; i++) {
            if (stationSlug(locations[i].name) === requestedStation) { target = locations[i]; break; }
        }
        if (target) {
            map.setView([target.location.lat, target.location.lng], 14);
            populateInfoWindow(target.marker, target);
        }
    }

    // Closing the popup clears the station from the URL
    map.on('popupclose', function () {
        replaceUrlParams(function (params) { params.delete('station'); });
    });

    // Zoomed-in views label every visible station; zoomed-out views keep the
    // endpoint + interchange baseline labels
    map.on('zoomend', function () {
        refreshStationLabels();
        updateMarkerSizes();
    });
    map.on('moveend', clampAllOpenTooltips);

    // ?from=&to= deep link: run the journey planner on load
    var fromParam = urlParams.get('from');
    var toParam = urlParams.get('to');
    if (fromParam && toParam) {
        var fromLoc = null, toLoc = null;
        locations.forEach(function (loc) {
            if (stationSlug(loc.name) === fromParam) fromLoc = loc;
            if (stationSlug(loc.name) === toParam) toLoc = loc;
        });
        if (fromLoc && toLoc) {
            myViewModelInstance.activeTab('routing');
            myViewModelInstance.routeFrom(fromLoc.name);
            myViewModelInstance.routeTo(toLoc.name);
            myViewModelInstance.findRoute();
        }
    }

    // Open sidebar by default on larger screens; phones/tablets (<= 768px)
    // land on the map with the sidebar closed (responsive overlay + backdrop).
    if (window.innerWidth > 768) openview();

    // Keep clicks inside popups from reaching the map: otherwise Leaflet's
    // closePopupOnClick closes the popup when its Retry/Copy buttons are used.
    map.on('popupopen', function (e) {
        var el = e.popup.getElement();
        if (el) L.DomEvent.disableClickPropagation(el);
    });

    // Safety net for tooltips that still overflow the map after Leaflet's
    // automatic direction choice (mostly narrow phone viewports)
    map.on('tooltipopen', function (e) {
        requestAnimationFrame(function () { clampTooltipIntoView(e.tooltip); });
    });

    // Tab list keyboard navigation (Left/Right arrows, roving tabindex)
    document.querySelector('.tabs').addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        var tabs = Array.prototype.map.call(document.querySelectorAll('.tab-btn'), function (b) { return b.dataset.tab; });
        var current = tabs.indexOf(myViewModelInstance.activeTab());
        var delta = event.key === 'ArrowRight' ? 1 : -1;
        var next = (current + delta + tabs.length) % tabs.length;
        myViewModelInstance.activeTab(tabs[next]);
        document.querySelectorAll('.tab-btn')[next].focus();
    });

    // Escape: close the open popup first, then the sidebar (not while typing)
    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (map && map._popup && map._popup.isOpen && map._popup.isOpen()) {
            map.closePopup();
            return;
        }
        var fromInput = /^(INPUT|TEXTAREA)$/.test(event.target.tagName);
        if (!fromInput && document.body.classList.contains('sidebar-open')) closeview();
    });
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
        marker.stationLoc = loc;
        // Custom popup setup
        function onMarkerClick(e) {
            endOnboardingTour(); // Clicking ends onboarding tour
            populateInfoWindow(marker, loc);
        }
        marker.on('click', onMarkerClick);

        // Setup premium custom tooltip (autoClose: false allows multiple edge tooltips in tour)
        marker.bindTooltip(buildTooltipContent(loc), {
            // 'auto' flips left/right so endpoint tooltips never clip at map edges
            direction: 'auto',
            className: 'station-tooltip',
            offset: [8, 0],
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
        // Markers stay pointer-only: the station list is the keyboard path
        var pathEl = marker.getElement();
        if (pathEl) pathEl.setAttribute('tabindex', '-1');
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
        // Journey planner: keep a dimmed network behind the route highlight
        if (!map.hasLayer(polylinesGroup)) map.addLayer(polylinesGroup);
        polylinesGroup.eachLayer(function (layer) { layer.setStyle({ opacity: 0.25 }); });
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

// Kannada / English display helpers (nameKn sourced from OSM name:kn, 83/83 coverage)
function displayPrimary(loc) {
    return myViewModelInstance && myViewModelInstance.kannada() && loc.nameKn ? loc.nameKn : loc.name;
}

function buildTooltipContent(loc) {
    var lineNames = loc.lines.join(", ");
    var indicatorHtml = '';
    loc.lines.forEach(function (line) {
        var col = lineColors[line] || '#fff';
        indicatorHtml += `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${col}; margin-right:4px;"></span>`;
    });
    var secondary = myViewModelInstance && myViewModelInstance.kannada() && loc.nameKn ?
        `<div class="tooltip-sub">${loc.name}</div>` : '';
    return `
        <div class="tooltip-title">${displayPrimary(loc)}</div>
        ${secondary}
        <div style="display:flex; align-items:center; margin-bottom:4px; font-size:11px; color:#cbd5e1;">
            ${indicatorHtml} <span style="margin-left:2px;">${lineNames} Line${loc.lines.length > 1 ? 's' : ''}</span>
        </div>
        <div class="tooltip-hint">Click station for details</div>
    `;
}

// Rebuild tooltips and the open popup title when the language toggles
function refreshStationLanguage() {
    locations.forEach(function (loc) {
        if (loc.marker) loc.marker.setTooltipContent(buildTooltipContent(loc));
    });
    updateRouteEndpointLabels();
    if (map && map._popup && map._popup.getElement) {
        var el = map._popup.getElement();
        var marker = map._popup._source;
        var loc = marker && marker.stationLoc;
        if (el && loc) {
            var strong = el.querySelector('.station-popup strong');
            if (strong) {
                strong.textContent = displayPrimary(loc);
                var secondary = el.querySelector('.popup-secondary');
                if (myViewModelInstance.kannada() && loc.nameKn) {
                    if (!secondary) {
                        secondary = document.createElement('div');
                        secondary.className = 'popup-secondary';
                        strong.after(secondary);
                    }
                    secondary.textContent = loc.name;
                } else if (secondary) {
                    secondary.remove();
                }
            }
        }
    }
}

// Station popups: safe HTML building, validated Wikipedia content, retry on failure
var wikiRequestToken = 0;

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function trimToSentence(text, maxLen) {
    if (text.length <= maxLen) return text;
    var slice = text.slice(0, maxLen);
    var lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'));
    if (lastStop >= 80) return slice.slice(0, lastStop + 1);
    var lastSpace = slice.lastIndexOf(' ');
    return slice.slice(0, lastSpace > 0 ? lastSpace : maxLen) + '…';
}

function popupHeaderHtml(loc) {
    var chips = loc.lines.map(function (line) {
        var textColor = line === 'Yellow' ? '#333' : '#fff';
        return '<span class="line-chip" style="background:' + lineColors[line] + ';color:' + textColor + '">' +
            escapeHtml(line) + '</span>';
    }).join('');
    var interchange = loc.lines.length > 1 ? '<span class="interchange-badge">Interchange</span>' : '';
    var secondary = myViewModelInstance && myViewModelInstance.kannada() && loc.nameKn ?
        '<div class="popup-secondary">' + escapeHtml(loc.name) + '</div>' : '';
    return '<strong>' + escapeHtml(displayPrimary(loc)) + '</strong>' + secondary +
        '<div class="popup-chips">' + chips + interchange + '</div>' +
        '<button type="button" class="popup-copy">Copy link</button>';
}

function setPopupBody(marker, loc, bodyHtml) {
    marker.setPopupContent('<div class="station-popup">' + popupHeaderHtml(loc) +
        '<div class="popup-body">' + bodyHtml + '</div></div>');
    if (marker.isPopupOpen() && marker.getPopup()) marker.getPopup().update();
    wirePopupActions(marker, loc);
}

// Wire popup buttons after each content replacement (Leaflet rebuilds the DOM).
function wirePopupActions(marker, loc) {
    setTimeout(function () {
        var popup = marker.getPopup();
        var el = popup && popup.getElement();
        if (!el) return;
        var retry = el.querySelector('.popup-retry');
        if (retry) {
            retry.addEventListener('click', function () {
                setPopupBody(marker, loc, 'Loading info…');
                loadWikiIntoPopup(marker, loc);
            });
        }
        var copy = el.querySelector('.popup-copy');
        if (copy) {
            copy.addEventListener('click', function () { copyStationLink(loc, copy); });
        }
    }, 0);
}

function copyStationLink(loc, btn) {
    var params = new URLSearchParams(location.search);
    params.set('station', stationSlug(loc.name));
    var url = location.origin + location.pathname + '?' + params.toString();
    function done() {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy link'; }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url, done); });
    } else {
        fallbackCopy(url, done);
    }
}

function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable: leave label */ }
    ta.remove();
}

// Accept only articles that are plausibly about THIS station in Bengaluru:
// never the generic network article, never an unrelated search hit (e.g. the
// Dallas "Trinity Railway Express"). Token match ignores spaces/punctuation so
// "Indiranagar" matches the article "Indira Nagar metro station (Bengaluru)".
function isStationArticle(title, extract, loc) {
    var t = title.toLowerCase();
    if (t === 'namma metro' || t === 'bengaluru metro' || t.indexOf('list of namma metro') === 0) return false;
    if (t.indexOf('metro') === -1 && t.indexOf('station') === -1 && t.indexOf('railway') === -1) return false;
    var compactTitle = t.replace(/[^a-z0-9]/g, '');
    var tokens = loc.name.toLowerCase().replace(/[.,()]/g, '').split(/\s+/).filter(function (w) { return w.length >= 4; });
    var nameMatches = tokens.some(function (w) { return compactTitle.indexOf(w) > -1; });
    if (!nameMatches) return false;
    var contextText = (t + ' ' + String(extract || '').slice(0, 600).toLowerCase());
    return contextText.indexOf('namma') > -1 || contextText.indexOf('bengaluru') > -1 || contextText.indexOf('bangalore') > -1;
}

function fetchStationWiki(loc, onDone) {
    var attempts = [
        loc.name + ' metro station, Bangalore',
        '"' + loc.name + '" metro station'
    ];
    function attempt(idx) {
        // Several rank-ordered candidates per attempt: Wikipedia's top hit is
        // often the network or neighbourhood article, the station article is next.
        var url = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
            encodeURIComponent(attempts[idx]) + '&gsrlimit=4&prop=extracts&exintro&explaintext&format=json&origin=*';
        $.ajax({ url: url, dataType: 'json', timeout: 8000 })
            .done(function (response) {
                var pages = response.query && response.query.pages;
                var candidates = pages ? Object.keys(pages).map(function (k) { return pages[k]; })
                    .filter(function (p) { return p && p.extract; })
                    .sort(function (a, b) { return (a.index || 0) - (b.index || 0); }) : [];
                var match = null;
                for (var i = 0; i < candidates.length; i++) {
                    if (isStationArticle(candidates[i].title, candidates[i].extract, loc)) { match = candidates[i]; break; }
                }
                if (match) {
                    onDone({ status: 'ok', title: match.title, extract: match.extract });
                } else if (idx + 1 < attempts.length) {
                    attempt(idx + 1);
                } else {
                    onDone({ status: 'none' });
                }
            })
            .fail(function () { onDone({ status: 'error' }); });
    }
    attempt(0);
}

function loadWikiIntoPopup(marker, loc) {
    var token = ++wikiRequestToken;
    fetchStationWiki(loc, function (result) {
        if (token !== wikiRequestToken) return; // a newer station request superseded this one
        if (!marker.isPopupOpen()) return;      // user moved on
        if (result.status === 'ok') {
            var text = trimToSentence(result.extract, 300);
            var link = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(result.title.replace(/ /g, '_'));
            setPopupBody(marker, loc,
                '<p class="popup-extract">' + escapeHtml(text) + '</p>' +
                '<a class="popup-wiki-link" href="' + link + '" target="_blank" rel="noopener noreferrer">Read on Wikipedia</a>');
        } else if (result.status === 'none') {
            setPopupBody(marker, loc,
                '<p class="popup-extract">No station article found on Wikipedia.</p>' +
                '<a class="popup-wiki-link" href="https://en.wikipedia.org/w/index.php?search=' +
                encodeURIComponent(loc.name + ' metro station') + '" target="_blank" rel="noopener noreferrer">Search Wikipedia</a>');
        } else {
            setPopupBody(marker, loc,
                '<p class="popup-error">Wikipedia information could not be loaded. Check your connection and try again.</p>' +
                '<button type="button" class="popup-retry">Retry</button>');
        }
    });
}

// Function to Create the Infowindows that contain additional information
function populateInfoWindow(marker, loc) {
    if (marker.isPopupOpen()) return;
    marker.bindPopup('<div class="station-popup">' + popupHeaderHtml(loc) +
        '<div class="popup-body">Loading info…</div></div>', {
            // A map click (including clicks bubbling from popup buttons) must not
            // dismiss the popup mid-request. Close via the X, Esc, or another station.
            closeOnClick: false
        }).openPopup();
    wirePopupActions(marker, loc);
    updateStationUrl(loc);
    loadWikiIntoPopup(marker, loc);
}

// Shareable station links: slug + URL helpers (history.replaceState, no scroll jump)
function stationSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function replaceUrlParams(mutator) {
    var params = new URLSearchParams(location.search);
    mutator(params);
    var qs = params.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
}

function updateStationUrl(loc) {
    replaceUrlParams(function (params) { params.set('station', stationSlug(loc.name)); });
}

// Basemap toast notification
function showMapToast(message) {
    var toast = document.getElementById('map-toast');
    document.getElementById('map-toast-text').textContent = message;
    toast.style.display = 'flex';
}

function hideMapToast() {
    document.getElementById('map-toast').style.display = 'none';
}

function openview() {
    document.body.classList.add('sidebar-open');
    var sidebar = document.getElementById('sidebar');
    sidebar.removeAttribute('inert');
    sidebar.setAttribute('aria-hidden', 'false');
    if (map) setTimeout(function () { map.invalidateSize(); }, 400);
}

function closeview() {
    document.body.classList.remove('sidebar-open');
    var sidebar = document.getElementById('sidebar');
    // Keep hidden sidebar controls out of the tab order and accessibility tree
    sidebar.setAttribute('inert', '');
    sidebar.setAttribute('aria-hidden', 'true');
    if (map) setTimeout(function () { map.invalidateSize(); }, 400);
}

// Journey planner: station graph + Dijkstra over (station, line) states.
// Cost = hops, with a transfer penalty so fewest transfers wins ties.
var routeGraph = null;
var routeHighlight = L.layerGroup();

function buildRouteGraph() {
    if (routeGraph) return routeGraph;
    var adj = {};
    Object.keys(metroRoutes).forEach(function (line) {
        var stops = metroRoutes[line];
        for (var i = 0; i < stops.length - 1; i++) {
            var a = stops[i], b = stops[i + 1];
            (adj[a] = adj[a] || []).push({ to: b, line: line });
            (adj[b] = adj[b] || []).push({ to: a, line: line });
        }
    });
    routeGraph = adj;
    return adj;
}

function resolveStationName(input) {
    var q = (input || '').trim().toLowerCase();
    if (!q) return null;
    for (var i = 0; i < locations.length; i++) {
        var loc = locations[i];
        if (loc.name.toLowerCase() === q) return loc.name;
        if (loc.nameKn && loc.nameKn === input.trim()) return loc.name;
        var aliases = stationAliases[loc.name] || [];
        if (aliases.indexOf(q) > -1) return loc.name;
    }
    return null;
}

function computeJourney(fromName, toName) {
    var adj = buildRouteGraph();
    var locByName = {};
    locations.forEach(function (loc) { locByName[loc.name] = loc; });
    var dist = {};
    var prev = {};
    var queue = [];

    function key(station, line) { return station + '|' + line; }

    (locByName[fromName].lines || []).forEach(function (line) {
        dist[key(fromName, line)] = 0;
        queue.push({ station: fromName, line: line, cost: 0 });
    });

    var bestKey = null;
    while (queue.length) {
        queue.sort(function (a, b) { return a.cost - b.cost; });
        var cur = queue.shift();
        var curKey = key(cur.station, cur.line);
        if (cur.cost > (dist[curKey] === undefined ? Infinity : dist[curKey])) continue;
        if (cur.station === toName) { bestKey = curKey; break; }

        (adj[cur.station] || []).forEach(function (edge) {
            if (edge.line !== cur.line) return;
            var nk = key(edge.to, cur.line);
            var nc = cur.cost + 1;
            if (dist[nk] === undefined || nc < dist[nk]) {
                dist[nk] = nc;
                prev[nk] = { fromKey: curKey, via: 'ride' };
                queue.push({ station: edge.to, line: cur.line, cost: nc });
            }
        });

        (locByName[cur.station].lines || []).forEach(function (other) {
            if (other === cur.line) return;
            var nk = key(cur.station, other);
            var nc = cur.cost + 2;
            if (dist[nk] === undefined || nc < dist[nk]) {
                dist[nk] = nc;
                prev[nk] = { fromKey: curKey, via: 'transfer' };
                queue.push({ station: cur.station, line: other, cost: nc });
            }
        });
    }

    if (!bestKey) return null;

    var path = [];
    var k = bestKey;
    while (k) {
        var sep = k.lastIndexOf('|');
        var p = prev[k];
        path.unshift({ station: k.slice(0, sep), line: k.slice(sep + 1), via: p ? p.via : 'start' });
        k = p ? p.fromKey : null;
    }
    return path;
}

function drawRouteHighlight(path) {
    routeHighlight.clearLayers();
    polylinesGroup.eachLayer(function (layer) { layer.setStyle({ opacity: 0.08 }); });
    var locByName = {};
    locations.forEach(function (loc) { locByName[loc.name] = loc; });
    var latlngs = [];
    for (var i = 0; i < path.length - 1; i++) {
        var a = path[i], b = path[i + 1];
        var la = locByName[a.station].location;
        latlngs.push([la.lat, la.lng]);
        if (a.station === b.station) continue; // transfer, no movement
        var lb = locByName[b.station].location;
        L.polyline([[la.lat, la.lng], [lb.lat, lb.lng]], {
            color: lineColors[a.line], weight: 6, opacity: 1
        }).addTo(routeHighlight);
    }
    var last = locByName[path[path.length - 1].station].location;
    latlngs.push([last.lat, last.lng]);
    routeHighlight.addTo(map);
    // Cap zoom so short routes don't trigger the crowded all-labels view
    map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 13 });
}

function clearRouteHighlight() {
    routeHighlight.clearLayers();
    if (map.hasLayer(routeHighlight)) map.removeLayer(routeHighlight);
    updatePolylineVisibility();
}

// --> ViewModel
var myViewModel = function () {
    var self = this;

    self.locations = ko.observableArray(locations);
    self.query = ko.observable('').extend({ rateLimit: { timeout: 200, method: 'notifyWhenChangesStop' } });
    self.activeTab = ko.observable('explore'); // explore (all), purple, green, yellow, routing
    self.lineColors = lineColors;

    // Kannada / English station names (persisted; search matches both scripts)
    self.kannada = ko.observable(localStorage.getItem('nammaLang') === 'kn');
    self.kannada.subscribe(function (on) {
        localStorage.setItem('nammaLang', on ? 'kn' : 'en');
        refreshStationLanguage();
    });

    self.hoverStation = function (place) {
        // Clear any pending mouseout timeout (debounce)
        if (place.hoverTimeout) {
            clearTimeout(place.hoverTimeout);
            place.hoverTimeout = null;
        }
        hoveredStation = place;

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
            hoveredStation = null;
            if (place.marker) {
                place.marker.closeTooltip();

                // Restore open popup opacity
                $('.leaflet-popup').removeClass('dimmed');

                var element = place.marker.getElement();
                if (element) {
                    element.classList.remove('bounce-animation');
                }
            }
            refreshStationLabels();
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
        if (self.activeTab() === 'routing') {
            // Planner view keeps every station marker: endpoints need labels
            locations.forEach(function (loc) { visible[loc.name] = true; });
        } else {
            list.forEach(function (loc) { visible[loc.name] = true; });
        }
        locations.forEach(function (loc) {
            if (!loc.marker) return;
            var shouldShow = !!visible[loc.name];
            if (shouldShow && !markersGroup.hasLayer(loc.marker)) {
                markersGroup.addLayer(loc.marker);
                var pathEl = loc.marker.getElement();
                if (pathEl) pathEl.setAttribute('tabindex', '-1');
            }
            if (!shouldShow && markersGroup.hasLayer(loc.marker)) markersGroup.removeLayer(loc.marker);
        });
        refreshStationLabels();
        return list.length;
    });

    self.resultCountText = ko.pureComputed(function () {
        var n = self.filterResults().length;
        var line = self.activeTab();
        var text = n + (n === 1 ? ' station' : ' stations');
        if (line !== 'explore' && line !== 'routing') {
            text += ' on ' + line.charAt(0).toUpperCase() + line.slice(1);
        }
        if (self.query()) text += ' matching “' + self.query() + '”';
        return text;
    });

    // Journey planner state
    self.routeFrom = ko.observable('');
    self.routeTo = ko.observable('');
    self.routeError = ko.observable('');
    self.routeResult = ko.observable(null);
    self.routeSteps = ko.observableArray([]);
    self.routeSummary = ko.observable('');

    self.swapRoute = function () {
        var from = self.routeFrom();
        self.routeFrom(self.routeTo());
        self.routeTo(from);
        // Recompute immediately when a route is already displayed
        if (self.routeResult()) self.findRoute();
    };

    self.findRoute = function () {
        self.routeError('');
        var from = resolveStationName(self.routeFrom());
        var to = resolveStationName(self.routeTo());
        if (!from || !to) {
            self.routeError('Pick a start and destination station from the list.');
            return;
        }
        if (from === to) {
            self.routeError('Start and destination are the same station.');
            return;
        }
        var path = computeJourney(from, to);
        if (!path) {
            self.routeError('No route found between these stations.');
            return;
        }
        var rides = path.filter(function (s) { return s.via === 'ride'; }).length;
        var transfers = path.filter(function (s) { return s.via === 'transfer'; }).length;
        var minutes = rides * 2 + transfers * 3;
        self.routeResult({ path: path });
        self.routeSummary(rides + (rides === 1 ? ' stop' : ' stops') + ' · ' + transfers + (transfers === 1 ? ' transfer' : ' transfers') + ' · ~' + minutes + ' min (estimate)');
        self.routeSteps(path.map(function (s) {
            return {
                name: s.station,
                isTransfer: s.via === 'transfer',
                transferText: s.via === 'transfer' ? 'Change to ' + s.line + ' Line' : '',
                lineBadge: s.line,
                lineColor: lineColors[s.line],
                lineTextColor: s.line === 'Yellow' ? '#333' : '#fff'
            };
        }));
        drawRouteHighlight(path);
        updateRouteEndpointLabels();
        refreshStationLabels();
        if (window.innerWidth <= 768) closeview(); // reveal the highlighted route on mobile
        replaceUrlParams(function (params) {
            params.set('from', stationSlug(from));
            params.set('to', stationSlug(to));
        });
    };

    self.clearRoute = function () {
        self.routeFrom('');
        self.routeTo('');
        self.routeError('');
        self.routeResult(null);
        self.routeSteps([]);
        self.routeSummary('');
        clearRouteHighlight();
        updateRouteEndpointLabels();
        refreshStationLabels();
        replaceUrlParams(function (params) { params.delete('from'); params.delete('to'); });
    };
};

// Passive Onboarding Tour Helpers & Management
var tourActive = false;
var hoveredStation = null;

// Baseline station labels: line endpoints + interchanges stay labeled so the
// map never looks bare. Zoom >= 15 labels every visible station; an active
// search labels all matching stations.
function getBaselineLabelStations() {
    var activeLine = myViewModelInstance ? myViewModelInstance.activeTab() : 'explore';
    var interchanges = locations.filter(function (loc) { return loc.lines.length > 1; })
        .map(function (loc) { return loc.name; });
    // Small screens at city zoom: interchanges only, so the map stays readable
    if (window.innerWidth <= 768 && map && map.getZoom() < 13 &&
        (activeLine === 'explore' || activeLine === 'routing')) {
        return interchanges;
    }
    var endpoints = [];
    if (activeLine === 'explore' || activeLine === 'routing') {
        endpoints = endpoints.concat(getLineEndpoints('Purple'), getLineEndpoints('Green'), getLineEndpoints('Yellow'));
    } else {
        var lineName = activeLine.charAt(0).toUpperCase() + activeLine.slice(1);
        endpoints = getLineEndpoints(lineName);
    }
    return endpoints.concat(interchanges).filter(function (name, idx, arr) { return arr.indexOf(name) === idx; });
}

// Marker dots shrink at low zoom so dense city views stay readable
function updateMarkerSizes() {
    if (!map) return;
    var radius = map.getZoom() < 12 ? 5 : 8;
    locations.forEach(function (loc) {
        if (!loc.marker) return;
        var isEndpoint = currentRouteEndpoints.indexOf(loc.name) > -1;
        loc.marker.setStyle({ radius: isEndpoint ? radius + 3 : radius, weight: isEndpoint ? 4 : 3 });
    });
}

// Origin/destination labels and emphasis for the active route
var currentRouteEndpoints = [];

function routeEndpointTooltipContent(loc, label) {
    return '<div class="tooltip-title">' + label + ': ' + displayPrimary(loc) + '</div>' +
        '<div class="tooltip-sub">' + loc.lines.join(', ') + ' Line' + (loc.lines.length > 1 ? 's' : '') + '</div>';
}

function updateRouteEndpointLabels() {
    var next = [];
    var result = myViewModelInstance && myViewModelInstance.routeResult();
    if (myViewModelInstance && myViewModelInstance.activeTab() === 'routing' && result) {
        next = [result.path[0].station, result.path[result.path.length - 1].station];
    }
    currentRouteEndpoints.forEach(function (name) {
        if (next.indexOf(name) > -1) return;
        var loc = locationsByName[name];
        if (loc && loc.marker) loc.marker.setTooltipContent(buildTooltipContent(loc));
    });
    currentRouteEndpoints = next;
    next.forEach(function (name, idx) {
        var loc = locationsByName[name];
        if (loc && loc.marker) {
            loc.marker.setTooltipContent(routeEndpointTooltipContent(loc, idx === 0 ? 'From' : 'To'));
            loc.marker.openTooltip();
        }
    });
    updateMarkerSizes();
}

// Clamp a tooltip into the map's horizontal bounds with a margin offset.
// Leaflet positions tooltips via transform, so we must never reset transform;
// margin-left is independent and keeps the station position intact.
function clampTooltipIntoView(tooltip) {
    var el = tooltip.getElement();
    if (!el || !el.isConnected) return;
    // Measure with inline margin 0: Leaflet's direction classes carry their own
    // margin, and clearing to '' would measure a different base than we apply to.
    el.style.marginLeft = '0px';
    var mapRect = map.getContainer().getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    var delta = 0;
    if (rect.right > mapRect.right - 4) delta = mapRect.right - 4 - rect.right;
    else if (rect.left < mapRect.left + 4) delta = mapRect.left + 4 - rect.left;
    if (delta) el.style.marginLeft = Math.round(delta) + 'px';
}

function refreshStationLabels() {
    if (!map) return;
    var showAll = map.getZoom() >= 15;
    var hasQuery = myViewModelInstance && myViewModelInstance.query().trim().length > 0;
    var baseline = getBaselineLabelStations();
    locations.forEach(function (loc) {
        if (!loc.marker) return;
        var visible = markersGroup.hasLayer(loc.marker);
        var want = visible && (showAll || hasQuery || baseline.indexOf(loc.name) > -1 ||
            currentRouteEndpoints.indexOf(loc.name) > -1);
        if (want) {
            if (!loc.marker.isTooltipOpen()) loc.marker.openTooltip();
        } else if (loc.marker.isTooltipOpen() && loc !== hoveredStation) {
            loc.marker.closeTooltip();
        }
    });
    // Clamp any open tooltip that still overflows the map (narrow viewports)
    clampAllOpenTooltips();
}

function clampAllOpenTooltips() {
    requestAnimationFrame(function () {
        locations.forEach(function (loc) {
            if (loc.marker && loc.marker.isTooltipOpen()) clampTooltipIntoView(loc.marker.getTooltip());
        });
    });
}

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
    clampAllOpenTooltips();
}

// Replay button: restore the full line view (a filtered search would hide the
// endpoints) and open the endpoint tooltips again.
function replayTour() {
    if (myViewModelInstance) {
        myViewModelInstance.query('');
        // Wait out the 200ms search debounce so endpoint markers are visible again
        setTimeout(function () {
            fitToResults();
            startOnboardingTour();
        }, 300);
    } else {
        startOnboardingTour();
    }
}

function endOnboardingTour() {
    if (!tourActive) return;
    tourActive = false;
    locations.forEach(function (loc) {
        if (loc.marker) {
            loc.marker.closeTooltip();
        }
    });
    // The baseline labels stay on even after the tour ends
    refreshStationLabels();
}
