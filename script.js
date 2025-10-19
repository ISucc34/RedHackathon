// Initialize map
let map = L.map('map').setView([31.0, -100.0], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Data holders & marker arrays
let earthquakeData;
let wildfireMarkers = [];
let earthquakeMarkers = [];

// Custom icons
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Earthquake logic
function getEarthquakes() {
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('Earthquake data:', data);
        displayEarthquakes(data);
      })
      .catch(error => {
        console.error('Error fetching earthquakes:', error);
      });
}

function displayEarthquakes(data) {
    clearMarkers(earthquakeMarkers);
    const earthquakes = data.features;
    earthquakes.forEach(quake => {
        let coords = quake.geometry.coordinates;
        let lat = coords[1];
        let lon = coords[0];
        let mag = quake.properties.mag;
        let place = quake.properties.place;
        let time = new Date(quake.properties.time);

        let marker = L.marker([lat, lon], { icon: blueIcon }).addTo(map)
          .bindPopup(`
            <b>Magnitude:</b> ${mag}<br>
            <b>Location:</b> ${place}<br>
            <b>Time:</b> ${time.toLocaleString()}
          `);
        earthquakeMarkers.push(marker);
    });
}

// Wildfire logic (using NASA FIRMS)
function getWildfiresForTexas() {
    // Example: use a pre‑built URL for Texas/USA from FIRMS
    // Replace with the appropriate URL for your desired region/time.
    const url = 'https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6.1/geojson/MODIS_C6_1_USA_contiguous_and_Hawaii_24h.geojson';

    fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log('Wildfire data:', data);
        displayWildfires(data);
      })
      .catch(error => {
        console.error('Error fetching wildfires:', error);
      });
}

function displayWildfires(data) {
    clearMarkers(wildfireMarkers);
    const fires = data.features;

    fires.forEach(fire => {
        let coords = fire.geometry.coordinates;
        let lat = coords[1];
        let lon = coords[0];
        let brightness = fire.properties.brightness;       // satellite brightness
        let acq_date = fire.properties.acq_date;           // acquisition date
        let acq_time = fire.properties.acq_time;           // acquisition time
        let place = fire.properties.fire_id || "Fire hotspot";

        let marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`
            <b>Brightness:</b> ${brightness}<br>
            <b>Date:</b> ${acq_date} ${acq_time}<br>
            <b>Location ID:</b> ${place}
          `);
        wildfireMarkers.push(marker);
    });
}

// Utility to clear marker arrays
function clearMarkers(markerArray) {
    markerArray.forEach(marker => map.removeLayer(marker));
    markerArray.length = 0;
}

// Toggle logic and startup
getEarthquakes();
// Load wildfires by default as well:
getWildfiresForTexas();

// Example toggles — ensure you have the correct checkboxes in HTML with IDs
document.getElementById('toggle-earthquakes').addEventListener('change', function() {
    if (this.checked) {
        getEarthquakes();
    } else {
        clearMarkers(earthquakeMarkers);
    }
});

document.getElementById('toggle-heatwaves').addEventListener('change', function() {
    if (this.checked) {
        getWildfiresForTexas();
    } else {
        clearMarkers(wildfireMarkers);
    }
});
