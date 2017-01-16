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
var largeInfowindow;

// --> View - contains all the visual data (contains 3 necessary functions)

// Function specifying the actions to do once Google Map response is successful
function initMap() {
	map = new google.maps.Map(document.getElementById('map'), { center : { lat: 12.9716, lng: 77.5946}, zoom: 14});
}
function MapError() {
	alert("Google Map cannot be loaded.");
}
// Function to Slide open the Sidebar  
function openview() {
    document.getElementById("sidebar").style.width = "250px";
}
// Function to Slide close the Sidebar 
function closeview() {
    document.getElementById("sidebar").style.width = "0";
}