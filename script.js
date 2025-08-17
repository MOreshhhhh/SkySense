const API_KEY = "6ac533dcc9e4557deec43a22bc512e68"; 
const input = document.getElementById("cityInput");
const btn = document.getElementById("searchBtn");
const loader = document.getElementById("loader");
const cityCard = document.getElementById("cityCard");
const cityNameEl = document.getElementById("cityName");
const countryFlagEl = document.getElementById("countryFlag");
const adminAreaEl = document.getElementById("adminArea");
const coordsEl = document.getElementById("coords");
const aqiLabelEl = document.getElementById("aqiLabel");

const aqiSection = document.getElementById("aqiSection");
const aqiBanner = document.getElementById("aqiBanner");
const gaugeProgress = document.getElementById("gaugeProgress");
const gaugeText = document.getElementById("gaugeText");

const pollutantsGrid = document.getElementById("pollutants");
const health = document.getElementById("health");

// Pollutant meta (emoji/icon + nice label + display max for gauge %)
const POLLUTANT_META = {
  co:    { icon:"🔥", label:"CO",    max: 2000 },
  no:    { icon:"🧪", label:"NO",    max: 400 },
  no2:   { icon:"🛑", label:"NO₂",   max: 400 },
  o3:    { icon:"🌀", label:"O₃",    max: 300 },
  so2:   { icon:"🌋", label:"SO₂",   max: 300 },
  pm2_5: { icon:"🌫️", label:"PM2.5", max: 200 },
  pm10:  { icon:"💨", label:"PM10",  max: 300 },
  nh3:   { icon:"🧫", label:"NH₃",   max: 200 }
};

// Helpers
const aqiInfo = (aqi) => {
  // 1..5
  switch (aqi){
    case 1: return {label:"Good", chip:"aqi-good", bg:"aqi-good-bg", color:"#16a34a", icon:"🌿",
                    noticeClass:"notice-good",
                    msg:"Air is clean. Enjoy outdoor activities."};
    case 2: return {label:"Fair", chip:"aqi-fair", bg:"aqi-fair-bg", color:"#f59e0b", icon:"🙂",
                    noticeClass:"notice-good",
                    msg:"Air is acceptable. Sensitive groups should stay aware."};
    case 3: return {label:"Moderate", chip:"aqi-moderate", bg:"aqi-moderate-bg", color:"#f59e0b", icon:"😐",
                    noticeClass:"notice-warn",
                    msg:"Some may experience effects. Consider shorter outdoor exposure."};
    case 4: return {label:"Poor", chip:"aqi-bad", bg:"aqi-bad-bg", color:"#dc2626", icon:"😷",
                    noticeClass:"notice-bad",
                    msg:"Limit outdoor exertion. Masks and purifiers recommended."};
    case 5: return {label:"Very Poor", chip:"aqi-bad", bg:"aqi-bad-bg", color:"#b91c1c", icon:"🚫",
                    noticeClass:"notice-bad",
                    msg:"Avoid outdoor activities. Stay indoors if possible."};
    default: return {label:"Unknown", chip:"", bg:"aqi-good-bg", color:"#6b7280", icon:"❓", noticeClass:"", msg:""};
  }
};

function countryCodeToFlagEmoji(cc){
  if (!cc) return "🏳️";
  // Convert ISO-2 to regional indicator symbols
  const code = cc.trim().toUpperCase();
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + (c.charCodeAt(0)-65)));
}

function setBodyBgClass(bgClass){
  const body = document.body;
  body.classList.remove("aqi-good-bg","aqi-fair-bg","aqi-moderate-bg","aqi-bad-bg");
  body.classList.add(bgClass, "bg-animated");
}

function setGauge(value01to1, color){
  // SVG circle with r=52 -> circumference:
  const r = 52;
  const C = 2 * Math.PI * r;
  gaugeProgress.setAttribute("stroke-dasharray", C.toFixed(2));
  const offset = C * (1 - value01to1);
  gaugeProgress.setAttribute("stroke-dashoffset", offset.toFixed(2));
  gaugeProgress.style.stroke = color;
}

function formatNum(n){ return Number(n).toFixed(1); }

function percentOf(val, max){
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (val / max) * 100));
}

function showLoader(on){
  loader.classList.toggle("hidden", !on);
}

function showSections(on){
  cityCard.classList.toggle("hidden", !on);
  aqiSection.classList.toggle("hidden", !on);
  pollutantsGrid.classList.toggle("hidden", !on);
  health.classList.toggle("hidden", !on);
}

// Events
btn.addEventListener("click", handleSearch);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

function handleSearch(){
  const q = input.value.trim();
  if (!q){
    wiggle();
    return;
  }
  fetchCityAndAQI(q);
}

function wiggle(){
  const box = document.querySelector(".search-box");
  box.style.animation = "shake .4s ease";
  setTimeout(() => box.style.animation = "", 420);
}

// Core
async function fetchCityAndAQI(query){
  try{
    showSections(false);
    showLoader(true);

    // 1) Geocode
    const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`);
    const geo = await geoRes.json();
    if (!Array.isArray(geo) || geo.length === 0) throw new Error("City not found");

    const { name, state, country, lat, lon } = geo[0];

    // 2) AQI
    const airRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const air = await airRes.json();

    showLoader(false);

    renderUI({ name, state, country, lat, lon }, air);
  }catch(err){
    showLoader(false);
    showSections(false);
    pollutantsGrid.innerHTML = "";
    aqiBanner.textContent = "";
    health.textContent = "";
    cityCard.classList.add("hidden");
    // error feedback
    const results = document.createElement("div");
    results.style.color = "red";
    results.style.textAlign = "center";
    results.style.marginTop = "12px";
    results.textContent = err.message || "Something went wrong";
    // insert or replace beneath search box
    const old = document.querySelector(".container > .err");
    if (old) old.remove();
    results.classList.add("err");
    document.querySelector(".container").appendChild(results);
    wiggle();
  }
}

function renderUI(loc, air){
  const aqi = air?.list?.[0]?.main?.aqi ?? 0;
  const comps = air?.list?.[0]?.components ?? {};

  // City card
  cityNameEl.textContent = loc.name || "Unknown";
  countryFlagEl.textContent = countryCodeToFlagEmoji(loc.country);
  adminAreaEl.textContent = loc.state ? loc.state + ", " + (loc.country || "") : (loc.country || "");
  coordsEl.textContent = `Lat ${formatNum(loc.lat)}, Lon ${formatNum(loc.lon)}`;
  aqiLabelEl.textContent = `AQI: ${aqi || "—"}`;
  cityCard.classList.remove("hidden");

  // AQI visuals
  const info = aqiInfo(aqi);
  setBodyBgClass(info.bg);

  // Gauge: map AQI 1..5 to 0..1
  const gaugeVal = aqi ? (aqi - 1) / 4 : 0;
  setGauge(gaugeVal, info.color);
  gaugeText.textContent = aqi ? `${aqi}` : "—";

  // Banner
  aqiBanner.innerHTML = `
    <div>${info.icon} <strong>Air Quality:</strong> ${info.label}</div>
    <div class="aqi-chip ${info.chip}">${info.label}</div>
  `;
  aqiSection.classList.remove("hidden");

  // Pollutants grid
  const order = ["pm2_5","pm10","o3","no2","so2","co","no","nh3"];
  pollutantsGrid.innerHTML = "";
  order.forEach(key => {
    if (!(key in comps)) return;
    const meta = POLLUTANT_META[key] || {icon:"🧪",label:key.toUpperCase(),max:100};
    const val = Number(comps[key]);
    const pct = percentOf(val, meta.max);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="icon">${meta.icon}</div>
      <div class="label">${meta.label}</div>
      <div class="value">${val.toFixed(1)} µg/m³</div>
      <div class="progress"><div class="fill" style="width:${pct}%"></div></div>
    `;
    pollutantsGrid.appendChild(card);
  });
  pollutantsGrid.classList.remove("hidden");

  // Health notice
  health.className = `health-msg ${info.noticeClass}`;
  health.textContent = info.msg;
  health.classList.remove("hidden");
}