// Initialize map
let map = L.map('map').setView([31.0, -100.0], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Data holders & marker arrays
let earthquakeData;
let wildfireMarkers = [];
let earthquakeMarkers = [];
let heatwaveMarkers = [];

// Custom icons
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const redIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet-color-markers@1.1.1/dist/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const purpleIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
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

          let marker = L.marker([lat, lon], { icon: greenIcon }).addTo(map)
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
  // Use Open-Meteo's free API for current temperature (no API key needed)
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&timezone=UTC`)
    .then(response => response.json())
    .then(data => {
      const temp = data.current_weather?.temperature;
      if (temp === undefined) {
        console.log('No temperature data returned for heatwave marker at', lat, lon);
        return;
      }
      console.log(`Fetched temperature for heatwave marker: ${temp}°C at [${lat}, ${lon}]`);
      // Lower threshold for marking as a heatwave
      if (temp >= 10) {
        console.log('Adding heatwave marker:', lat, lon, temp);
        const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`<b>Temperature:</b> ${temp}°C`);
        heatwaveMarkers.push(marker);
      } else {
        console.log('Temperature below threshold for heatwave marker:', temp);
      }
    })
    .catch(error => console.error('Error fetching heatwave data:', error));
}


function displayHeatWaves(data, lat, lon, placeName = "Searched Location") {
    // Keep this helper for datasets that supply a full weather payload.
    clearMarkers(heatwaveMarkers);
    const weather = data.current_weather;
    if (!weather) {
        console.log("No current weather data found.");
        return;
    }
    const temp = weather.temperature;
    if (temp >= 30) {
        const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`Heatwave at ${placeName}: ${temp}°C`);
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
// Load wildfires and heatwave markers by default
getWildfiresForTexas();
const center = map.getCenter();
getHeatWaveData(center.lat, center.lng);

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
    // Optionally, you could refresh heatwave markers here
  } else {
    clearMarkers(heatwaveMarkers);
  }
});

// Wildfires toggle (new checkbox added in index.html)
document.getElementById('toggle-wildfires').addEventListener('change', function() {
  if (this.checked) {
    getWildfiresForTexas();
  } else {
    clearMarkers(wildfireMarkers);
  }
});

// Fetch wildfires using NASA EONET API (open data) for the Texas bounding box
function getWildfiresForTexas() {
  clearMarkers(wildfireMarkers);
  const bbox = '-106.645646,25.837377,-93.508039,36.500704'; // TX bounding box
  fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&bbox=${bbox}`)
    .then(res => res.json())
    .then(data => {
    if (!data.events) return;
    data.events.forEach(event => {
      const coords = event.geometry?.[0]?.coordinates;
      if (!coords) return;
      const lon = coords[0];
      const lat = coords[1];
      const title = event.title || 'Wildfire';
        const marker = L.marker([lat, lon], { icon: purpleIcon }).addTo(map).bindPopup(`<b>${title}</b><br>${event.description || ''}`);
        wildfireMarkers.push(marker);
let floodMarkers = [];
document.getElementById('toggle-floods').addEventListener('change', function() {
  if (this.checked) {
    getFloodsForTexas();
  } else {
    clearMarkers(floodMarkers);
  }
});

function getFloodsForTexas() {
  clearMarkers(floodMarkers);
  // Use USGS water data for Texas bounding box
  const bbox = '-106.645646,25.837377,-93.508039,36.500704';
  fetch(`https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox}&parameterCd=00065,00060&siteStatus=active`)
    .then(res => res.json())
    .then(data => {
      if (!data.value || !data.value.timeSeries) return;
      data.value.timeSeries.forEach(site => {
        const siteInfo = site.sourceInfo;
        const values = site.values[0]?.value;
        const latestValue = values ? values[values.length - 1] : null;
        if (!siteInfo || !siteInfo.geoLocation || !siteInfo.geoLocation.geogLocation || !latestValue) return;
        const lat = siteInfo.geoLocation.geogLocation.latitude;
        const lon = siteInfo.geoLocation.geogLocation.longitude;
        const marker = L.marker([lat, lon], { icon: blueIcon }).addTo(map)
          .bindPopup(`<b>Flood Site:</b> ${siteInfo.siteName}<br><b>Value:</b> ${latestValue.value} ${site.variable.unit.unitCode}`);
        floodMarkers.push(marker);
      });
    })
    .catch(err => console.error('Error fetching floods:', err));
}
    });
    })
    .catch(err => console.error('Error fetching wildfires:', err));
}