let map = L.map('map').setView([31.0, -100.0], 6); //this creates our map of texas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
//url is where leaflet is getting the images from
//attribution is giving credit to the source of the images; and then we add it to the map

L.marker([29.7604, -95.3698]).addTo(map)
    .bindPopup('Test Marker - Houston')
    .openPopup();
let earthquakeData; //hold earthquake info
