// The custom JavaScript file for the App (Knockout & jQuery used too)
// Model-View-ViewModel arcitecture is implemented here.

// --> Model - contains all the essential data (Location data and other global declarations)
var locations = [
	{ name: 'Baiyappanahalli metro station', location: {lat: 12.9907, lng: 77.6525}, address: 'Sadanandanagar, Bennigana Halli'},
	{ name: 'Halasuru metro station', location: {lat: 12.9764, lng: 77.6267}, address: 'Old Madras Road, Gupta Layout, Halasuru'},
	{ name: 'Indiranagar metro station', location: {lat: 12.9783, lng: 77.6388}, address: 'Chinmaya Mission Hospital Rd, Binnamangala, Stage 1'},
	{ name: 'Majestic metro station', location: {lat: 12.9757, lng: 77.5728}, address: ' Kempegowda, Majestic'},
	{ name: 'Swami Vivekananda Road metro station', location: {lat: 12.9859, lng: 77.6449}, address: 'Swamy Vivekananda Rd, New Baiyyappanahalli Extension'},
	{ name: 'Vidhana Soudha metro station', location: {lat: 12.9798, lng: 77.5927}, address: 'Ambedkar Veedhi, Sampangi Rama Nagar'}	
];
var numberOfLocations = locations.length;
var map;
var markers = [];
var marker;
var bounds;
var popUpBox;

// --> View - contains all the visual data (contains 3 necessary functions and 3 visual animation manage function)

// Function specifying the actions to do once Google Map response is successful
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), { center : { lat: 12.9716, lng: 77.5946}, zoom: 14});
	popUpBox = new google.maps.InfoWindow();
	// For all the locations (6 metro stations) - Generate markers and asoociated data & animation
	for (var i = 0; i < numberOfLocations; i++) {
		marker = new google.maps.Marker({ map: map, position: locations[i].location, title: locations[i].name, address: locations[i].address, animation: google.maps.Animation.DROP });
		locations[i].marker = marker;
		markers.push(marker);
		marker.addListener('click', function(){ AnimateMarker(this); populateInfoWindow(this, popUpBox);});
	}
	// Pan the map by the minimum amount necessary to contain the given LatLngBounds
	bounds = new google.maps.LatLngBounds();
	// Listening to DOM events for changes in Maps
	google.maps.event.addDomListener(window, 'resize', showListings);
	google.maps.event.addDomListener(window, 'load',showListings);
	// Corresponding function from DOM listener
	function showListings () {
		map.setCenter({lat: 12.9716, lng: 77.5946});
	    for (var i = 0; i < markers.length; i++) {
	        markers[i].setMap(map);
	        bounds.extend(markers[i].position);
	    }
	    map.fitBounds(bounds);      
    }
    // Activating Knockout
    ko.applyBindings(new myViewModel());
}
// Function that Animates once user clicks on location (either on Mapmarker or in the List).
function AnimateMarker (marker) {
	if (marker.getAnimation() !== null) marker.setAnimation(null);
	else marker.setAnimation(google.maps.Animation.DROP);
}
// Function to Create the Infowindows that contain additional infrmation taken from 3rd party API (MediaWiki API used here)
function populateInfoWindow(marker, infowindow) {
	var wikiRequestTimeout = setTimeout(function(){ infowindow.setContent("Sorry, For some reason Wikipedia Information cannot be loaded. Please try later"); infowindow.open(map, marker);},1000);
	var wikipediaURL = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
	$.ajax({
		url: wikipediaURL,
		dataType: "jsonp",
		success: function(response) {
			var serachedTerm = response[0];
			var MatchedPage = response[1];
			var content = response[2];
			var link = response[3];
			if (infowindow.marker !== marker) {
				infowindow.marker = marker;
				infowindow.setContent('<li><a href="' + link +'">'+ marker.title +'</a></li>');
				infowindow.open(map, marker);
				infowindow.addListener('closeclick', function() {
					infowindow.marker = null;
					map.fitBounds(bounds);
				});
			}
			clearTimeout(wikiRequestTimeout);			
		}
	});
}
// Function that Alerts the user if there's problem loading Google Map 
function MapError() {
	alert("Sorry, For some reason Google Map cannot be loaded. Please try later");
}
// Function to Slide open the Sidebar  
function openview() {
    document.getElementById("sidebar").style.width = "250px";
}
// Function to Slide close the Sidebar 
function closeview() {
    document.getElementById("sidebar").style.width = "0";
}

// --> ViewModel - Where all the User interface operations occurs

var myViewModel = function(place) {
	// Function that manipulates the List item in HTML
	this.locations = ko.observable(locations);
	this.displayInfo = function(place) {
		for (var i = 0; i < numberOfLocations; i++) {
		if (place.name === locations[i].name) {
			var markerNew = markers[i];
			AnimateMarker(markerNew);
			populateInfoWindow(markerNew, popUpBox);
		}
		}
	};
	// Function that filters the List item in HTML
	this.query = ko.observable('');
	this.filterResults = ko.computed(function() {
		map.fitBounds(bounds);
		popUpBox.close();
		var query = this.query().toLowerCase();
		return ko.utils.arrayFilter(this.locations(),function(list) {
			var result = list.name.toLowerCase().indexOf(query) > -1;
			list.marker.setVisible(result);
			return result;
		});
	},this);
};