let map = L.map('map').setView([31.0, -100.0], 6); // Texas map

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let earthquakeMarkers = [];
let wildfireMarkers = [];

const brownIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-brown.png',
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

// Fetch and display earthquakes
function getEarthquakes() {
  fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
    .then(response => response.json())
    .then(data => {
      displayEarthquakes(data);
    })
    .catch(error => console.error('Error fetching earthquakes:', error));
}

function displayEarthquakes(data) {
  clearMarkers(earthquakeMarkers);
  data.features.forEach(quake => {
    const [lon, lat] = quake.geometry.coordinates;
    const mag = quake.properties.mag;
    const place = quake.properties.place;
    const time = new Date(quake.properties.time);

    let marker = L.marker([lat, lon], { icon: brownIcon }).addTo(map)
      .bindPopup(`
        <b>Magnitude:</b> ${mag}<br>
        <b>Location:</b> ${place}<br>
        <b>Time:</b> ${time.toLocaleString()}
      `);
    earthquakeMarkers.push(marker);
  });
}

// Fetch and display wildfires from NASA FIRMS MODIS 24h GeoJSON
function getWildfires() {
  const url = 'https://firms.modaps.eosdis.nasa.gov/active_fire/c6/json/MODIS_C6_USA_contiguous_and_Hawaii_24h.json';

  fetch(url)
    .then(response => response.json())
    .then(data => {
      displayWildfires(data);
    })
    .catch(error => console.error('Error fetching wildfires:', error));
}

function displayWildfires(data) {
  clearMarkers(wildfireMarkers);
  data.features.forEach(fire => {
    const coords = fire.geometry.coordinates; // [longitude, latitude]
    const latitude = coords[1];
    const longitude = coords[0];

    const brightness = fire.properties.brightness;
    const confidence = fire.properties.confidence;
    const date = fire.properties.acq_date;
    const time = fire.properties.acq_time;

    let marker = L.marker([latitude, longitude], { icon: redIcon }).addTo(map)
      .bindPopup(`
        <b>Wildfire Detected</b><br>
        <b>Brightness:</b> ${brightness}<br>
        <b>Confidence:</b> ${confidence}<br>
        <b>Date:</b> ${date}<br>
        <b>Time:</b> ${time}
      `);
    wildfireMarkers.push(marker);
  });
}

function clearMarkers(markerArray) {
  markerArray.forEach(marker => map.removeLayer(marker));
  markerArray.length = 0;
}

// Search functionality
document.getElementById('search-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const query = document.getElementById('gsearch').value;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        map.setView([lat, lon], 12);
        L.marker([lat, lon]).addTo(map)
          .bindPopup(`Search result: ${query}`)
          .openPopup();
      } else {
        alert("Location not found. Please try again.");
      }
    })
    .catch(error => {
      console.error("Error with geocoding:", error);
      alert("Failed to get location data. Try again later.");
    });
});

// Checkbox filters
document.getElementById('toggle-earthquakes').addEventListener('change', function () {
  if (this.checked) {
    getEarthquakes();
  } else {
    clearMarkers(earthquakeMarkers);
  }
});

document.getElementById('toggle-wildfires').addEventListener('change', function () {
  if (this.checked) {
    getWildfires();
  } else {
    clearMarkers(wildfireMarkers);
  }
});

// Load disasters by default
getEarthquakes();
getWildfires();
