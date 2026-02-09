import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import Badge from "./Badge";
import Card from "./Card";
import Loader from "./Loader";
import "./SafeRote.css";
import { getAQIMetadata, getAQIRecommendation } from "./airQualityUtils";
import { getCurrentUserLocation } from "./geolocationUtils";
import { fetchCurrentAQIByCoords, OPENWEATHER_API_KEY } from "./openWeatherApi";

// Fix for default marker icons in Leaflet
/* eslint-disable no-underscore-dangle */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
/* eslint-enable no-underscore-dangle */

const DEFAULT_CENTER = [18.5204, 73.8567];
const DEFAULT_ZOOM = 6;
const MAP_FOCUS_ZOOM = 10;
const OWM_SEARCH_LIMIT = 8;
const NOMINATIM_SEARCH_LIMIT = 10;
const MAX_SEARCH_RESULTS = 8;
const MAX_ROUTE_SAMPLE_POINTS = 16;
const ROUTE_FALLBACK_AQI = 200;
const ROUTE_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

const normalizeText = (value = "") => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9,\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const splitTokens = (value = "") => normalizeText(value)
  .split(/[,\s]+/)
  .filter(Boolean);

const levenshteinDistance = (left = "", right = "") => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
};

const similarityScore = (left = "", right = "") => {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return 1 - (levenshteinDistance(a, b) / maxLen);
};

const buildSearchVariants = (rawQuery) => {
  const cleaned = rawQuery.replace(/\s+/g, " ").trim();
  const normalized = normalizeText(cleaned);
  const tokens = splitTokens(normalized);
  const variants = new Set();

  if (cleaned) variants.add(cleaned);

  if (!cleaned.includes(",") && tokens.length >= 2) {
    const splitCandidates = Array.from(new Set([
      1,
      Math.floor(tokens.length / 2),
      tokens.length - 1,
    ])).filter((splitIndex) => splitIndex > 0 && splitIndex < tokens.length);

    for (const splitIndex of splitCandidates) {
      const cityPart = tokens.slice(0, splitIndex).join(" ");
      const regionPart = tokens.slice(splitIndex).join(" ");
      if (cityPart && regionPart) variants.add(`${cityPart}, ${regionPart}`);
    }
  }

  return Array.from(variants);
};

const buildFallbackVariant = (rawQuery) => {
  const tokens = splitTokens(rawQuery);
  const primary = tokens[0] || "";
  if (primary.length < 4) return "";
  return primary.slice(0, -1);
};

const mapOpenWeatherResult = (item) => {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    source: "openweather",
    lat,
    lon,
    name: item.name || "",
    state: item.state || "",
    country: item.country || "",
    importance: 0,
  };
};

const mapNominatimResult = (item) => {
  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const address = item.address || {};
  const name = address.city
    || address.town
    || address.village
    || address.hamlet
    || address.municipality
    || address.county
    || address.state
    || address.country
    || item.name
    || (item.display_name || "").split(",")[0]
    || "";

  const state = address.state
    || address.state_district
    || address.region
    || address.county
    || "";

  const country = address.country || "";

  return {
    source: "nominatim",
    lat,
    lon,
    name,
    state,
    country,
    importance: Number(item.importance) || 0,
  };
};

const scoreCandidate = (candidate, rawQuery) => {
  const normalizedQuery = normalizeText(rawQuery);
  if (!normalizedQuery) return 0;

  const queryTokens = splitTokens(normalizedQuery);
  const queryParts = normalizedQuery.split(",").map((part) => part.trim()).filter(Boolean);
  const hasComma = queryParts.length > 1;
  const queryName = hasComma ? queryParts[0] : normalizedQuery;
  const queryRegion = hasComma ? queryParts.slice(1).join(" ") : "";

  const name = normalizeText(candidate.name);
  const state = normalizeText(candidate.state);
  const country = normalizeText(candidate.country);
  const combined = normalizeText([candidate.name, candidate.state, candidate.country].filter(Boolean).join(" "));

  let score = 0;

  if (name === normalizedQuery || combined === normalizedQuery) score += 120;
  if (name.startsWith(queryName)) score += 35;
  if (combined.startsWith(normalizedQuery)) score += 65;
  if (combined.includes(normalizedQuery)) score += 40;

  const matchedTokens = queryTokens.filter((token) => combined.includes(token)).length;
  if (queryTokens.length) score += (matchedTokens / queryTokens.length) * 60;

  score += Math.max(0, similarityScore(name, queryName)) * 55;

  if (queryRegion) {
    if (state.includes(queryRegion) || country.includes(queryRegion)) {
      score += 45;
    } else {
      score -= 20;
    }
  }

  if (candidate.source === "openweather") score += 5;
  score += Math.max(0, Math.min(1, candidate.importance)) * 20;

  return score;
};

const dedupeResults = (results) => {
  const seen = new Set();
  return results.filter((result) => {
    const name = normalizeText(result.name || "");
    const state = normalizeText(result.state || "");
    const country = normalizeText(result.country || "");
    const lat = Number(result.lat).toFixed(3);
    const lon = Number(result.lon).toFixed(3);
    const key = `${name}|${state}|${country}|${lat}|${lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const rankResults = (results, query) => {
  if (!results.length) return [];

  const ranked = results
    .map((result) => ({
      ...result,
      score: scoreCandidate(result, query),
    }))
    .sort((left, right) => right.score - left.score);

  const strong = ranked.filter((result) => result.score >= 20);
  const selected = strong.length ? strong : ranked;
  return selected.slice(0, MAX_SEARCH_RESULTS);
};

const getSampledPoints = (points, maxPoints = MAX_ROUTE_SAMPLE_POINTS) => {
  if (!Array.isArray(points) || points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);

  return Array.from({ length: maxPoints }, (_, index) => {
    const pointIndex = Math.min(points.length - 1, Math.round(index * step));
    return points[pointIndex];
  });
};

const formatLocationLabel = (location) => {
  if (!location) return "";
  return [location.name, location.state, location.country].filter(Boolean).join(", ");
};

const formatDistance = (distanceKm) => `${distanceKm.toFixed(1)} km`;

const formatDuration = (durationMin) => {
  if (durationMin < 60) return `${Math.round(durationMin)} min`;
  const hours = Math.floor(durationMin / 60);
  const minutes = Math.round(durationMin % 60);
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};

const getRouteColor = (index) => ROUTE_COLORS[index % ROUTE_COLORS.length];

const getRouteExplanation = (route, safestRoute, index) => {
  if (!safestRoute || index === 0) {
    return "Best combined score for AQI, peak pollution, and exposure duration.";
  }

  const aqiDelta = route.avgAqi - safestRoute.avgAqi;
  const durationDelta = route.durationMin - safestRoute.durationMin;
  const distanceDelta = route.distanceKm - safestRoute.distanceKm;

  const details = [];
  if (Math.abs(aqiDelta) >= 8) {
    if (aqiDelta > 0) {
      details.push(`${Math.round(aqiDelta)} points higher average AQI`);
    } else {
      details.push(`${Math.round(Math.abs(aqiDelta))} points lower average AQI`);
    }
  }

  if (Math.abs(durationDelta) >= 3) {
    if (durationDelta > 0) {
      details.push(`${Math.round(durationDelta)} min longer`);
    } else {
      details.push(`${Math.round(Math.abs(durationDelta))} min faster`);
    }
  }

  if (Math.abs(distanceDelta) >= 3) {
    if (distanceDelta > 0) {
      details.push(`${distanceDelta.toFixed(1)} km longer`);
    } else {
      details.push(`${Math.abs(distanceDelta).toFixed(1)} km shorter`);
    }
  }

  if (!details.length) {
    return "Similar route profile with minor tradeoffs in distance and duration.";
  }

  return `Compared to safest route: ${details.join(", ")}.`;
};

const SafeRoute = () => {
  const [sourceInput, setSourceInput] = useState("");
  const [destinationInput, setDestinationInput] = useState("");
  const [sourceSelection, setSourceSelection] = useState(null);
  const [destinationSelection, setDestinationSelection] = useState(null);
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [sourceSearching, setSourceSearching] = useState(false);
  const [destinationSearching, setDestinationSearching] = useState(false);
  const [locatingSource, setLocatingSource] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const apiKey = useMemo(() => OPENWEATHER_API_KEY, []);
  const mapRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const searchRequestSeqRef = useRef({ source: 0, destination: 0 });
  const routeSearchSeqRef = useRef(0);

  const userLocationIcon = useMemo(() => L.divIcon({
    className: "user-location-marker",
    html: "<span class='user-location-dot'></span>",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  }), []);

  useEffect(() => {
    let isMounted = true;

    getCurrentUserLocation()
      .then((location) => {
        if (!isMounted) return;
        setUserLocation(location);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !userLocation || routes.length) return;
    const map = mapRef.current;
    if (!map) return;

    map.flyTo([userLocation.lat, userLocation.lon], MAP_FOCUS_ZOOM, {
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }, [mapReady, userLocation, routes.length]);

  useEffect(() => {
    if (!mapReady || !routes.length) return;
    const map = mapRef.current;
    if (!map) return;

    const allPoints = routes.flatMap((route) => route.points);
    if (!allPoints.length) return;

    const bounds = L.latLngBounds(allPoints);
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds, {
      padding: [50, 50],
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }, [mapReady, routes]);

  const setFieldSearching = (field, value) => {
    if (field === "source") {
      setSourceSearching(value);
    } else {
      setDestinationSearching(value);
    }
  };

  const setFieldSuggestions = (field, value) => {
    if (field === "source") {
      setSourceSuggestions(value);
    } else {
      setDestinationSuggestions(value);
    }
  };

  const setFieldSelection = (field, value) => {
    if (field === "source") {
      setSourceSelection(value);
    } else {
      setDestinationSelection(value);
    }
  };

  const setFieldInput = (field, value) => {
    if (field === "source") {
      setSourceInput(value);
    } else {
      setDestinationInput(value);
    }
  };

  const fetchOpenWeatherCandidates = async (query) => {
    if (!query) return [];

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${OWM_SEARCH_LIMIT}&appid=${apiKey}`,
        { timeout: 6000 }
      );

      return (response.data || [])
        .map(mapOpenWeatherResult)
        .filter(Boolean);
    } catch (fetchError) {
      console.error("OpenWeather geocoding error:", fetchError);
      return [];
    }
  };

  const fetchNominatimCandidates = async (query) => {
    if (!query) return [];

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=${NOMINATIM_SEARCH_LIMIT}&q=${encodeURIComponent(query)}`,
        { timeout: 7000 }
      );

      return (response.data || [])
        .map(mapNominatimResult)
        .filter(Boolean);
    } catch (fetchError) {
      console.error("Nominatim geocoding error:", fetchError);
      return [];
    }
  };

  const searchGeocodingCandidates = async (query) => {
    const variants = buildSearchVariants(query);
    const searchTasks = variants.flatMap((variant) => ([
      fetchOpenWeatherCandidates(variant),
      fetchNominatimCandidates(variant),
    ]));

    const settledResults = await Promise.allSettled(searchTasks);
    let mergedResults = settledResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value || []);

    if (!mergedResults.length) {
      const fallbackVariant = buildFallbackVariant(query);
      if (fallbackVariant) {
        const fallbackSettled = await Promise.allSettled([
          fetchOpenWeatherCandidates(fallbackVariant),
          fetchNominatimCandidates(fallbackVariant),
        ]);

        mergedResults = fallbackSettled
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value || []);
      }
    }

    const dedupedResults = dedupeResults(mergedResults);
    return rankResults(dedupedResults, query);
  };

  const fetchCandidatesWithCache = async (query) => {
    const cacheKey = normalizeText(query);
    if (!cacheKey) return [];

    const cachedResults = searchCacheRef.current.get(cacheKey);
    if (cachedResults) return cachedResults;

    const results = await searchGeocodingCandidates(query);
    searchCacheRef.current.set(cacheKey, results);

    if (searchCacheRef.current.size > 80) {
      const oldestKey = searchCacheRef.current.keys().next().value;
      searchCacheRef.current.delete(oldestKey);
    }

    return results;
  };

  const applyLocationSelection = (field, result) => {
    const selected = {
      ...result,
      lat: Number(result.lat),
      lon: Number(result.lon),
    };

    setFieldSelection(field, selected);
    setFieldInput(field, formatLocationLabel(selected));
    setFieldSuggestions(field, []);
    setError(null);
  };

  const handleLocationInputChange = (field, value) => {
    setError(null);
    setFieldInput(field, value);
    setFieldSuggestions(field, []);

    const currentSelection = field === "source" ? sourceSelection : destinationSelection;
    if (!currentSelection) return;

    const selectedLabel = normalizeText(formatLocationLabel(currentSelection));
    if (selectedLabel !== normalizeText(value)) {
      setFieldSelection(field, null);
      setRoutes([]);
      setSelectedRouteIndex(0);
    }
  };

  const searchFieldLocations = async (field, { autoSelect = true } = {}) => {
    const query = (field === "source" ? sourceInput : destinationInput).trim();
    if (!query) {
      setFieldSuggestions(field, []);
      return { selected: null, results: [] };
    }

    const requestSeq = searchRequestSeqRef.current[field] + 1;
    searchRequestSeqRef.current[field] = requestSeq;

    setFieldSearching(field, true);
    setError(null);

    try {
      const results = await fetchCandidatesWithCache(query);
      if (searchRequestSeqRef.current[field] !== requestSeq) {
        return { selected: null, results: [] };
      }

      if (!results.length) {
        setFieldSuggestions(field, []);
        return { selected: null, results: [] };
      }

      const top = results[0];
      const second = results[1];
      const topScore = top?.score ?? 0;
      const secondScore = second?.score ?? Number.NEGATIVE_INFINITY;
      const isConfident = results.length === 1 || topScore >= 95 || (topScore - secondScore) >= 20;

      if (autoSelect && isConfident) {
        applyLocationSelection(field, top);
        return { selected: top, results };
      }

      setFieldSuggestions(field, results);
      return { selected: null, results };
    } catch (searchError) {
      console.error(`Error searching ${field}:`, searchError);
      setFieldSuggestions(field, []);
      return { selected: null, results: [] };
    } finally {
      if (searchRequestSeqRef.current[field] === requestSeq) {
        setFieldSearching(field, false);
      }
    }
  };

  const resolveLocationForRoute = async (field) => {
    const inputValue = (field === "source" ? sourceInput : destinationInput).trim();
    const currentSelection = field === "source" ? sourceSelection : destinationSelection;

    if (!inputValue) {
      throw new Error(`Please enter a ${field} location.`);
    }

    if (currentSelection) {
      const selectedLabel = normalizeText(formatLocationLabel(currentSelection));
      if (selectedLabel === normalizeText(inputValue)) {
        return currentSelection;
      }
    }

    const { selected, results } = await searchFieldLocations(field, { autoSelect: true });
    if (selected) {
      return {
        ...selected,
        lat: Number(selected.lat),
        lon: Number(selected.lon),
      };
    }

    if (!results.length) {
      throw new Error(`No matches found for ${field}. Try city and state together.`);
    }

    throw new Error(`Please select a ${field} match from the suggestion list.`);
  };

  const reverseLookupLocation = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`,
        { timeout: 7000 }
      );

      const mapped = mapNominatimResult(response.data || {});
      if (!mapped) return null;
      return mapped;
    } catch (lookupError) {
      console.error("Reverse geocoding error:", lookupError);
      return null;
    }
  };

  const useCurrentLocationAsSource = async () => {
    if (locatingSource) return;

    setLocatingSource(true);
    setError(null);

    try {
      const location = userLocation || await getCurrentUserLocation();
      setUserLocation(location);

      const reverseResult = await reverseLookupLocation(location.lat, location.lon);
      const sourceLocation = reverseResult || {
        source: "current-location",
        name: "Current Location",
        state: "",
        country: "",
        lat: location.lat,
        lon: location.lon,
      };

      applyLocationSelection("source", sourceLocation);

      if (mapReady && mapRef.current) {
        mapRef.current.flyTo([location.lat, location.lon], MAP_FOCUS_ZOOM, {
          duration: 0.9,
          easeLinearity: 0.25,
        });
      }
    } catch (locationError) {
      setError(locationError.message || "Unable to detect your current location.");
    } finally {
      setLocatingSource(false);
    }
  };

  const getAQI = async (lat, lon) => {
    try {
      const row = await fetchCurrentAQIByCoords(lat, lon);
      const calculatedAQI = Number(row?.calculatedAQI);
      if (Number.isFinite(calculatedAQI)) return calculatedAQI;
      return ROUTE_FALLBACK_AQI;
    } catch (aqiError) {
      console.error("AQI fetch error:", aqiError);
      return ROUTE_FALLBACK_AQI;
    }
  };

  const focusPoints = (points, padding = 55) => {
    if (!mapReady || !mapRef.current || !Array.isArray(points) || !points.length) return;

    const map = mapRef.current;
    if (points.length === 1) {
      map.flyTo(points[0], MAP_FOCUS_ZOOM, {
        duration: 0.8,
        easeLinearity: 0.25,
      });
      return;
    }

    const bounds = L.latLngBounds(points);
    if (!bounds.isValid()) return;

    map.flyToBounds(bounds, {
      padding: [padding, padding],
      duration: 0.9,
      easeLinearity: 0.25,
    });
  };

  const focusRoute = (index) => {
    setSelectedRouteIndex(index);
    const route = routes[index];
    if (!route) return;
    focusPoints(route.points, 65);
  };

  const focusAllRoutes = () => {
    const allPoints = routes.flatMap((route) => route.points);
    focusPoints(allPoints, 50);
  };

  const handleSwapLocations = () => {
    setError(null);

    setSourceInput(destinationInput);
    setDestinationInput(sourceInput);
    setSourceSelection(destinationSelection);
    setDestinationSelection(sourceSelection);
    setSourceSuggestions([]);
    setDestinationSuggestions([]);

    setRoutes([]);
    setSelectedRouteIndex(0);
  };

  const handleRouteSearch = async () => {
    if (loading) return;

    const sourceQuery = sourceInput.trim();
    const destinationQuery = destinationInput.trim();

    if (!sourceQuery || !destinationQuery) {
      setError("Please enter both source and destination locations.");
      return;
    }

    if (normalizeText(sourceQuery) === normalizeText(destinationQuery)) {
      setError("Source and destination cannot be the same.");
      return;
    }

    const requestSeq = routeSearchSeqRef.current + 1;
    routeSearchSeqRef.current = requestSeq;

    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedRouteIndex(0);

    try {
      const resolvedSource = await resolveLocationForRoute("source");
      const resolvedDestination = await resolveLocationForRoute("destination");

      if (routeSearchSeqRef.current !== requestSeq) return;

      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${resolvedSource.lon},${resolvedSource.lat};${resolvedDestination.lon},${resolvedDestination.lat}?overview=full&geometries=geojson&alternatives=true&steps=false`,
        { timeout: 15000 }
      );

      const osrmRoutes = response.data?.routes || [];
      if (!osrmRoutes.length) {
        setError("No driving routes were found for these locations.");
        return;
      }

      const enrichedRoutes = (await Promise.all(osrmRoutes.map(async (route, routeIndex) => {
        const coordinates = route?.geometry?.coordinates || [];
        const points = coordinates
          .map((coordinate) => [Number(coordinate[1]), Number(coordinate[0])])
          .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));

        if (points.length < 2) return null;

        const sampledPoints = getSampledPoints(points, MAX_ROUTE_SAMPLE_POINTS);
        const sampledAQI = await Promise.all(sampledPoints.map(async ([lat, lon]) => getAQI(lat, lon)));

        const validAQI = sampledAQI.filter((value) => Number.isFinite(value));
        const avgAqi = validAQI.length
          ? validAQI.reduce((total, value) => total + value, 0) / validAQI.length
          : ROUTE_FALLBACK_AQI;
        const maxAqi = validAQI.length ? Math.max(...validAQI) : ROUTE_FALLBACK_AQI;
        const minAqi = validAQI.length ? Math.min(...validAQI) : ROUTE_FALLBACK_AQI;

        const distanceKm = Number(route.distance) > 0 ? Number(route.distance) / 1000 : 0;
        const durationMin = Number(route.duration) > 0 ? Number(route.duration) / 60 : 0;

        const normalizedAvgAQI = Math.min(avgAqi / 250, 2);
        const normalizedMaxAQI = Math.min(maxAqi / 300, 2);
        const normalizedDuration = Math.min(durationMin / 180, 1);
        const normalizedDistance = Math.min(distanceKm / 250, 1);
        const exposureScore = avgAqi * Math.max(durationMin, 1);

        const riskScore = (normalizedAvgAQI * 0.56)
          + (normalizedMaxAQI * 0.26)
          + (normalizedDuration * 0.12)
          + (normalizedDistance * 0.06);

        return {
          id: `route-${routeIndex}`,
          points,
          sampledPoints,
          sampledAQI,
          avgAqi,
          maxAqi,
          minAqi,
          distanceKm,
          durationMin,
          exposureScore,
          riskScore,
        };
      }))).filter(Boolean);

      if (!enrichedRoutes.length) {
        setError("Routes were returned, but geometry data was invalid.");
        return;
      }

      const sortedRoutes = enrichedRoutes
        .sort((left, right) => left.riskScore - right.riskScore)
        .map((route, index, allRoutes) => ({
          ...route,
          rank: index + 1,
          label: index === 0 ? "Safest Route" : `Alternative Route ${index}`,
          explanation: getRouteExplanation(route, allRoutes[0], index),
        }));

      setRoutes(sortedRoutes);
      setSelectedRouteIndex(0);
    } catch (routeError) {
      console.error("Route search error:", routeError);
      setError(routeError.message || "Failed to fetch routes. Please try again.");
    } finally {
      if (routeSearchSeqRef.current === requestSeq) {
        setLoading(false);
      }
    }
  };

  const sourceSearchLabel = sourceSearching ? "Searching..." : "Find matches";
  const destinationSearchLabel = destinationSearching ? "Searching..." : "Find matches";
  const bestRoute = routes[0] || null;
  const bestRouteBadge = bestRoute ? getAQIMetadata(bestRoute.avgAqi) : null;

  return (
    <Card
      title="Safest Route Finder"
      subtitle="Air-quality-aware route scoring with detailed tradeoffs"
      icon="Route"
      action={bestRoute && bestRouteBadge ? (
        <Badge variant={bestRouteBadge.variant} size="lg">
          Best AQI: {Math.round(bestRoute.avgAqi)} ({bestRouteBadge.label})
        </Badge>
      ) : null}
    >
      <div className="route-finder">
        <div className="route-inputs">
          <div className="input-group">
            <div className="input-header">
              <label className="input-label">Source</label>
              <button
                type="button"
                className="input-action-button"
                onClick={() => searchFieldLocations("source", { autoSelect: true })}
                disabled={sourceSearching || loading || !sourceInput.trim()}
              >
                {sourceSearchLabel}
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g., Mumbai, Maharashtra"
              value={sourceInput}
              onChange={(event) => handleLocationInputChange("source", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchFieldLocations("source", { autoSelect: true });
                }
              }}
              className="route-input"
            />
            <p className="input-subtext">
              {sourceSelection
                ? `Selected: ${formatLocationLabel(sourceSelection)}`
                : "Search and select the starting location for higher accuracy."}
            </p>
            {sourceSuggestions.length > 0 && (
              <div className="location-results">
                {sourceSuggestions.map((result) => (
                  <button
                    type="button"
                    key={`source-${result.name}-${result.lat}-${result.lon}`}
                    className="location-result-item"
                    onClick={() => applyLocationSelection("source", result)}
                  >
                    <span className="location-result-name">{formatLocationLabel(result)}</span>
                    <span className="location-result-meta">
                      {Number(result.lat).toFixed(3)}, {Number(result.lon).toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="route-arrow">To</div>

          <div className="input-group">
            <div className="input-header">
              <label className="input-label">Destination</label>
              <button
                type="button"
                className="input-action-button"
                onClick={() => searchFieldLocations("destination", { autoSelect: true })}
                disabled={destinationSearching || loading || !destinationInput.trim()}
              >
                {destinationSearchLabel}
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g., Pune, Maharashtra"
              value={destinationInput}
              onChange={(event) => handleLocationInputChange("destination", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchFieldLocations("destination", { autoSelect: true });
                }
              }}
              className="route-input"
            />
            <p className="input-subtext">
              {destinationSelection
                ? `Selected: ${formatLocationLabel(destinationSelection)}`
                : "Destination suggestions improve route matching and map precision."}
            </p>
            {destinationSuggestions.length > 0 && (
              <div className="location-results">
                {destinationSuggestions.map((result) => (
                  <button
                    type="button"
                    key={`destination-${result.name}-${result.lat}-${result.lon}`}
                    className="location-result-item"
                    onClick={() => applyLocationSelection("destination", result)}
                  >
                    <span className="location-result-name">{formatLocationLabel(result)}</span>
                    <span className="location-result-meta">
                      {Number(result.lat).toFixed(3)}, {Number(result.lon).toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="route-actions">
          <button
            type="button"
            className="input-action-button secondary"
            onClick={useCurrentLocationAsSource}
            disabled={locatingSource || loading}
          >
            {locatingSource ? "Locating..." : "Use my location"}
          </button>
          <button
            type="button"
            className="route-swap-button"
            onClick={handleSwapLocations}
            disabled={loading || !sourceInput || !destinationInput}
          >
            Swap
          </button>
          <button
            type="button"
            onClick={handleRouteSearch}
            className="route-button"
            disabled={loading || !sourceInput.trim() || !destinationInput.trim()}
          >
            {loading ? "Analyzing routes..." : "Find safest routes"}
          </button>
        </div>

        {error && (
          <div className="route-error">
            Warning: {error}
          </div>
        )}

        {routes.length > 0 && (
          <div className="route-info">
            <h4 className="route-info-title">
              Routes from <span className="city-name">{formatLocationLabel(sourceSelection) || sourceInput}</span>
              {" "}
              to
              {" "}
              <span className="city-name">{formatLocationLabel(destinationSelection) || destinationInput}</span>
            </h4>

            <div className="route-summary">
              <div>
                <div className="summary-title">Best route estimate</div>
                <p className="summary-text">
                  {bestRoute
                    ? `${formatDistance(bestRoute.distanceKm)} in ${formatDuration(bestRoute.durationMin)}. Average AQI ${Math.round(bestRoute.avgAqi)}, max AQI ${Math.round(bestRoute.maxAqi)}.`
                    : ""}
                </p>
              </div>
              <div className="route-controls">
                <button type="button" className="route-control-button" onClick={focusAllRoutes}>
                  Focus all
                </button>
                <button type="button" className="route-control-button" onClick={() => focusRoute(0)}>
                  Focus safest
                </button>
              </div>
            </div>

            <div className="route-legend-container">
              {routes.map((route, index) => (
                <div key={`legend-${route.id}`} className="route-legend-item">
                  <span className="route-legend-line" style={{ background: getRouteColor(index) }}></span>
                  <span className="route-legend-text">{route.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="route-map-wrapper">
          {loading ? (
            <Loader size="lg" text="Scoring routes by pollution exposure..." />
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}
              className="route-map"
              preferCanvas={true}
              whenReady={(event) => {
                const mapInstance = event?.target ?? event;
                mapRef.current = mapInstance;
                setMapReady(true);
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
                maxZoom={19}
                keepBuffer={2}
                updateWhenZooming={false}
              />

              {routes.map((route, index) => {
                const isSelected = selectedRouteIndex === index;
                return (
                  <Polyline
                    key={route.id}
                    positions={route.points}
                    pathOptions={{
                      color: getRouteColor(index),
                      weight: isSelected ? 7 : 5,
                      opacity: isSelected ? 0.95 : 0.72,
                      dashArray: index === 0 ? undefined : "8 10",
                    }}
                    eventHandlers={{
                      click: () => focusRoute(index),
                    }}
                  >
                    <Tooltip sticky>
                      <div className="route-tooltip">
                        <strong>{route.label}</strong>
                        <div className="tooltip-aqi">
                          Avg AQI {Math.round(route.avgAqi)} | Max AQI {Math.round(route.maxAqi)}
                        </div>
                        <div className="tooltip-aqi">
                          {formatDistance(route.distanceKm)} | {formatDuration(route.durationMin)}
                        </div>
                      </div>
                    </Tooltip>
                  </Polyline>
                );
              })}

              {sourceSelection && (
                <Marker position={[sourceSelection.lat, sourceSelection.lon]}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    Source: {formatLocationLabel(sourceSelection) || "Selected source"}
                  </Tooltip>
                </Marker>
              )}

              {destinationSelection && (
                <Marker position={[destinationSelection.lat, destinationSelection.lon]}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    Destination: {formatLocationLabel(destinationSelection) || "Selected destination"}
                  </Tooltip>
                </Marker>
              )}

              {userLocation && !sourceSelection && (
                <Marker position={[userLocation.lat, userLocation.lon]} icon={userLocationIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    Your current location
                  </Tooltip>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>

        {routes.length > 0 && !loading && (
          <>
            <p className="route-map-hint">Tip: click a route line or a card below to focus that path.</p>
            <div className="route-stats">
              {routes.map((route, index) => {
                const badge = getAQIMetadata(route.avgAqi);
                const isSelected = selectedRouteIndex === index;

                return (
                  <button
                    type="button"
                    key={route.id}
                    className={`route-stat-card ${isSelected ? "active" : ""}`}
                    onClick={() => focusRoute(index)}
                  >
                    <div className="stat-header">
                      <div className="stat-route-indicator" style={{ background: getRouteColor(index) }}></div>
                      <h5 className="stat-title">{route.label}</h5>
                    </div>

                    <div className="stat-body">
                      <div className="stat-aqi">
                        <span className="stat-label">Average AQI</span>
                        <span className="stat-value">{Math.round(route.avgAqi)}</span>
                      </div>
                      <Badge variant={badge.variant} size="md">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="stat-meta">
                      {formatDistance(route.distanceKm)} | {formatDuration(route.durationMin)}
                    </div>
                    <div className="stat-meta">
                      Peak AQI {Math.round(route.maxAqi)} | Exposure score {route.exposureScore.toFixed(1)}
                    </div>
                    <div className="stat-explanation">{route.explanation}</div>
                    <div className="stat-advice">{getAQIRecommendation(route.avgAqi)}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {routes.length === 0 && !loading && (
          <div className="route-empty">
            <span className="empty-icon">Routes</span>
            <p className="empty-text">Enter source and destination to compare safer route options.</p>
            <p className="empty-hint">Search suggestions and user-location mode improve accuracy before route analysis.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SafeRoute;
