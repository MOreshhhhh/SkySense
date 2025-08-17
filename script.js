const API_KEY = "6ac533dcc9e4557deec43a22bc512e68"; // replace with your OpenWeather API key

async function getAirQuality() {
  const city = document.getElementById("city").value;
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "Loading...";

  if (!city) {
    resultsDiv.innerHTML = "<p>Please enter a city name.</p>";
    return;
  }

  try {
    // Step 1: Get latitude and longitude from city name
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found");

    const { lat, lon, name } = geoData[0];

    // Step 2: Get air quality
    const airRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    const airData = await airRes.json();

    const aqi = airData.list[0].main.aqi;
    const components = airData.list[0].components;

    let aqiText = "";
    let aqiClass = "";

    switch (aqi) {
      case 1: aqiText = "Good"; aqiClass = "aqi-good"; break;
      case 2: aqiText = "Fair"; aqiClass = "aqi-moderate"; break;
      case 3: aqiText = "Moderate"; aqiClass = "aqi-moderate"; break;
      case 4: aqiText = "Poor"; aqiClass = "aqi-bad"; break;
      case 5: aqiText = "Very Poor"; aqiClass = "aqi-bad"; break;
      default: aqiText = "Unknown";
    }

    resultsDiv.innerHTML = `
      <h3>Air Quality in ${name}</h3>
      <p class="${aqiClass}"><strong>AQI:</strong> ${aqi} (${aqiText})</p>
      <h4>Pollutants (µg/m³):</h4>
      <ul>
        <li>CO: ${components.co}</li>
        <li>NO: ${components.no}</li>
        <li>NO₂: ${components.no2}</li>
        <li>O₃: ${components.o3}</li>
        <li>SO₂: ${components.so2}</li>
        <li>PM2.5: ${components.pm2_5}</li>
        <li>PM10: ${components.pm10}</li>
        <li>NH₃: ${components.nh3}</li>
      </ul>
    `;
  } catch (err) {
    resultsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}
