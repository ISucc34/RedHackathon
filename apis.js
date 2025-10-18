// ============================================
// 1. NATIONAL WEATHER SERVICE API
// ============================================

// Get weather alerts for a specific location (latitude, longitude)
async function getNWSAlerts(lat, lon) {
  try {
    // Get the grid point for the location
    const pointResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );
    const pointData = await pointResponse.json();
    
    // Get active alerts for the zone
    const alertsUrl = pointData.properties.forecastZone;
    const alertsResponse = await fetch(
      `https://api.weather.gov/alerts/active?zone=${alertsUrl.split('/').pop()}`
    );
    const alertsData = await alertsResponse.json();
    
    return alertsData.features.map(alert => ({
      event: alert.properties.event,
      severity: alert.properties.severity,
      urgency: alert.properties.urgency,
      headline: alert.properties.headline,
      description: alert.properties.description,
      instruction: alert.properties.instruction,
      areaDesc: alert.properties.areaDesc
    }));
  } catch (error) {
    console.error('Error fetching NWS alerts:', error);
    return [];
  }
}

// Get weather forecast
async function getNWSForecast(lat, lon) {
  try {
    const pointResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );
    const pointData = await pointResponse.json();
    
    const forecastUrl = pointData.properties.forecast;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();
    
    return forecastData.properties.periods.map(period => ({
      name: period.name,
      temperature: period.temperature,
      windSpeed: period.windSpeed,
      shortForecast: period.shortForecast,
      detailedForecast: period.detailedForecast
    }));
  } catch (error) {
    console.error('Error fetching NWS forecast:', error);
    return [];
  }
}

// ============================================
// 2. USGS WATER DATA API
// ============================================

// Get real-time water data for flooding assessment
async function getUSGSWaterData(lat, lon, radius = 50) {
  try {
    // Find sites near the location
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${lon-0.5},${lat-0.5},${lon+0.5},${lat+0.5}&parameterCd=00065,00060&siteStatus=active`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.value.timeSeries) return [];
    
    return data.value.timeSeries.map(site => {
      const siteInfo = site.sourceInfo;
      const values = site.values[0].value;
      const latestValue = values[values.length - 1];
      
      return {
        siteName: siteInfo.siteName,
        siteCode: siteInfo.siteCode[0].value,
        latitude: siteInfo.geoLocation.geogLocation.latitude,
        longitude: siteInfo.geoLocation.geogLocation.longitude,
        parameterName: site.variable.variableName,
        value: latestValue.value,
        dateTime: latestValue.dateTime,
        unit: site.variable.unit.unitCode
      };
    });
  } catch (error) {
    console.error('Error fetching USGS water data:', error);
    return [];
  }
}

// ============================================
// 3. GOOGLE GEMINI API
// ============================================

// Generate personalized safety tips using Gemini
async function generateSafetyTips(alertType, location, userContext) {
  const GEMINI_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your key
  
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
    
    const data = await response.json();
    const safetyText = data.candidates[0].content.parts[0].text;
    
    return safetyText;
  } catch (error) {
    console.error('Error generating safety tips:', error);
    return 'Unable to generate personalized tips at this time.';
  }
}

// Generate preparation guide
async function generatePrepGuide(disasterType) {
  const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
  
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
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating prep guide:', error);
    return null;
  }
}

// ============================================
// 4. COMPLETE EXAMPLE - Putting it all together
// ============================================

async function getNatureCallsData(lat, lon) {
  try {
    // Fetch all data in parallel
    const [alerts, forecast, waterData] = await Promise.all([
      getNWSAlerts(lat, lon),
      getNWSForecast(lat, lon),
      getUSGSWaterData(lat, lon)
    ]);
    
    // If there are active alerts, generate safety tips
    let safetyTips = null;
    if (alerts.length > 0) {
      const primaryAlert = alerts[0];
      safetyTips = await generateSafetyTips(
        primaryAlert.event,
        primaryAlert.areaDesc,
        'User at home with family'
      );
    }
    
    return {
      alerts,
      forecast,
      waterData,
      safetyTips,
      location: { lat, lon }
    };
  } catch (error) {
    console.error('Error fetching Nature Calls data:', error);
    return null;
  }
}

// ============================================
// USAGE EXAMPLE
// ============================================

// Example: Get data for Houston, TX
const houstonLat = 29.7604;
const houstonLon = -95.3698;

getNatureCallsData(houstonLat, houstonLon)
  .then(data => {
    console.log('Active Alerts:', data.alerts);
    console.log('Forecast:', data.forecast);
    console.log('Water Conditions:', data.waterData);
    console.log('Safety Tips:', data.safetyTips);
  });

// ============================================
// NEXT.JS API ROUTE EXAMPLE (pages/api/weather.js)
// ============================================

// This would go in your Next.js backend
export default async function handler(req, res) {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }
  
  try {
    const data = await getNatureCallsData(parseFloat(lat), parseFloat(lon));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}