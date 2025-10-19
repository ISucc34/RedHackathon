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

// Load earthquakes when page loads
getEarthquakes();
// Add a manual test blue marker to confirm icon works
if (document.getElementById('toggle-heatwaves').checked) {
    const center = map.getCenter();
    getHeatWaveData(center.lat, center.lng);
}

// -------------------------
// KMEANS CLUSTERING CLIENT
// -------------------------

// Small KMeans implementation (2D lat/lon) for client-side clustering
function kmeans(points, k = 4, maxIter = 50, seed = 123456789) {
  if (!points || points.length === 0) return null;
  // Deterministic kmeans++ initialization using a seeded RNG (reproducible)
  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  const rng = mulberry32(Number.isFinite(seed) ? seed : 123456789);
  const centroids = [];
  const n = points.length;
  const kActual = Math.min(k, n);

  // Choose first centroid deterministically using RNG
  let firstIdx = Math.floor(rng() * n);
  centroids.push([...points[firstIdx]]);

  // kmeans++: choose subsequent centroids with probability proportional to distance^2
  while (centroids.length < kActual) {
    // compute squared distances to nearest existing centroid
    const d2 = new Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dist = distanceSquared(points[i], centroids[c]);
        if (dist < minDist) minDist = dist;
      }
      d2[i] = minDist;
      total += minDist;
    }

    if (total === 0) {
      // All points identical or centroids cover all variance; pick arbitrary remaining points
      for (let i = 0; i < n && centroids.length < kActual; i++) {
        const p = points[i];
        // avoid adding duplicate centroid
        if (!centroids.some(c => c[0] === p[0] && c[1] === p[1])) {
          centroids.push([...p]);
        }
      }
      break;
    }

    // select index by weighted sampling using seeded RNG
    const threshold = rng() * total;
    let cumsum = 0;
    let chosen = -1;
    for (let i = 0; i < n; i++) {
      cumsum += d2[i];
      if (cumsum >= threshold) { chosen = i; break; }
    }
    if (chosen === -1) chosen = n - 1;

    const candidate = points[chosen];
    if (!centroids.some(c => c[0] === candidate[0] && c[1] === candidate[1])) {
      centroids.push([...candidate]);
    } else {
      // if duplicate, add next unused point deterministically
      for (let i = 0; i < n && centroids.length < kActual; i++) {
        const p = points[(chosen + i) % n];
        if (!centroids.some(c => c[0] === p[0] && c[1] === p[1])) {
          centroids.push([...p]); break;
        }
      }
    }
  }

  let assignments = new Array(points.length).fill(-1);
  for (let iter = 0; iter < maxIter; iter++) {
    let moved = false;
    // assignment step
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let best = 0;
      let bestDist = distanceSquared(p, centroids[0]);
      for (let c = 1; c < centroids.length; c++) {
        const d = distanceSquared(p, centroids[c]);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      if (assignments[i] !== best) {
        assignments[i] = best; moved = true;
      }
    }

    // update step
    const sums = Array.from({length: centroids.length}, () => [0,0]);
    const counts = new Array(centroids.length).fill(0);
    for (let i = 0; i < points.length; i++) {
      const a = assignments[i];
      sums[a][0] += points[i][0];
      sums[a][1] += points[i][1];
      counts[a]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] > 0) {
        centroids[c][0] = sums[c][0] / counts[c];
        centroids[c][1] = sums[c][1] / counts[c];
      }
    }

    if (!moved) break;
  }

  return { centroids, assignments };
}

function distanceSquared(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx*dx + dy*dy;
}

// Cluster visualization state
let clusterLayers = [];
let latestClusterResult = null; // store {centroids, assignments}
let clusterPredictionLayers = []; // overlays for predicted counts

// Create clusters from current earthquakeMarkers and draw them
function createClusters(k = 4, seed = null) {
  // Clear existing cluster layers
  clusterLayers.forEach(layer => map.removeLayer(layer));
  clusterLayers = [];

  // Gather points from earthquake markers
  const points = earthquakeMarkers.map(m => {
    const latlng = m.getLatLng();
    return [latlng.lat, latlng.lng];
  });
  // Deterministic sort to remove dependence on feed ordering (sort by lat then lon)
  points.sort((a, b) => {
    if (a[0] === b[0]) return a[1] - b[1];
    return a[0] - b[0];
  });
  if (points.length === 0) {
    alert('No earthquake points available to cluster yet.');
    return;
  }

  // If seed not provided, try to derive from prediction year for reproducibility
  if (seed === null) {
    const yearEl = document.getElementById('prediction-year');
    const yearVal = yearEl ? parseInt(yearEl.value) : NaN;
    seed = Number.isFinite(yearVal) ? yearVal : 123456789;
  }
  const result = kmeans(points, k, 80, seed);
  if (!result) return;
  latestClusterResult = result; // save for prediction mapping

  const colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf'];

  // draw centroids and convex hulls for each cluster
  for (let c = 0; c < result.centroids.length; c++) {
    const centroid = result.centroids[c];
    const assignedPoints = points.filter((p, i) => result.assignments[i] === c);

    // Draw small circle for centroid
    const centroidMarker = L.circleMarker([centroid[0], centroid[1]], {
      radius: 8,
      color: '#000',
      fillColor: colors[c % colors.length],
      fillOpacity: 0.9,
      weight: 1
    }).addTo(map).bindPopup(`Cluster ${c}: ${assignedPoints.length} points`);
    clusterLayers.push(centroidMarker);

    // If there are enough points, draw polygon hull
    if (assignedPoints.length >= 3) {
      const hull = convexHull(assignedPoints.map(p => [p[0], p[1]]));
      if (hull && hull.length >= 3) {
        const poly = L.polygon(hull, {
          color: colors[c % colors.length],
          fillColor: colors[c % colors.length],
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
        clusterLayers.push(poly);
      }
    } else if (assignedPoints.length > 0) {
      // Draw circles for small clusters
      assignedPoints.forEach(p => {
        const circle = L.circle([p[0], p[1]], {radius: 8000, color: colors[c % colors.length], fillOpacity: 0.12}).addTo(map);
        clusterLayers.push(circle);
      });
    }
  }
}

// Map a predicted total earthquake count to clusters and draw overlays
function mapPredictionToClusters(totalPredicted) {
  if (!latestClusterResult) {
    alert('No cluster data available. Enable clustering first.');
    return;
  }

  // Clear previous prediction overlays
  clusterPredictionLayers.forEach(l => map.removeLayer(l));
  clusterPredictionLayers = [];

  // Count points per cluster
  const counts = new Array(latestClusterResult.centroids.length).fill(0);
  latestClusterResult.assignments.forEach(a => { counts[a]++; });
  const totalPoints = counts.reduce((s,v) => s+v, 0) || 1;

  // For each cluster, compute predicted allocation proportional to historical points
  for (let c = 0; c < counts.length; c++) {
    const centroid = latestClusterResult.centroids[c];
    const proportion = counts[c] / totalPoints;
    const predictedForCluster = Math.round(totalPredicted * proportion);

    // Visualize as circle with radius proportional to predicted count
    const radius = 5000 + Math.max(0, predictedForCluster) * 100; // base 5km + per-event scaling
    const color = predictedForCluster > 0 ? '#ff0000' : '#999999';
    const circle = L.circle([centroid[0], centroid[1]], {
      radius: radius,
      color: color,
      fillColor: color,
      fillOpacity: 0.25,
      weight: 1
    }).addTo(map).bindPopup(`<strong>Predicted for cluster ${c}:</strong><br>${predictedForCluster.toLocaleString()} earthquakes (${(proportion*100).toFixed(1)}% of total)`);

    clusterPredictionLayers.push(circle);
  }

  console.log('Mapped prediction to clusters:', counts, 'total predicted', totalPredicted);
}

// Simple convex hull (Monotone chain) for lat/lon points
function convexHull(points) {
  if (!points || points.length < 3) return null;
  const pts = points.map(p => [p[1], p[0]]); // swap to [x, y] = [lon, lat]
  pts.sort((a,b) => a[0] === b[0] ? a[1]-b[1] : a[0]-b[0]);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length-1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  const hull = lower.concat(upper).map(p => [p[1], p[0]]); // map back to [lat, lon]
  return hull;
}

function cross(o, a, b) {
  return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
}

// Setup cluster UI controls
function setupClusterControls() {
  const clusterToggle = document.getElementById('toggle-clusters');
  const clusterK = document.getElementById('cluster-k');
  if (!clusterToggle || !clusterK) return;
  clusterToggle.addEventListener('change', () => {
    if (clusterToggle.checked) {
      createClusters(parseInt(clusterK.value) || 4);
    } else {
      clusterLayers.forEach(l => map.removeLayer(l)); clusterLayers = [];
    }
  });
  clusterK.addEventListener('change', () => {
    if (clusterToggle.checked) createClusters(parseInt(clusterK.value) || 4);
  });
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

/*document.getElementById('toggle-heatwaves').addEventListener('change', function() {
  if (this.checked) {
    // Optionally, you could refresh heatwave markers here
  } else {
    clearMarkers(heatwaveMarkers);
  }
});*/

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
    } catch (error) {
        console.error('Error making prediction:', error);
        alert('Error generating prediction. Please try again.');
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
    
    // Make initial prediction for current year
    setTimeout(() => {
        if (earthquakePredictionModel) {
            handleEarthquakePrediction();
        }
    }, 500);
}

// Call initialize when page loads
initialize();