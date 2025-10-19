// Initialize the map centered on Texas
let map = L.map('map').setView([31.0, -100.0], 6);

// Add OpenStreetMap base tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Earthquake markers array
let earthquakeMarkers = [];

// Blue icon for earthquakes
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Wildfire layer (NASA FIRMS WMS)
let wildfireLayer = L.tileLayer.wms('https://firms.modaps.eosdis.nasa.gov/wms/active_fire', {
  layers: 'fires_modis_24',
  format: 'image/png',
  transparent: true,
  attribution: 'NASA FIRMS MODIS Active Fires'
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

    let marker = L.marker([lat, lon], { icon: blueIcon }).addTo(map)
      .bindPopup(`
        <b>Magnitude:</b> ${mag}<br>
        <b>Location:</b> ${place}<br>
        <b>Time:</b> ${time.toLocaleString()}
      `);
    earthquakeMarkers.push(marker);
  });
}

// Clear markers utility
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

// Checkbox event handlers
document.getElementById('toggle-earthquakes').addEventListener('change', function () {
  if (this.checked) {
    getEarthquakes();
  } else {
    clearMarkers(earthquakeMarkers);
  }
});

document.getElementById('toggle-wildfires').addEventListener('change', function () {
  if (this.checked) {
    wildfireLayer.addTo(map);
  } else {
    map.removeLayer(wildfireLayer);
  }
});

// Load earthquakes and wildfire layer by default if checkboxes are checked
if (document.getElementById('toggle-earthquakes').checked) {
  getEarthquakes();
}
if (document.getElementById('toggle-wildfires').checked) {
  wildfireLayer.addTo(map);
}
