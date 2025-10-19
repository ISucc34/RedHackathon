let map = L.map('map', {
  zoomControl: false 
}).setView([31.0, -100.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

// Data holders & marker arrays
let earthquakeData;
let wildfireMarkers = [];
let earthquakeMarkers = [];
let heatwaveMarkers = [];
let floodMarkers = [];
let heatLayer = null;
let heatPoints = [];
let centerHeatMarker = null;

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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
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

    // If clustering is enabled, update clusters now that markers are available
    const clusterToggleEl = document.getElementById('toggle-clusters');
    const clusterKEl = document.getElementById('cluster-k');
    if (clusterToggleEl && clusterToggleEl.checked) {
      const k = clusterKEl ? parseInt(clusterKEl.value) || 4 : 4;
      createClusters(k);
    }
}
function getEarthquakesNear(lat, lon, deltaDeg = 1.0) {
  clearMarkers(earthquakeMarkers);

  const minLon = lon - deltaDeg;
  const minLat = lat - deltaDeg;
  const maxLon = lon + deltaDeg;
  const maxLat = lat + deltaDeg;

  // Use the USGS API with bounds
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${getPastDate(7)}&minlatitude=${minLat}&maxlatitude=${maxLat}&minlongitude=${minLon}&maxlongitude=${maxLon}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const earthquakes = data.features || [];
      earthquakes.forEach(quake => {
        const coords = quake.geometry.coordinates;
        const lat = coords[1];
        const lon = coords[0];
        const mag = quake.properties.mag;
        const place = quake.properties.place;
        const time = new Date(quake.properties.time);

        const marker = L.marker([lat, lon], { icon: greenIcon }).addTo(map)
          .bindPopup(`
            <b>Magnitude:</b> ${mag}<br>
            <b>Location:</b> ${place}<br>
            <b>Time:</b> ${time.toLocaleString()}
          `);
        earthquakeMarkers.push(marker);
      });
    })
    .catch(error => {
      console.error('Error fetching nearby earthquakes:', error);
    });
}

// Helper to get a date string from X days ago (for USGS API)
function getPastDate(daysAgo = 7) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}


// Load earthquakes when page loads
getEarthquakes();
// Add a manual test blue marker to confirm icon works
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
        const searchMarker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`<b>Search Result:</b> ${query}<br><b>Lat:</b> ${parseFloat(lat).toFixed(3)}, Lon: ${parseFloat(lon).toFixed(3)}`)
          .openPopup();     
        if (document.getElementById('toggle-heatwaves').checked) {
          // Fetch heat data for a small area around the searched location
          getHeatWavesNear(lat, lon, 0.5, 3, 30);
        }
        if (document.getElementById('toggle-earthquakes').checked) {
          getEarthquakesNear(lat, lon, 1); // ~100km radius
        }
        // Also fetch nearby wildfires and floods around the searched location if toggled
        if (document.getElementById('toggle-wildfires').checked) {
          getWildfiresNear(lat, lon, 1); // 1 degree ~ ~111km
        }
        if (document.getElementById('toggle-floods').checked) {
          getFloodsNear(lat, lon, 1);
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
        const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
          .bindPopup(`<b>Temperature:</b> ${temp}°C`);
        heatwaveMarkers.push(marker);
      } else {
        console.log('Temperature below threshold for heatwave marker:', temp);
      }
    })
    .catch(error => console.error('Error fetching heatwave data:', error));
}

// Helper: sample a small grid around a point and mark heatwave candidates
// centerLat, centerLon, radiusDeg, gridSize (odd number), thresholdC
function getHeatWavesNear(centerLat, centerLon, radiusDeg = 0.5, gridSize = 3, thresholdC = 30) {
  clearMarkers(heatwaveMarkers);
  const half = Math.floor(gridSize / 2);
  const promises = [];
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      const lat = centerLat + (i * (radiusDeg / half || 0));
      const lon = centerLon + (j * (radiusDeg / half || 0));
      // queue API call for each grid point
      promises.push(fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&timezone=UTC`)
        .then(res => res.json())
        .then(data => {
          const temp = data.current_weather?.temperature;
          if (temp === undefined) return;
          console.log(`Heat sample at [${lat},${lon}] = ${temp}°C`);
          if (temp >= thresholdC) {
            const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
              .bindPopup(`<b>Heatwave (sample):</b> ${temp}°C at [${lat.toFixed(3)}, ${lon.toFixed(3)}]`);
            heatwaveMarkers.push(marker);
          }
        })
        .catch(err => console.error('Error sampling heat data:', err)));
    }
  }
  Promise.all(promises).then(() => console.log('Heat sampling complete.'));
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
// On load, fetch heatwave candidates across Texas if heatwave toggle is checked
if (document.getElementById('toggle-heatwaves').checked) {
  getHeatWavesForTexas();
}
// Always add the center red heat marker so it's visible on load
if (document.getElementById('toggle-heatwaves').checked) {
  addCenterHeatMarker();
}

// Function: sample a grid across Texas using Open-Meteo batch queries and add red markers for high temps
function getHeatWavesForTexas(stepDeg = 0.25, thresholdC = 30) {
  clearMarkers(heatwaveMarkers);
  clearHeatLayer();
  const minLon = -106.645646, minLat = 25.837377, maxLon = -93.508039, maxLat = 36.500704;
  const lats = [];
  const lons = [];
  for (let lat = minLat; lat <= maxLat; lat = +(lat + stepDeg).toFixed(6)) lats.push(+lat.toFixed(6));
  for (let lon = minLon; lon <= maxLon; lon = +(lon + stepDeg).toFixed(6)) lons.push(+lon.toFixed(6));

  // Build coordinate pairs
  const coords = [];
  lats.forEach(lat => {
    lons.forEach(lon => coords.push({ lat, lon }));
  });

  if (coords.length === 0) return;
  console.log(`Sampling ${coords.length} points across Texas for heatwaves (step=${stepDeg}°)`);

  const batchSize = 50; // number of coords per batch request
  const batches = [];
  for (let i = 0; i < coords.length; i += batchSize) batches.push(coords.slice(i, i + batchSize));

  heatPoints = [];
  const fetches = batches.map(batch => {
    const latParam = batch.map(c => c.lat).join(',');
    const lonParam = batch.map(c => c.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latParam}&longitude=${lonParam}&current_weather=true&temperature_unit=celsius&timezone=UTC`;
    return fetch(url)
      .then(res => res.json())
      .then(resp => {
        // resp may be an array (one item per input coord) or a single object when batch-size==1
        if (Array.isArray(resp)) {
          resp.forEach(item => {
            const temp = item.current_weather?.temperature;
            if (temp === undefined) return;
            const lat = item.latitude ?? item.lat;
            const lon = item.longitude ?? item.lon;
            // compute intensity for heatmap (normalize a bit)
            const intensity = Math.max(0, Math.min(1, (temp - (thresholdC - 5)) / 15));
            heatPoints.push([lat, lon, intensity]);
            if (temp >= thresholdC) {
              const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
                .bindPopup(`<b>Heatwave:</b> ${temp}°C at [${lat.toFixed(3)}, ${lon.toFixed(3)}]`);
              heatwaveMarkers.push(marker);
            }
          });
        } else if (resp && resp.current_weather) {
          const temp = resp.current_weather.temperature;
          if (temp >= thresholdC) {
            const lat = resp.latitude ?? resp.lat ?? batch[0].lat;
            const lon = resp.longitude ?? resp.lon ?? batch[0].lon;
            const intensity = Math.max(0, Math.min(1, (temp - (thresholdC - 5)) / 15));
            heatPoints.push([lat, lon, intensity]);
            const marker = L.marker([lat, lon], { icon: redIcon }).addTo(map)
              .bindPopup(`<b>Heatwave:</b> ${temp}°C at [${lat.toFixed(3)}, ${lon.toFixed(3)}]`);
            heatwaveMarkers.push(marker);
          }
        }
      })
      .catch(err => console.error('Error fetching heat batch:', err));
  });

  Promise.all(fetches).then(() => console.log(`Heat sampling complete. Markers added: ${heatwaveMarkers.length}`));
  // after all fetches, render heatmap layer
  Promise.all(fetches).then(() => {
    if (heatPoints.length > 0) {
      if (heatLayer) {
        map.removeLayer(heatLayer);
        heatLayer = null;
      }
      // Leaflet.heat expects [lat, lon, intensity]
      heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 10 });
      if (document.getElementById('toggle-heatwaves').checked) {
        heatLayer.addTo(map);
      }
      console.log(`Heatmap rendered with ${heatPoints.length} points.`);
    } else {
      console.log('No heat points to render.');
    }
  });
}

function clearHeatLayer() {
  if (heatLayer) {
    try { map.removeLayer(heatLayer); } catch (e) {}
    heatLayer = null;
  }
  heatPoints = [];
}

function addCenterHeatMarker() {
  try {
    // remove previous center marker if exists
    if (centerHeatMarker) {
      try { map.removeLayer(centerHeatMarker); } catch (e) {}
      centerHeatMarker = null;
    }
    const c = map.getCenter();
    centerHeatMarker = L.marker([c.lat, c.lng], { icon: redIcon }).bindPopup('<b>Center Heat Marker</b>');
    if (document.getElementById('toggle-heatwaves').checked) centerHeatMarker.addTo(map);
  } catch (e) {
    console.error('Failed to add center heat marker:', e);
  }
}

function removeCenterHeatMarker() {
  if (centerHeatMarker) {
    try { map.removeLayer(centerHeatMarker); } catch (e) {}
    centerHeatMarker = null;
  }
}

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
    getHeatWavesForTexas(); // or re-fetch if you want
    addCenterHeatMarker();
    if (heatLayer && heatPoints.length > 0) {
      heatLayer.addTo(map);
    }
  }
  else {
    clearMarkers(heatwaveMarkers);
    removeCenterHeatMarker();
    clearHeatLayer();
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
    });
  })
  .catch(err => console.error('Error fetching wildfires:', err));
}

// Helper: fetch wildfires near a point using a small bbox
function getWildfiresNear(lat, lon, deltaDeg = 0.5) {
  clearMarkers(wildfireMarkers);
  const minLon = lon - deltaDeg;
  const minLat = lat - deltaDeg;
  const maxLon = lon + deltaDeg;
  const maxLat = lat + deltaDeg;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
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
      });
    })
    .catch(err => console.error('Error fetching nearby wildfires:', err));
}

// Helper: fetch floods near a point using a small bbox (EONET flood events)
function getFloodsNear(lat, lon, deltaDeg = 0.5) {
  clearMarkers(floodMarkers);
  const minLon = lon - deltaDeg;
  const minLat = lat - deltaDeg;
  const maxLon = lon + deltaDeg;
  const maxLat = lat + deltaDeg;
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=floods&bbox=${bbox}`)
    .then(res => res.json())
    .then(data => {
      if (!data.events) return;
      data.events.forEach(event => {
        const geometry = event.geometry?.find(g => g.coordinates && g.type === 'Point') || event.geometry?.[0];
        if (!geometry || !geometry.coordinates) return;
        const lon = geometry.coordinates[0];
        const lat = geometry.coordinates[1];
        const title = event.title || 'Flood Event';
        const marker = L.marker([lat, lon], { icon: blueIcon }).addTo(map).bindPopup(`<b>${title}</b><br>${event.description || ''}`);
        floodMarkers.push(marker);
      });
    })
    .catch(err => console.error('Error fetching nearby floods:', err));
}

function getFloods() {
    clearMarkers(floodMarkers);
    // Use NASA EONET API for global flood events
    fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=floods')
      .then(res => res.json())
      .then(data => {
        console.log('Flood data from EONET:', data);
        if (!data.events || data.events.length === 0) {
          alert('No active flood events found worldwide at this time.');
          return;
        }
        let markerCount = 0;
        data.events.forEach(event => {
          // Use the first geometry with coordinates (usually a point or polygon)
          const geometry = event.geometry?.find(g => g.coordinates && g.type === 'Point') || event.geometry?.[0];
          if (!geometry || !geometry.coordinates) {
            console.log('No valid geometry for event:', event);
            return;
          }
          const lon = geometry.coordinates[0];
          const lat = geometry.coordinates[1];
          const title = event.title || 'Flood Event';
          const date = geometry.date || '';
          const desc = event.description || '';
          const marker = L.marker([lat, lon], { icon: blueIcon }).addTo(map)
            .bindPopup(`
              <b>${title}</b><br>
              <b>Date:</b> ${date ? new Date(date).toLocaleDateString() : 'N/A'}<br>
              ${desc}
            `);
          floodMarkers.push(marker);
          markerCount++;
        });
        if (markerCount === 0) {
          alert('No valid flood markers found in EONET data.');
        }
      })
      .catch(err => console.error('Error fetching EONET floods:', err));
}

document.getElementById('toggle-floods').addEventListener('change', function () {
  if (this.checked) {
    getFloods();
  } else {
    clearMarkers(floodMarkers);
  }
});

// ==========================================
// EARTHQUAKE PREDICTION MODEL IMPLEMENTATION
// ==========================================

let earthquakePredictionModel;
let lastPredictionValue = null;

// Initialize the earthquake prediction model
function initializePredictionModel() {
    try {
        earthquakePredictionModel = new EarthquakePredictionModel();
        console.log('Earthquake prediction model loaded successfully');
        
        // Display model info
        const modelInfo = earthquakePredictionModel.getModelInfo();
        document.getElementById('model-info').innerHTML = `
            <small>
                <strong>Model:</strong> ${modelInfo.modelType}<br>
                <strong>Accuracy:</strong> ${modelInfo.varianceExplained} of variance explained<br>
                <strong>Trend:</strong> ${modelInfo.interpretation}
            </small>
        `;
    } catch (error) {
        console.error('Error loading prediction model:', error);
        document.getElementById('prediction-results').innerHTML = 
            '<div style="color: red;">Error: Prediction model not available</div>';
    }
}

// Handle earthquake prediction
function handleEarthquakePrediction() {
    if (!earthquakePredictionModel) {
        alert('Prediction model not loaded. Please refresh the page.');
        return;
    }
    
    const yearInput = document.getElementById('prediction-year');
    const year = parseInt(yearInput.value);
    
    // Validate year
    const validation = earthquakePredictionModel.validateYear(year);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }
    
    // Make prediction
    try {
    showSpinner('prediction-spinner');
        const prediction = earthquakePredictionModel.predictSingleYear(year);
        
        // Display results
        document.getElementById('prediction-output').innerHTML = `
            <div class="prediction-result">
                <h3>📊 Prediction for ${year}:</h3>
                <div class="prediction-number">${prediction.toLocaleString()}</div>
                <div class="prediction-label">Predicted Earthquakes</div>
                <div class="prediction-trend">
                    ${getPredictionTrend(year)}
                </div>
            </div>
        `;
        
        // Also show multi-year trend
        showMultiYearTrend(year);
        
        console.log(`Predicted ${prediction} earthquakes for ${year}`);
  lastPredictionValue = prediction;
  hideSpinner('prediction-spinner');
    } catch (error) {
        console.error('Error making prediction:', error);
        alert('Error generating prediction. Please try again.');
    hideSpinner('prediction-spinner');
    }
}

// Get prediction trend information
function getPredictionTrend(year) {
    const currentYear = new Date().getFullYear();
    const currentPrediction = earthquakePredictionModel.predictSingleYear(currentYear);
    const yearPrediction = earthquakePredictionModel.predictSingleYear(year);
    
    const difference = yearPrediction - currentPrediction;
    const percentChange = ((difference / currentPrediction) * 100).toFixed(1);
    
    if (difference > 0) {
        return `📈 ${Math.abs(difference).toLocaleString()} more than ${currentYear} (+${percentChange}%)`;
    } else if (difference < 0) {
        return `📉 ${Math.abs(difference).toLocaleString()} fewer than ${currentYear} (${percentChange}%)`;
    } else {
        return `➡️ Similar to ${currentYear}`;
    }
}

// Show multi-year trend
function showMultiYearTrend(centerYear) {
    const startYear = centerYear - 2;
    const endYear = centerYear + 2;
    const predictions = earthquakePredictionModel.predictYearRange(startYear, endYear);
    
    let trendHtml = '<div class="trend-section"><h4>5-Year Trend:</h4><ul>';
    predictions.forEach(pred => {
        const isCurrent = pred.year === centerYear;
        const style = isCurrent ? 'font-weight: bold; color: #ff6b35;' : '';
        trendHtml += `<li style="${style}">${pred.year}: ${pred.predictedEarthquakes.toLocaleString()}</li>`;
    });
    trendHtml += '</ul></div>';
    
    document.getElementById('prediction-output').innerHTML += trendHtml;
}

// Setup prediction controls
function setupPredictionControls() {
    const predictButton = document.getElementById('predict-button');
    const yearInput = document.getElementById('prediction-year');
  const mapPredictButton = document.getElementById('map-predict-button');
    
    if (predictButton) {
        predictButton.addEventListener('click', handleEarthquakePrediction);
    }
    
    if (yearInput) {
        yearInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleEarthquakePrediction();
            }
        });
        
        // Auto-predict when year changes
        yearInput.addEventListener('change', handleEarthquakePrediction);
    }
  if (mapPredictButton) {
    mapPredictButton.addEventListener('click', function() {
      if (!lastPredictionValue) {
        alert('Run a prediction first, then map it to clusters.');
        return;
      }
      mapPredictionToClusters(lastPredictionValue);
    });
  }
}

// Initialize everything when page loads
function initialize() {
    initializePredictionModel();
    setupPredictionControls();
  setupClusterControls();
  setupSidebarToggle();
    
    // Make initial prediction for current year
    setTimeout(() => {
        if (earthquakePredictionModel) {
            handleEarthquakePrediction();
        }
    }, 500);
}

// Call initialize when page loads
initialize();