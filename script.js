const API_KEY = "6ac533dcc9e4557deec43a22bc512e68";

// DOM references
const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const results = document.getElementById("results");
const loader = document.getElementById("loader");
const flagEl = document.getElementById("country-flag");
const cityNameEl = document.getElementById("city-name");
const coordsEl = document.getElementById("coords");
const aqiValueEl = document.getElementById("aqi-value");
const aqiTextEl = document.getElementById("aqi-text");
const gaugeCanvas = document.getElementById("gaugeCanvas");
const gaugeNumber = document.getElementById("gauge-number");
const healthTip = document.getElementById("health-tip");
const pollutantsDiv = document.getElementById("pollutants");

const POLLUTANT_META = {
  pm2_5: { icon: "🌫️", label: "PM2.5", tip: "Fine particles <2.5µm. From smoke, vehicles, industry." },
  pm10: { icon: "💨", label: "PM10", tip: "Coarse particles <10µm. Dust, road, construction." },
  o3: { icon: "🌀", label: "O₃", tip: "Ground-level ozone. Forms in sunlight, irritates lungs." },
  no2: { icon: "🛑", label: "NO₂", tip: "From traffic & power plants. Lung irritant." },
  so2: { icon: "🌋", label: "SO₂", tip: "From burning fossil fuels. Causes irritation." },
  co: { icon: "🔥", label: "CO", tip: "Incomplete combustion. Dangerous at high levels." },
  nh3: { icon: "🧫", label: "NH₃", tip: "From agriculture & waste." },
  no: { icon: "🧪", label: "NO", tip: "Combustion byproduct." }
};

const aqiUI = {
  1: { label: "Good", tip: "Air is clean. Enjoy outdoor activities.", icon: "😊", bodyClass: "body-good" },
  2: { label: "Fair", tip: "Acceptable. Sensitive groups stay aware.", icon: "🙂", bodyClass: "body-fair" },
  3: { label: "Moderate", tip: "Some may feel effects. Shorten outdoor exposure.", icon: "😐", bodyClass: "body-moderate" },
  4: { label: "Poor", tip: "Limit outdoor exertion. Consider a mask.", icon: "😷", bodyClass: "body-poor" },
  5: { label: "Very Poor", tip: "Avoid outdoor activities. Stay indoors.", icon: "🚫", bodyClass: "body-verypoor" }
};

let prevAQI = 0;

// Ensure JS runs after DOM is ready
document.addEventListener("DOMContentLoaded", () => {

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return alert("Please enter a city name");
    showLoader(true);
    await fetchAQI(city);
    showLoader(false);
  });

});

function showLoader(show = true) {
  if (show) {
    loader.classList.remove("hidden");
    results.classList.add("hidden");
  } else {
    loader.classList.add("hidden");
    results.classList.remove("hidden");
  }
}

async function fetchAQI(city) {
  try {
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`);
    const geo = await geoRes.json();
    if (!geo || geo.length === 0) throw new Error("City not found");
    const { name, country, lat, lon } = geo[0];

    const airRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const air = await airRes.json();
    if (!air.list || air.list.length === 0) throw new Error("No air data available");

    render({ name, country, lat, lon }, air.list[0]);
  } catch (err) {
    alert(err.message || "Something went wrong");
  }
}

function render(loc, data) {
  const aqi = data.main.aqi;
  prevAQI = Number(aqiValueEl.textContent) || 0;
  const comps = data.components || {};

  flagEl.textContent = toFlag(loc.country);
  cityNameEl.textContent = `${loc.name}, ${loc.country}`;
  coordsEl.textContent = `Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`;

  const ui = aqiUI[aqi] || aqiUI[1];
  aqiTextEl.textContent = ui.label;
  animateCountUp(aqiValueEl, prevAQI, aqi, 800);
  animateGauge(aqi);
  applyBackgroundByAQI(aqi);

  healthTip.className = `health-tip ${ui.bodyClass} fade-in`;
  healthTip.textContent = `${ui.icon} ${ui.tip}`;

  // Pollutants
  pollutantsDiv.innerHTML = "";
  const order = ["pm2_5", "pm10", "o3", "no2", "so2", "co", "nh3", "no"];
  let maxVal = 1;
  order.forEach(k => { if (comps[k] !== undefined) maxVal = Math.max(maxVal, Math.abs(Number(comps[k]))); });
  maxVal = Math.max(maxVal, 50);

  order.forEach(key => {
    if (!(key in comps)) return;
    const val = Number(comps[key] || 0);
    const percent = Math.min(100, Math.round((Math.abs(val) / maxVal) * 100));
    const meta = POLLUTANT_META[key] || { icon: "❓", label: key, tip: "" };
    const card = document.createElement("div");
    card.className = "card tip fade-in";
    card.tabIndex = 0;
    card.innerHTML = `
      <span class="icon" aria-hidden="true">${meta.icon}</span>
      <div class="label">${meta.label}</div>
      <div class="value">${val}</div>
      <div class="progress-wrap"><div class="progress" style="width:${percent}%"></div></div>
      <div class="tip">ⓘ<span class="tiptext">${meta.tip}</span></div>
    `;
    pollutantsDiv.appendChild(card);
  });
}

function toFlag(countryCode) {
  if (!countryCode) return "";
  return String.fromCodePoint(...countryCode.toUpperCase().split("").map(c => 127397 + c.charCodeAt()));
}

function applyBackgroundByAQI(aqi) {
  document.body.classList.remove("body-good", "body-fair", "body-moderate", "body-poor", "body-verypoor");
  document.body.classList.add(aqiUI[aqi]?.bodyClass || "body-moderate");
}

function animateCountUp(el, start, end, duration = 900) {
  const diff = end - start;
  let startTime;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    el.textContent = Math.floor(start + diff * easeOutQuad(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function easeOutQuad(x) { return 1 - (1 - x) * (1 - x); }

function animateGauge(aqi) {
  const ctx = gaugeCanvas.getContext("2d");
  const w = gaugeCanvas.width;
  const h = gaugeCanvas.height;
  ctx.clearRect(0, 0, w, h);

  gaugeNumber.textContent = aqi;
  const colors = {1:"#8EDF8F",2:"#F4E47C",3:"#F8C966",4:"#F86060",5:"#C3477E"};
  const startAngle = 0.75 * Math.PI;
  const endAngle = 2.25 * Math.PI;
  const range = endAngle - startAngle;
  const targetAngle = startAngle + range * (aqi/5);
  let currAngle = startAngle;
  const steps = 60;
  let i = 0;

  function draw() {
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    ctx.arc(w/2,h/2,56,startAngle,endAngle);
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#ececec";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w/2,h/2,56,startAngle,currAngle);
    ctx.lineWidth = 16;
    ctx.strokeStyle = colors[aqi] || "#999";
    ctx.stroke();

    currAngle = startAngle + (targetAngle-startAngle)*(i/steps);
    i++;
    if(i<=steps) requestAnimationFrame(draw);
  }
  draw();
}
