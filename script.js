let map = L.map('map').setView([31.0, -100.0], 6); //this creates our map of texas
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);
//url is where leaflet is getting the images from
//attribution is giving credit to the source of the images; and then we add it to the map

/*L.marker([29.7604, -95.3698]).addTo(map)
    .bindPopup('Test Marker - Houston')
    .openPopup();*/


let earthquakeData; //hold earthquake info
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
document.getElementById('search-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent form from reloading the page

    const query = document.getElementById('gsearch').value;
    console.log("User searched for:", query); // Just testing for now
});