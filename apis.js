// pages/api/weather.js

// ============================================
// 1. NATIONAL WEATHER SERVICE API FUNCTIONS
//    (These remain helper functions for the API route)
// ============================================

// Get weather alerts for a specific location (latitude, longitude)
async function getNWSAlerts(lat, lon) {
  try {
    // NWS recommends a User-Agent header
    const commonHeaders = {
      'User-Agent': 'YourWeatherApp/1.0 (your-email@example.com)', // Replace with your app name and contact
    };

    // Get the grid point for the location
    const pointResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`,
      { headers: commonHeaders }
    );
    if (!pointResponse.ok) {
      throw new Error(`NWS point API error: ${pointResponse.statusText}`);
    }
    const pointData = await pointResponse.json();
    
    // Check if properties exist to avoid errors
    if (!pointData.properties || !pointData.properties.forecastZone) {
        console.warn('NWS pointData.properties or forecastZone missing:', pointData);
        return [];
    }

    // Get active alerts for the zone
    const alertsUrl = pointData.properties.forecastZone;
    const zoneId = alertsUrl.split('/').pop(); // Extract zone ID from URL
    const alertsResponse = await fetch(
      `https://api.weather.gov/alerts/active?zone=${zoneId}`,
      { headers: commonHeaders }
    );
    if (!alertsResponse.ok) {
        throw new Error(`NWS alerts API error: ${alertsResponse.statusText}`);
    }
    const alertsData = await alertsResponse.json();
    
    return alertsData.features.map(alert => ({
      event: alert.properties.event,
      severity: alert.properties.severity,
      urgency: alert.properties.urgency,
      headline: alert.properties.headline,
      description: alert.properties.description,
      instruction: alert.properties.instruction,
      areaDesc: alert.properties.areaDesc,
      sent: alert.properties.sent, // Added useful timestamp
      ends: alert.properties.ends, // Added alert end time
    }));
  } catch (error) {
    console.error('Error fetching NWS alerts:', error.message);
    return [];
  }
}

// Get weather forecast
async function getNWSForecast(lat, lon) {
  try {
    const commonHeaders = {
      'User-Agent': 'YourWeatherApp/1.0 (your-email@example.com)',
    };

    const pointResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`,
      { headers: commonHeaders }
    );
    if (!pointResponse.ok) {
      throw new Error(`NWS point API error: ${pointResponse.statusText}`);
    }
    const pointData = await pointResponse.json();
    
    if (!pointData.properties || !pointData.properties.forecast) {
        console.warn('NWS pointData.properties or forecast missing:', pointData);
        return [];
    }

    const forecastUrl = pointData.properties.forecast;
    const forecastResponse = await fetch(forecastUrl, { headers: commonHeaders });
    if (!forecastResponse.ok) {
        throw new Error(`NWS forecast API error: ${forecastResponse.statusText}`);
    }
    const forecastData = await forecastResponse.json();
    
    return forecastData.properties.periods.map(period => ({
      name: period.name,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit, // Added unit
      windSpeed: period.windSpeed,
      windDirection: period.windDirection, // Added direction
      icon: period.icon, // Added icon URL
      shortForecast: period.shortForecast,
      detailedForecast: period.detailedForecast
    }));
  } catch (error) {
    console.error('Error fetching NWS forecast:', error.message);
    return [];
  }
}

// ============================================
// 2. USGS WATER DATA API FUNCTIONS
//    (These remain helper functions for the API route)
// ============================================

// Get real-time water data for flooding assessment
async function getUSGSWaterData(lat, lon, radius = 0.5) { // Adjusted default radius for clarity
  try {
    // Find sites near the location within a bounding box
    // bBox: minLon,minLat,maxLon,maxLat
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${lon - radius},${lat - radius},${lon + radius},${lat + radius}&parameterCd=00065,00060&siteStatus=active`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`USGS API error: ${response.statusText}`);
    }
    const data = await response.json();
    
    if (!data.value || !data.value.timeSeries) {
        console.warn('USGS: No timeSeries data found or data.value is missing.');
        return [];
    }
    
    return data.value.timeSeries.map(site => {
      const siteInfo = site.sourceInfo;
      const values = site.values[0]?.value; // Use optional chaining
      const latestValue = values ? values[values.length - 1] : null; // Get latest value

      if (!siteInfo || !siteInfo.geoLocation || !siteInfo.geoLocation.geogLocation || !latestValue) {
          console.warn('USGS: Incomplete site info or no latest value for a site:', site);
          return null; // Skip malformed entries
      }
      
      return {
        siteName: siteInfo.siteName,
        siteCode: siteInfo.siteCode[0]?.value,
        latitude: siteInfo.geoLocation.geogLocation.latitude,
        longitude: siteInfo.geoLocation.geogLocation.longitude,
        parameterName: site.variable.variableName,
        value: latestValue.value,
        dateTime: latestValue.dateTime,
        unit: site.variable.unit.unitCode
      };
    }).filter(Boolean); // Filter out any null entries from malformed data
  } catch (error) {
    console.error('Error fetching USGS water data:', error.message);
    return [];
  }
}

// ============================================
// 3. GOOGLE GEMINI API FUNCTIONS
//    (These MUST be called only from the server-side, e.g., this API route)
// ============================================

// Ensure GEMINI_API_KEY is only accessed server-side via environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateSafetyTips(alertType, location, userContext) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set. Cannot generate safety tips.');
    return 'Unable to generate personalized tips: API key missing.';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate 5 concise, actionable safety tips for someone experiencing a ${alertType} in ${location}. Context: ${userContext}. Keep each tip under 20 words and focus on immediate actions.`
            }]
          }]
        })
      }
    );
    
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    // Check if candidates and parts exist before accessing
    const safetyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return safetyText || 'Unable to generate personalized tips at this time.';
  } catch (error) {
    console.error('Error generating safety tips:', error.message);
    return 'Unable to generate personalized tips at this time.';
  }
}

async function generatePrepGuide(disasterType) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set. Cannot generate preparation guide.');
    return 'Unable to generate preparation guide: API key missing.';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a brief preparation guide for ${disasterType}. Include: 1) What to do before, 2) During the event, 3) After it passes. Keep it concise and actionable.`
            }]
          }]
        })
      }
    );
    
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const prepGuideText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return prepGuideText || null;
  } catch (error) {
    console.error('Error generating prep guide:', error.message);
    return null;
  }
}

// ============================================
// 4. NEXT.JS API ROUTE HANDLER
//    (This is the main entry point for requests from your frontend)
// ============================================

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  // 1. Basic Input Validation
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude format.' });
  }

  try {
    // 2. Fetch from NWS API and USGS API (in parallel for efficiency)
    const [alerts, forecast, waterData] = await Promise.all([
      getNWSAlerts(parsedLat, parsedLon),
      getNWSForecast(parsedLat, parsedLon),
      getUSGSWaterData(parsedLat, parsedLon)
    ]);

    // 3. Process with Gemini API (conditionally, after other data is fetched)
    let safetyTips = null;
    let preparationGuide = null;

    if (alerts.length > 0) {
      const primaryAlert = alerts[0]; // Take the first alert for generating tips
      safetyTips = await generateSafetyTips(
        primaryAlert.event,
        primaryAlert.areaDesc,
        'User is interested in immediate actions for family safety.'
      );
      // Example: Also generate a prep guide if a specific type of alert exists
      if (primaryAlert.event.includes('Flood') || primaryAlert.event.includes('Hurricane')) {
          preparationGuide = await generatePrepGuide(primaryAlert.event);
      }
    } else {
        // If no alerts, maybe generate a general "weather prep" guide
        preparationGuide = await generatePrepGuide('general severe weather');
    }

    // 4. Serve to frontend
    res.status(200).json({
      location: { lat: parsedLat, lon: parsedLon },
      alerts,
      forecast,
      waterData,
      safetyTips,
      preparationGuide,
    });

  } catch (error) {
    console.error('API Route Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch comprehensive weather data.', details: error.message });
  }
}