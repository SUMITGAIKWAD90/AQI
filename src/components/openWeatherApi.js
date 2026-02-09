import { calculateAQIFromComponents } from "./airQualityUtils";

export const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "d20a1d1d93a48db41372a0393ad30a84";

const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const toNumber = (value, fallback = 0) => (isFiniteNumber(value) ? Number(value) : fallback);

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams({
    ...params,
    appid: OPENWEATHER_API_KEY,
  });
  return `${OPENWEATHER_BASE_URL}/${path}?${query.toString()}`;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || payload?.error || `OpenWeather request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

const mapAQIRow = (entry = {}) => {
  const components = entry?.components || {};
  const calculatedAQI = calculateAQIFromComponents(components);

  return {
    ...entry,
    components,
    calculatedAQI: isFiniteNumber(calculatedAQI) ? Number(calculatedAQI) : null,
    dt: toNumber(entry?.dt, 0),
  };
};

export const fetchCurrentAQIByCoords = async (lat, lon, options = {}) => {
  const url = buildUrl("air_pollution", {
    lat: String(lat),
    lon: String(lon),
  });

  const payload = await fetchJson(url, options);
  const row = mapAQIRow(payload?.list?.[0] || {});

  if (!row.dt && !Object.keys(row.components || {}).length) return null;
  return row;
};

export const fetchAQIForecastByCoords = async (lat, lon, options = {}) => {
  const url = buildUrl("air_pollution/forecast", {
    lat: String(lat),
    lon: String(lon),
  });

  const payload = await fetchJson(url, options);
  return (payload?.list || []).map(mapAQIRow);
};

export const fetchAQIHistoryByCoords = async (lat, lon, startUnix, endUnix, options = {}) => {
  const url = buildUrl("air_pollution/history", {
    lat: String(lat),
    lon: String(lon),
    start: String(Math.floor(startUnix)),
    end: String(Math.floor(endUnix)),
  });

  const payload = await fetchJson(url, options);
  return (payload?.list || []).map(mapAQIRow);
};
