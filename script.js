let map = L.map('map').setView([31.0, -100.0], 6); //this creates our map of texas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
//url is where leaflet is getting the images from
//attribution is giving credit to the source of the images; and then we add it to the map

let earthquakeData; //hold earthquake info
let heatWaveData;
function getEarthquakes() {
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')//all earthquakes in the past 24 hours
        .then(response => response.json()) //convert response from text format to useable javascript object
        .then(data => {
            console.log('Earthquake data:', data);  // See data in console
            displayEarthquakes(data);
        })
        .catch(error => { //runs if something goes wrong
            console.error('Error fetching earthquakes:', error);
        });
}

// Function to display earthquakes as markers
function displayEarthquakes(data) {
    let earthquakes = data.features;  // Get array of earthquakes
    
    console.log(`Found ${earthquakes.length} earthquakes`); //prints how many earthquakes were found
    
    earthquakes.forEach(function(quake) {
        // Get earthquake details
        let coords = quake.geometry.coordinates;
        let lat = coords[1];  // Latitude
        let lon = coords[0];  // Longitude
        let mag = quake.properties.mag;  // Magnitude
        let place = quake.properties.place;  // Location name
        let time = new Date(quake.properties.time);  // Time of earthquake
        
        // Create marker for each earthquake
        L.marker([lat, lon]).addTo(map) //creates a marker on the map at the specified coordinates; this is where the earthquake happened
            .bindPopup(` //attaches a popup box to the marker- this popup shows info about the earthquake when you click on the marker
                <b>Magnitude:</b> ${mag}<br> //magnitude of the earthquake (measures the energy released by an earthquake)
                <b>Location:</b> ${place}<br> //location of the earthquake
                <b>Time:</b> ${time.toLocaleString()} //time of earthquake
            `);
    });
}

// Load earthquakes when page loads
getEarthquakes();

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
            } else {
                alert("Location not found. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error with geocoding:", error);
            alert("Failed to get location data. Try again later.");
        });
});

function getHeatWaveData(lat, lon, placeName = "Searched Location") {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
    .then(response => response.json())
    .then(data => {
      heatWaveData = data; // store the data
      displayHeatWaves(heatWaveData, lat, lon, placeName); // pass lat, lon, and location name
    })
    .catch(error => {
      console.error('Error fetching heat wave data:', error);
    });
}
function displayHeatWaves(data, lat, lon, placeName = "Searched Location") {
    // Extract current weather info
    const weather = data.current_weather;
    if (!weather) {
        console.log("No current weather data found.");
        return;
    }

    // Temperature and time
    const temp = weather.temperature;
    const time = new Date(weather.time);

    // Create or update a marker at this location
    L.marker([lat, lon], { icon: heatwaveIcon }).addTo(map)
      .bindPopup(`
        <b>Temperature:</b> ${temp} °C<br>
        <b>Location:</b> ${placeName}<br>
        <b>Time:</b> ${time.toLocaleString()}
      `).openPopup();
}

