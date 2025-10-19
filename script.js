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

// Load earthquakes when page loads
getEarthquakes();
if (document.getElementById('toggle-heatwaves').checked) {
    const center = map.getCenter();
    getHeatWaveData(center.lat, center.lng);
}

// Step 1: Handle search form submission
document.getElementById('search-form').addEventListener('submit', function (e) { //this finds the HTML element with the id 'search-form'; and it sets up a listener that waits for the form submission event (submit); and runs when submitted
    e.preventDefault(); // Prevent form from reloading the page

    const query = document.getElementById('gsearch').value; //store what searched into query
    console.log("User searched for:", query); // Just testing for now
    // Fetch coordinates from Nominatim API
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`) //send request to open street Openstreet Nominatim API to search for geographic data.
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                console.log(`Coordinates: ${lat}, ${lon}`);

                // Move the map to these coordinates and zoom in
                map.setView([lat, lon], 12);

                // Optionally, add a marker at the searched location
                L.marker([lat, lon]).addTo(map)
                    .bindPopup(`Search result: ${query}`)
                    .openPopup();
                 // <<---- Add this block here ---->>
                if (document.getElementById('toggle-heatwaves').checked) {
                    getHeatWaveData(lat, lon, query);
                }
                if (document.getElementById('toggle-earthquakes').checked) {
                    getEarthquakes();
                }
            } 
            else {
                alert("Location not found. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error with geocoding:", error);
            alert("Failed to get location data. Try again later.");
        });
});

function getHeatWaveData(lat, lon) {
  fetch(`https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=YOUR_API_KEY`)
    .then(response => response.json())
    .then(data => {
      const temp = data.data[0].temp;
      if (temp >= 20) {
        L.marker([lat, lon], { icon: redIcon })
          .addTo(map)
          .bindPopup(`<b>Temperature:</b> ${temp}°C`);
      }
    })
    .catch(error => console.error('Error fetching heatwave data:', error));
}


function displayHeatWaves(data, lat, lon, placeName = "Searched Location") {
    clearMarkers(heatwaveMarkers);
    const weather = data.current_weather;
    if (!weather) {
        console.log("No current weather data found.");
        return;
    }

    const temp = weather.temperature;
    const time = new Date(weather.time);

    if (temp >= 20) {
        let marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`
            <b>Brightness:</b> ${brightness}<br>
            <b>Date:</b> ${acq_date} ${acq_time}<br>
            <b>Location ID:</b> ${place}
          `);
        heatwaveMarkers.push(marker);
    } else {
      console.log(`Temperature at ${placeName} is only ${temp}°C – not a heatwave.`);
    }
}


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