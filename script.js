let map = L.map('map').setView([31.0, -100.0], 6); //this creates our map of Texas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Custom red icon for heatwave markers
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

let earthquakeMarkers = [];
let heatwaveMarkers = [];

function getEarthquakes() {
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson') // all earthquakes in the past 24 hours
        .then(response => response.json()) // convert response from text format to usable JS object
        .then(data => {
            console.log('Earthquake data:', data);  // See data in console
            displayEarthquakes(data);
        })
        .catch(error => {
            console.error('Error fetching earthquakes:', error);
        });
}

function displayEarthquakes(data) {
    clearMarkers(earthquakeMarkers);
    let earthquakes = data.features;
    earthquakes.forEach(quake => {
        let coords = quake.geometry.coordinates;
        let lat = coords[1];
        let lon = coords[0];
        let mag = quake.properties.mag;
        let place = quake.properties.place;
        let time = new Date(quake.properties.time);
        
        let marker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`
                <b>Magnitude:</b> ${mag}<br>
                <b>Location:</b> ${place}<br>
                <b>Time:</b> ${time.toLocaleString()}
            `);
        earthquakeMarkers.push(marker);
    });
}

function getHeatWaveData(lat, lon, placeName = "Searched Location") {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
    .then(response => response.json())
    .then(data => {
      console.log("Heatwave API response:", data);
      displayHeatWaves(data, lat, lon, placeName);
    })
    .catch(error => {
      console.error('Error fetching heat wave data:', error);
    });
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

    if (temp >= 35) {  // you can adjust this threshold for testing
        let marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`
            <b>Temperature:</b> ${temp} °C<br>
            <b>Location:</b> ${placeName}<br>
            <b>Time:</b> ${time.toLocaleString()}
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

// Load earthquakes on page load
getEarthquakes();

// Also load heatwave data on page load at current map center if toggle is checked
if (document.getElementById('toggle-heatwaves').checked) {
    const center = map.getCenter();
    getHeatWaveData(center.lat, center.lng);
}

// Handle search form submission
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const query = document.getElementById('gsearch').value;
    console.log("User searched for:", query);

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                console.log(`Coordinates: ${lat}, ${lon}`);

                map.setView([lat, lon], 12);

                L.marker([lat, lon]).addTo(map)
                    .bindPopup(`Search result: ${query}`)
                    .openPopup();

                if (document.getElementById('toggle-heatwaves').checked) {
                    getHeatWaveData(lat, lon, query);
                }
                if (document.getElementById('toggle-earthquakes').checked) {
                    getEarthquakes();
                }
            } else {
                alert("Location not found. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error with geocoding:", error);
            alert("Failed to get location data. Try again later.");
        });
});

// Toggle earthquake markers
document.getElementById('toggle-earthquakes').addEventListener('change', function() {
    if (this.checked) {
        getEarthquakes();
    } else {
        clearMarkers(earthquakeMarkers);
    }
});

// Toggle heatwave markers
document.getElementById('toggle-heatwaves').addEventListener('change', function() {
    if (this.checked) {
        const center = map.getCenter();
        getHeatWaveData(center.lat, center.lng);
    } else {
        clearMarkers(heatwaveMarkers);
    }
});
