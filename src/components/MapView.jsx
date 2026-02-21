// import axios from "axios";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
// import markerIcon from "leaflet/dist/images/marker-icon.png";
// import markerShadow from "leaflet/dist/images/marker-shadow.png";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
// import Badge from "./Badge";
// import Card from "./Card";
// import Cigrate from "./Cigrate";
// import Loader from "./Loader";
// import "./MapView.css";
// import Sidebar from "./Sidebar";
// import { getAQIMetadata, getAQIRecommendation } from "./airQualityUtils";
// import { getCurrentUserLocation } from "./geolocationUtils";
// import { fetchCurrentAQIByCoords, OPENWEATHER_API_KEY } from "./openWeatherApi";

// // Fix for default marker icons in Leaflet
// delete L.Icon.Default.prototype._getIconUrl;
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: markerIcon2x,
//   iconUrl: markerIcon,
//   shadowUrl: markerShadow
// });

// const DEFAULT_CENTER = [18.5204, 73.8567]; // Default: Pune
// const DEFAULT_ZOOM = 13;
// const SEARCH_TARGET_ZOOM = DEFAULT_ZOOM;
// const SEARCH_PAN_DURATION = 1.2; // seconds
// const SEARCH_EASE_LINEARITY = 0.25;
// const TILE_WAIT_TIMEOUT = 3500; // ms
// const MOVE_WAIT_TIMEOUT = 2500; // ms
// const RESULTS_BOUNDS_PADDING = 40;
// const OWM_SEARCH_LIMIT = 8;
// const NOMINATIM_SEARCH_LIMIT = 10;
// const MAX_SEARCH_RESULTS = 8;

// const normalizeText = (value = "") => value
//   .toLowerCase()
//   .normalize("NFD")
//   .replace(/[\u0300-\u036f]/g, "")
//   .replace(/[^a-z0-9,\s]/g, " ")
//   .replace(/\s+/g, " ")
//   .trim();

// const splitTokens = (value = "") => normalizeText(value)
//   .split(/[,\s]+/)
//   .filter(Boolean);

// const levenshteinDistance = (a = "", b = "") => {
//   if (a === b) return 0;
//   if (!a.length) return b.length;
//   if (!b.length) return a.length;

//   const rows = a.length + 1;
//   const cols = b.length + 1;
//   const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

//   for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
//   for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

//   for (let i = 1; i < rows; i += 1) {
//     for (let j = 1; j < cols; j += 1) {
//       const cost = a[i - 1] === b[j - 1] ? 0 : 1;
//       matrix[i][j] = Math.min(
//         matrix[i - 1][j] + 1,
//         matrix[i][j - 1] + 1,
//         matrix[i - 1][j - 1] + cost
//       );
//     }
//   }

//   return matrix[a.length][b.length];
// };

// const similarityScore = (left = "", right = "") => {
//   const a = normalizeText(left);
//   const b = normalizeText(right);
//   if (!a || !b) return 0;
//   const maxLen = Math.max(a.length, b.length);
//   if (!maxLen) return 0;
//   return 1 - (levenshteinDistance(a, b) / maxLen);
// };

// const buildSearchVariants = (rawQuery) => {
//   const cleaned = rawQuery.replace(/\s+/g, " ").trim();
//   const normalized = normalizeText(cleaned);
//   const tokens = splitTokens(normalized);
//   const variants = new Set();

//   if (cleaned) variants.add(cleaned);

//   // Handles queries like "city state" without comma by trying likely splits.
//   if (!cleaned.includes(",") && tokens.length >= 2) {
//     const splitCandidates = Array.from(new Set([
//       1,
//       Math.floor(tokens.length / 2),
//       tokens.length - 1,
//     ])).filter((splitIndex) => splitIndex > 0 && splitIndex < tokens.length);

//     for (const splitIndex of splitCandidates) {
//       const cityPart = tokens.slice(0, splitIndex).join(" ");
//       const regionPart = tokens.slice(splitIndex).join(" ");
//       if (cityPart && regionPart) {
//         variants.add(`${cityPart}, ${regionPart}`);
//       }
//     }
//   }

//   return Array.from(variants);
// };

// const buildFallbackVariant = (rawQuery) => {
//   const tokens = splitTokens(rawQuery);
//   const primary = tokens[0] || "";
//   if (primary.length < 4) return "";
//   return primary.slice(0, -1);
// };

// const mapOpenWeatherResult = (item) => {
//   const lat = Number(item.lat);
//   const lon = Number(item.lon);
//   if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

//   return {
//     source: "openweather",
//     lat,
//     lon,
//     name: item.name || "",
//     state: item.state || "",
//     country: item.country || "",
//     importance: 0,
//   };
// };

// const mapNominatimResult = (item) => {
//   const lat = Number(item.lat);
//   const lon = Number(item.lon);
//   if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

//   const address = item.address || {};
//   const name = address.city
//     || address.town
//     || address.village
//     || address.hamlet
//     || address.municipality
//     || address.county
//     || address.state
//     || address.country
//     || item.name
//     || (item.display_name || "").split(",")[0]
//     || "";

//   const state = address.state
//     || address.state_district
//     || address.region
//     || address.county
//     || "";

//   const country = address.country || "";

//   return {
//     source: "nominatim",
//     lat,
//     lon,
//     name,
//     state,
//     country,
//     importance: Number(item.importance) || 0,
//   };
// };

// const scoreCandidate = (candidate, rawQuery) => {
//   const normalizedQuery = normalizeText(rawQuery);
//   if (!normalizedQuery) return 0;

//   const queryTokens = splitTokens(normalizedQuery);
//   const queryParts = normalizedQuery.split(",").map((part) => part.trim()).filter(Boolean);
//   const hasComma = queryParts.length > 1;
//   const queryName = hasComma ? queryParts[0] : normalizedQuery;
//   const queryRegion = hasComma ? queryParts.slice(1).join(" ") : "";

//   const name = normalizeText(candidate.name);
//   const state = normalizeText(candidate.state);
//   const country = normalizeText(candidate.country);
//   const combined = normalizeText([candidate.name, candidate.state, candidate.country].filter(Boolean).join(" "));

//   let score = 0;

//   if (name === normalizedQuery || combined === normalizedQuery) score += 120;
//   if (name.startsWith(queryName)) score += 35;
//   if (combined.startsWith(normalizedQuery)) score += 65;
//   if (combined.includes(normalizedQuery)) score += 40;

//   const matchedTokens = queryTokens.filter((token) => combined.includes(token)).length;
//   if (queryTokens.length) score += (matchedTokens / queryTokens.length) * 60;

//   score += Math.max(0, similarityScore(name, queryName)) * 55;

//   if (queryRegion) {
//     if (state.includes(queryRegion) || country.includes(queryRegion)) {
//       score += 45;
//     } else {
//       score -= 20;
//     }
//   } else if (!hasComma && queryTokens.length > 1) {
//     const possibleRegion = queryTokens[queryTokens.length - 1];
//     const probableName = queryTokens.slice(0, -1).join(" ");
//     score += Math.max(0, similarityScore(name, probableName)) * 25;
//     if (possibleRegion && (state.includes(possibleRegion) || country.includes(possibleRegion))) {
//       score += 20;
//     }
//   }

//   if (candidate.source === "openweather") score += 5;
//   score += Math.max(0, Math.min(1, candidate.importance)) * 20;

//   return score;
// };

// const MapView = ({ city, onLocationChange }) => {
//   const [location, setLocation] = useState(null);
//   const [airQuality, setAirQuality] = useState(null);
//   const [error, setError] = useState(null);
//   const [searchCity, setSearchCity] = useState("");
//   const [searchResults, setSearchResults] = useState([]);
//   const [calAQI, setcalAQI] = useState(null);
//   const [totalData, setTotalData] =  useState(null);
//   const [loading, setLoading] = useState(true);
//   const [searching, setSearching] = useState(false);
//   const [mapReady, setMapReady] = useState(false);
//   const mapRef = useRef(null);
//   const tileLayerRef = useRef(null);
//   const tileLoadingRef = useRef(false);
//   const pendingSearchRef = useRef(null);
//   const isSearchAnimatingRef = useRef(false);
//   const searchSequenceRef = useRef(0);
//   const searchRequestSeqRef = useRef(0);
//   const searchCacheRef = useRef(new Map());
//   const searchMarkerIcon = useMemo(() => (
//     L.divIcon({
//       className: "search-marker",
//       html: "<span class='search-marker-dot'></span>",
//       iconSize: [16, 16],
//       iconAnchor: [8, 8],
//     })
//   ), []);

//   // setSearchCity(props.transcript); 

//   // ✅ Memoize API key to prevent re-renders
//   const memoizedApiKey = useMemo(() => OPENWEATHER_API_KEY, []);

//   const tileEventHandlers = useMemo(() => ({
//     loading: () => {
//       tileLoadingRef.current = true;
//     },
//     load: () => {
//       tileLoadingRef.current = false;
//     },
//   }), []);

//   // ✅ Get User's Current Location
//   useEffect(() => {
//     let isMounted = true;

//     getCurrentUserLocation()
//       .then(({ lat, lon }) => {
//         if (!isMounted) return;
//         setLocation({ lat, lon });
//         setError(null);
//         setLoading(false);
//       })
//       .catch((geoError) => {
//         if (!isMounted) return;
//         setError(geoError.message || "Unable to access your location.");
//         setLoading(false);
//       });

//     return () => {
//       isMounted = false;
//     };
//   }, []);

//   // ✅ Fetch Air Quality Data with useCallback to prevent recreating on every render
//   const fetchAirQuality = useCallback(async (lat, lon) => {
//     try {
//       const dataPoint = await fetchCurrentAQIByCoords(lat, lon);
//       if (!dataPoint) {
//         setError("No air quality data available.");
//         return;
//       }

//       const components = dataPoint?.components || {};
//       const calculatedAQI = Number(dataPoint?.calculatedAQI);
//       if (!Number.isFinite(calculatedAQI)) {
//         setError("Unable to calculate AQI from pollutant data.");
//         return;
//       }

//       setcalAQI(calculatedAQI);
//       setAirQuality({ lat, lon, aqi: calculatedAQI });
//       setTotalData(components);
//       console.log("Setpm25 " + components.pm2_5);
//       console.log("Components Data: ", components);
//     } catch (error) {
//       console.error("Error fetching air quality data:", error);
//       setError("Failed to fetch air quality data.");
//     }
//   }, []);

//   // ✅ Fetch AQI when location changes
//   useEffect(() => {
//     if (location) {
//       fetchAirQuality(location.lat, location.lon);
//     }
//   }, [location, fetchAirQuality]);

//   useEffect(() => {
//     if (!location || typeof onLocationChange !== "function") return;
//     onLocationChange(location);
//   }, [location, onLocationChange]);

//   const flyToLocation = useCallback((lat, lon) => {
//     const map = mapRef.current;
//     if (!map) return;
//     map.flyTo([lat, lon], DEFAULT_ZOOM, { duration: 0.9, easeLinearity: 0.25 });
//   }, []);

//   const waitForTiles = useCallback((timeoutMs = TILE_WAIT_TIMEOUT) => {
//     const layer = tileLayerRef.current;
//     if (!layer || !tileLoadingRef.current) return Promise.resolve();

//     return new Promise((resolve) => {
//       let timeoutId = null;
//       const finish = () => {
//         layer.off("load", onLoad);
//         if (timeoutId) clearTimeout(timeoutId);
//         resolve();
//       };
//       const onLoad = () => finish();
//       layer.on("load", onLoad);
//       if (timeoutMs && Number.isFinite(timeoutMs)) {
//         timeoutId = setTimeout(() => finish(), timeoutMs);
//       }
//     });
//   }, []);

//   const waitForMoveEnd = useCallback((timeoutMs = MOVE_WAIT_TIMEOUT) => {
//     const map = mapRef.current;
//     if (!map) return Promise.resolve();

//     return new Promise((resolve) => {
//       let timeoutId = null;
//       const finish = () => {
//         map.off("moveend", onMoveEnd);
//         if (timeoutId) clearTimeout(timeoutId);
//         resolve();
//       };
//       const onMoveEnd = () => finish();
//       map.on("moveend", onMoveEnd);
//       if (timeoutMs && Number.isFinite(timeoutMs)) {
//         timeoutId = setTimeout(() => finish(), timeoutMs);
//       }
//     });
//   }, []);

//   const runSearchTransition = useCallback(async (lat, lon) => {
//     const map = mapRef.current;
//     if (!map) {
//       pendingSearchRef.current = { lat, lon };
//       return;
//     }

//     searchSequenceRef.current += 1;
//     const sequence = searchSequenceRef.current;
//     isSearchAnimatingRef.current = true;

//     map.stop();
//     await waitForTiles();
//     if (searchSequenceRef.current !== sequence) return;

//     map.flyTo([lat, lon], SEARCH_TARGET_ZOOM, {
//       duration: SEARCH_PAN_DURATION,
//       easeLinearity: SEARCH_EASE_LINEARITY,
//     });

//     await waitForMoveEnd();
//     if (searchSequenceRef.current !== sequence) return;

//     await waitForTiles();
//     if (searchSequenceRef.current !== sequence) return;

//     isSearchAnimatingRef.current = false;
//   }, [waitForTiles, waitForMoveEnd]);

//   const formatResultLabel = useCallback((result) => {
//     const parts = [result.name, result.state, result.country].filter(Boolean);
//     return parts.join(", ");
//   }, []);

//   const dedupeResults = useCallback((results) => {
//     const seen = new Set();
//     return results.filter((result) => {
//       const name = normalizeText(result.name || "");
//       const state = normalizeText(result.state || "");
//       const country = normalizeText(result.country || "");
//       const lat = Number(result.lat).toFixed(3);
//       const lon = Number(result.lon).toFixed(3);
//       const key = `${name}|${state}|${country}|${lat}|${lon}`;
//       if (seen.has(key)) return false;
//       seen.add(key);
//       return true;
//     });
//   }, []);

//   const rankResults = useCallback((results, query) => {
//     if (!results.length) return [];

//     const ranked = results
//       .map((result) => ({
//         ...result,
//         score: scoreCandidate(result, query),
//       }))
//       .sort((left, right) => right.score - left.score);

//     const strong = ranked.filter((result) => result.score >= 20);
//     const selected = strong.length ? strong : ranked;
//     return selected.slice(0, MAX_SEARCH_RESULTS);
//   }, []);

//   const fetchOpenWeatherCandidates = useCallback(async (query) => {
//     if (!query) return [];

//     try {
//       const response = await axios.get(
//         `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${OWM_SEARCH_LIMIT}&appid=${memoizedApiKey}`,
//         { timeout: 6000 }
//       );

//       return (response.data || [])
//         .map(mapOpenWeatherResult)
//         .filter(Boolean);
//     } catch (fetchError) {
//       console.error("OpenWeather geocoding error:", fetchError);
//       return [];
//     }
//   }, [memoizedApiKey]);

//   const fetchNominatimCandidates = useCallback(async (query) => {
//     if (!query) return [];

//     try {
//       const response = await axios.get(
//         `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=en&limit=${NOMINATIM_SEARCH_LIMIT}&q=${encodeURIComponent(query)}`,
//         { timeout: 7000 }
//       );

//       return (response.data || [])
//         .map(mapNominatimResult)
//         .filter(Boolean);
//     } catch (fetchError) {
//       console.error("Nominatim geocoding error:", fetchError);
//       return [];
//     }
//   }, []);

//   const searchGeocodingCandidates = useCallback(async (query) => {
//     const variants = buildSearchVariants(query);
//     const searchTasks = variants.flatMap((variant) => ([
//       fetchOpenWeatherCandidates(variant),
//       fetchNominatimCandidates(variant),
//     ]));

//     const settledResults = await Promise.allSettled(searchTasks);
//     let mergedResults = settledResults
//       .filter((result) => result.status === "fulfilled")
//       .flatMap((result) => result.value || []);

//     // Retry with a shorter token for typo-heavy inputs.
//     if (!mergedResults.length) {
//       const fallbackVariant = buildFallbackVariant(query);
//       if (fallbackVariant) {
//         const fallbackSettled = await Promise.allSettled([
//           fetchOpenWeatherCandidates(fallbackVariant),
//           fetchNominatimCandidates(fallbackVariant),
//         ]);

//         mergedResults = fallbackSettled
//           .filter((result) => result.status === "fulfilled")
//           .flatMap((result) => result.value || []);
//       }
//     }

//     const dedupedResults = dedupeResults(mergedResults);
//     return rankResults(dedupedResults, query);
//   }, [dedupeResults, fetchNominatimCandidates, fetchOpenWeatherCandidates, rankResults]);

//   const handleResultSelect = useCallback(async (result) => {
//     const lat = Number(result.lat);
//     const lon = Number(result.lon);

//     if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
//       setError("Invalid location coordinates. Please try another result.");
//       return;
//     }

//     setSearchCity(formatResultLabel(result));
//     setSearchResults([]);
//     setError(null);
//     setLocation({ lat, lon });
//     await runSearchTransition(lat, lon);
//   }, [formatResultLabel, runSearchTransition]);

//   // ✅ Apply queued search animation once the map is ready
//   useEffect(() => {
//     if (!mapReady || !pendingSearchRef.current) return;
//     const { lat, lon } = pendingSearchRef.current;
//     pendingSearchRef.current = null;
//     runSearchTransition(lat, lon);
//   }, [mapReady, runSearchTransition]);

//   // ✅ Recenter to user's location when available (skip during search animation)
//   useEffect(() => {
//     if (!location || !mapReady) return;
//     if (isSearchAnimatingRef.current) return;
//     flyToLocation(location.lat, location.lon);
//   }, [location, mapReady, flyToLocation]);

//   useEffect(() => {
//     if (!mapReady || searchResults.length <= 1) return;
//     const map = mapRef.current;
//     if (!map) return;

//     const bounds = L.latLngBounds(
//       searchResults.map((result) => [Number(result.lat), Number(result.lon)])
//     );

//     map.stop();
//     map.flyToBounds(bounds, {
//       padding: [RESULTS_BOUNDS_PADDING, RESULTS_BOUNDS_PADDING],
//       duration: 0.9,
//       easeLinearity: 0.25,
//     });
//   }, [mapReady, searchResults]);
//   // ✅ Fetch City Coordinates with debouncing
//   const fetchCityCoordinates = useCallback(async (queryInput) => {
//     const query = (queryInput || "").trim();
//     if (!query) return;
//     const cacheKey = normalizeText(query);

//     const requestSeq = searchRequestSeqRef.current + 1;
//     searchRequestSeqRef.current = requestSeq;

//     setSearching(true);
//     setError(null);
//     setSearchResults([]);
//     try {
//       let results = searchCacheRef.current.get(cacheKey);
//       if (!results) {
//         results = await searchGeocodingCandidates(query);
//         searchCacheRef.current.set(cacheKey, results);
//         if (searchCacheRef.current.size > 60) {
//           const oldestKey = searchCacheRef.current.keys().next().value;
//           searchCacheRef.current.delete(oldestKey);
//         }
//       }

//       if (searchRequestSeqRef.current !== requestSeq) return;

//       if (results.length > 0) {
//         if (results.length === 1) {
//           await handleResultSelect(results[0]);
//           return;
//         }

//         setSearchResults(results);
//       } else {
//         setError("City not found. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error fetching city coordinates:", error);
//       setError("Failed to fetch city coordinates. Please try again.");
//     } finally {
//       if (searchRequestSeqRef.current === requestSeq) {
//         setSearching(false);
//       }
//     }
//   }, [handleResultSelect, searchGeocodingCandidates]);

//   useEffect(() => {
//     const externalQuery = (city || "").trim();
//     if (!externalQuery) return;
//     setSearchCity(externalQuery);
//     fetchCityCoordinates(externalQuery);
//   }, [city, fetchCityCoordinates]);

//   // 🎨 Define Circle Colors Based on AQI Levels
//   const getColor = (aqi) => getAQIMetadata(aqi).color;
  
//   // Get AQI Badge Variant
//   const getAQIBadgeVariant = (aqi) => getAQIMetadata(aqi).variant;
  
//   // Get AQI Label
//   const getAQILabel = (aqi) => getAQIMetadata(aqi).label;

//   // 🛠️ Suggestions for Air Quality Improvement
//   const getRecommendations = (aqi) => getAQIRecommendation(aqi);

//   return (
//     <>
//       <div className="dashboard-top">
//         {/* Map Section */}
//         <div className="map-section">
//           <Card 
//             title="Interactive Air Quality Map"
//             subtitle="Real-time AQI monitoring with location-based data"
//             icon="🗺️"
//             action={
//               calAQI !== null && (
//                 <Badge variant={getAQIBadgeVariant(calAQI)} size="lg">
//                   AQI: {calAQI} - {getAQILabel(calAQI)}
//                 </Badge>
//               )
//             }
//           >
//             {/* Search Bar */}
//             <div className="map-search-bar">
//               <input
//                 type="text"
//                 value={searchCity}
//                 onChange={(e) => {
//                   setSearchCity(e.target.value);
//                   setSearchResults([]);
//                   setError(null);
//                 }}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") {
//                     fetchCityCoordinates(searchCity);
//                   }
//                 }}
//                 placeholder="Search city/state/country"
//                 className="search-input"
//               />
//               <button
//                 onClick={() => fetchCityCoordinates(searchCity)}
//                 className="search-button"
//                 disabled={searching || !searchCity}
//               >
//                 {searching ? '🔍' : '🔎'} Search
//               </button>
//             </div>
//             <p className="search-helper-text">
//               Search by city, city plus state, or country. If multiple matches appear, select one from the list or map.
//             </p>
//             {searchResults.length > 0 && (
//               <div className="search-results">
//                 {searchResults.map((result) => (
//                   <button
//                     type="button"
//                     key={`${result.name}-${result.lat}-${result.lon}`}
//                     className="search-result-item"
//                     onClick={() => handleResultSelect(result)}
//                   >
//                     <span className="search-result-name">{formatResultLabel(result)}</span>
//                     <span className="search-result-meta">
//                       {Number(result.lat).toFixed(3)}, {Number(result.lon).toFixed(3)}
//                     </span>
//                   </button>
//                 ))}
//               </div>
//             )}

//             {/* Map Container */}
//             <div className="map-container-wrapper">
//               {loading ? (
//                 <Loader size="lg" text="Loading map data..." />
//               ) : (
//                 <MapContainer
//                   center={DEFAULT_CENTER}
//                   zoom={DEFAULT_ZOOM}
//                   style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}
//                   className="leaflet-map"
//                   preferCanvas={true}
//                   whenReady={(event) => {
//                     const mapInstance = event?.target ?? event;
//                     mapRef.current = mapInstance;
//                     setMapReady(true);
//                     console.log("Map loaded successfully");
//                   }}
//                 >
//                   <TileLayer
//                     ref={tileLayerRef}
//                     eventHandlers={tileEventHandlers}
//                     url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                     attribution="&copy; OpenStreetMap contributors"
//                     maxZoom={19}
//                     keepBuffer={2}
//                     updateWhenZooming={false}
//                   />

//                   {searchResults.length > 0 && searchResults.map((result) => (
//                     <Marker
//                       key={`result-${result.name}-${result.lat}-${result.lon}`}
//                       position={[Number(result.lat), Number(result.lon)]}
//                       icon={searchMarkerIcon}
//                       eventHandlers={{
//                         click: () => handleResultSelect(result),
//                       }}
//                       zIndexOffset={1000}
//                     >
//                       <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
//                         {formatResultLabel(result)}
//                       </Tooltip>
//                     </Marker>
//                   ))}

//                   {/* ✅ Show Air Quality Circle Based on AQI */}
//                   {airQuality && (
//                     <Circle
//                       center={[airQuality.lat, airQuality.lon]}
//                       radius={500}
//                       pathOptions={{
//                         color: getColor(calAQI),
//                         fillColor: getColor(calAQI),
//                         fillOpacity: 0.5,
//                       }}
//                     >
//                       <Popup>
//                         <div className="map-popup">
//                           <h4 className="popup-title">Air Quality Index</h4>
//                           <div className="popup-aqi">
//                             <span className="popup-aqi-value">{airQuality.aqi}</span>
//                             <Badge variant={getAQIBadgeVariant(calAQI)} size="sm">
//                               {getAQILabel(calAQI)}
//                             </Badge>
//                           </div>
//                           <p className="popup-recommendation">{getRecommendations(calAQI)}</p>
//                         </div>
//                       </Popup>
//                     </Circle>
//                   )}

//                   {/* ✅ Show Errors (if any) */}
//                   {error && (
//                     <div className="map-error">
//                       ⚠️ {error}
//                     </div>
//                   )}
//                 </MapContainer>
//               )}
//             </div>

//             {/* AQI Legend */}
//             <div className="map-legend">
//               <div className="legend-title">AQI Scale</div>
//               <div className="legend-items">
//                 <div className="legend-item">
//                   <span className="legend-color" style={{ background: '#10B981' }}></span>
//                   <span className="legend-label">0-50 Good</span>
//                 </div>
//                 <div className="legend-item">
//                   <span className="legend-color" style={{ background: '#FBBF24' }}></span>
//                   <span className="legend-label">51-100 Moderate</span>
//                 </div>
//                 <div className="legend-item">
//                   <span className="legend-color" style={{ background: '#F59E0B' }}></span>
//                   <span className="legend-label">101-150 Unhealthy</span>
//                 </div>
//                 <div className="legend-item">
//                   <span className="legend-color" style={{ background: '#EF4444' }}></span>
//                   <span className="legend-label">151+ Very Unhealthy</span>
//                 </div>
//               </div>
//             </div>
//           </Card>
//         </div>

//         {/* Pollutants Sidebar */}
//         <div className="pollutants-section">
//           {totalData ? <Sidebar totalData={totalData} /> : (
//             <div className="pollutant-sidebar">
//               <Loader size="md" text="Loading pollutant data..." />
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Cigarette Equivalent */}
//       {location && totalData && (
//         <div className="dashboard-bottom">
//           <Cigrate location={location} totalData={totalData} calculatedAQI={calAQI} />
//         </div>
//       )}
//     </>
//   );
// };

// export default MapView;








import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import Badge from "./Badge";
import Card from "./Card";
import Cigrate from "./Cigrate";
import Loader from "./Loader";
import "./MapView.css";
import Sidebar from "./Sidebar";
import { getAQIMetadata, getAQIRecommendation } from "./airQualityUtils";
import { getCurrentUserLocation } from "./geolocationUtils";
import { fetchCurrentAQIByCoords, OPENWEATHER_API_KEY } from "./openWeatherApi";

import "./AqiAnalysisDashboard.css"
import { AqiAnalysisDashboard } from "./AqiAnalysisDashboard";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const DEFAULT_CENTER = [18.5204, 73.8567]; // Default: Pune
const DEFAULT_ZOOM = 13;
const SEARCH_TARGET_ZOOM = DEFAULT_ZOOM;
const SEARCH_PAN_DURATION = 1.2; // seconds
const SEARCH_EASE_LINEARITY = 0.25;
const TILE_WAIT_TIMEOUT = 3500; // ms
const MOVE_WAIT_TIMEOUT = 2500; // ms
const RESULTS_BOUNDS_PADDING = 40;
const OWM_SEARCH_LIMIT = 8;
const NOMINATIM_SEARCH_LIMIT = 10;
const MAX_SEARCH_RESULTS = 8;

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

const levenshteinDistance = (a = "", b = "") => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
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

  // Handles queries like "city state" without comma by trying likely splits.
  if (!cleaned.includes(",") && tokens.length >= 2) {
    const splitCandidates = Array.from(new Set([
      1,
      Math.floor(tokens.length / 2),
      tokens.length - 1,
    ])).filter((splitIndex) => splitIndex > 0 && splitIndex < tokens.length);

    for (const splitIndex of splitCandidates) {
      const cityPart = tokens.slice(0, splitIndex).join(" ");
      const regionPart = tokens.slice(splitIndex).join(" ");
      if (cityPart && regionPart) {
        variants.add(`${cityPart}, ${regionPart}`);
      }
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
  } else if (!hasComma && queryTokens.length > 1) {
    const possibleRegion = queryTokens[queryTokens.length - 1];
    const probableName = queryTokens.slice(0, -1).join(" ");
    score += Math.max(0, similarityScore(name, probableName)) * 25;
    if (possibleRegion && (state.includes(possibleRegion) || country.includes(possibleRegion))) {
      score += 20;
    }
  }

  if (candidate.source === "openweather") score += 5;
  score += Math.max(0, Math.min(1, candidate.importance)) * 20;

  return score;
};

const MapView = ({ city, onLocationChange, aqiData, analysisLoading, areaAnalysis, handleAnalyzeArea }) => {
  const [location, setLocation] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [calAQI, setcalAQI] = useState(null);
  const [totalData, setTotalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLoadingRef = useRef(false);
  const pendingSearchRef = useRef(null);
  const isSearchAnimatingRef = useRef(false);
  const searchSequenceRef = useRef(0);
  const searchRequestSeqRef = useRef(0);
  const searchCacheRef = useRef(new Map());
  const searchMarkerIcon = useMemo(() => (
    L.divIcon({
      className: "search-marker",
      html: "<span class='search-marker-dot'></span>",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })
  ), []);

  // setSearchCity(props.transcript); 

  // ✅ Memoize API key to prevent re-renders
  const memoizedApiKey = useMemo(() => OPENWEATHER_API_KEY, []);

  const tileEventHandlers = useMemo(() => ({
    loading: () => {
      tileLoadingRef.current = true;
    },
    load: () => {
      tileLoadingRef.current = false;
    },
  }), []);

  // ✅ Get User's Current Location
  useEffect(() => {
    let isMounted = true;

    getCurrentUserLocation()
      .then(({ lat, lon }) => {
        if (!isMounted) return;
        setLocation({ lat, lon });
        setError(null);
        setLoading(false);
      })
      .catch((geoError) => {
        if (!isMounted) return;
        setError(geoError.message || "Unable to access your location.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Fetch Air Quality Data with useCallback to prevent recreating on every render
  const fetchAirQuality = useCallback(async (lat, lon) => {
    try {
      const dataPoint = await fetchCurrentAQIByCoords(lat, lon);
      if (!dataPoint) {
        setError("No air quality data available.");
        return;
      }

      const components = dataPoint?.components || {};
      const calculatedAQI = Number(dataPoint?.calculatedAQI);
      if (!Number.isFinite(calculatedAQI)) {
        setError("Unable to calculate AQI from pollutant data.");
        return;
      }

      setcalAQI(calculatedAQI);
      setAirQuality({ lat, lon, aqi: calculatedAQI });
      setTotalData(components);
      console.log("Setpm25 " + components.pm2_5);
      console.log("Components Data: ", components);
    } catch (error) {
      console.error("Error fetching air quality data:", error);
      setError("Failed to fetch air quality data.");
    }
  }, []);

  // ✅ Fetch AQI when location changes
  useEffect(() => {
    if (location) {
      fetchAirQuality(location.lat, location.lon);
    }
  }, [location, fetchAirQuality]);

  useEffect(() => {
    if (!location || typeof onLocationChange !== "function") return;
    onLocationChange(location);
  }, [location, onLocationChange]);

  const flyToLocation = useCallback((lat, lon) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([lat, lon], DEFAULT_ZOOM, { duration: 0.9, easeLinearity: 0.25 });
  }, []);

  const waitForTiles = useCallback((timeoutMs = TILE_WAIT_TIMEOUT) => {
    const layer = tileLayerRef.current;
    if (!layer || !tileLoadingRef.current) return Promise.resolve();

    return new Promise((resolve) => {
      let timeoutId = null;
      const finish = () => {
        layer.off("load", onLoad);
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
      };
      const onLoad = () => finish();
      layer.on("load", onLoad);
      if (timeoutMs && Number.isFinite(timeoutMs)) {
        timeoutId = setTimeout(() => finish(), timeoutMs);
      }
    });
  }, []);

  const waitForMoveEnd = useCallback((timeoutMs = MOVE_WAIT_TIMEOUT) => {
    const map = mapRef.current;
    if (!map) return Promise.resolve();

    return new Promise((resolve) => {
      let timeoutId = null;
      const finish = () => {
        map.off("moveend", onMoveEnd);
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
      };
      const onMoveEnd = () => finish();
      map.on("moveend", onMoveEnd);
      if (timeoutMs && Number.isFinite(timeoutMs)) {
        timeoutId = setTimeout(() => finish(), timeoutMs);
      }
    });
  }, []);

  const runSearchTransition = useCallback(async (lat, lon) => {
    const map = mapRef.current;
    if (!map) {
      pendingSearchRef.current = { lat, lon };
      return;
    }

    searchSequenceRef.current += 1;
    const sequence = searchSequenceRef.current;
    isSearchAnimatingRef.current = true;

    map.stop();
    await waitForTiles();
    if (searchSequenceRef.current !== sequence) return;

    map.flyTo([lat, lon], SEARCH_TARGET_ZOOM, {
      duration: SEARCH_PAN_DURATION,
      easeLinearity: SEARCH_EASE_LINEARITY,
    });

    await waitForMoveEnd();
    if (searchSequenceRef.current !== sequence) return;

    await waitForTiles();
    if (searchSequenceRef.current !== sequence) return;

    isSearchAnimatingRef.current = false;
  }, [waitForTiles, waitForMoveEnd]);

  const formatResultLabel = useCallback((result) => {
    const parts = [result.name, result.state, result.country].filter(Boolean);
    return parts.join(", ");
  }, []);

  const dedupeResults = useCallback((results) => {
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
  }, []);

  const rankResults = useCallback((results, query) => {
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
  }, []);

  const fetchOpenWeatherCandidates = useCallback(async (query) => {
    if (!query) return [];

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${OWM_SEARCH_LIMIT}&appid=${memoizedApiKey}`,
        { timeout: 6000 }
      );

      return (response.data || [])
        .map(mapOpenWeatherResult)
        .filter(Boolean);
    } catch (fetchError) {
      console.error("OpenWeather geocoding error:", fetchError);
      return [];
    }
  }, [memoizedApiKey]);

  const fetchNominatimCandidates = useCallback(async (query) => {
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
  }, []);

  const searchGeocodingCandidates = useCallback(async (query) => {
    const variants = buildSearchVariants(query);
    const searchTasks = variants.flatMap((variant) => ([
      fetchOpenWeatherCandidates(variant),
      fetchNominatimCandidates(variant),
    ]));

    const settledResults = await Promise.allSettled(searchTasks);
    let mergedResults = settledResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value || []);

    // Retry with a shorter token for typo-heavy inputs.
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
  }, [dedupeResults, fetchNominatimCandidates, fetchOpenWeatherCandidates, rankResults]);

  const handleResultSelect = useCallback(async (result) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Invalid location coordinates. Please try another result.");
      return;
    }

    setSearchCity(formatResultLabel(result));
    setSearchResults([]);
    setError(null);
    setLocation({
      lat, lon, name: result.name || "",
      state: result.state || "",
      country: result.country || ""
    });
    await runSearchTransition(lat, lon);
  }, [formatResultLabel, runSearchTransition]);

  // ✅ Apply queued search animation once the map is ready
  useEffect(() => {
    if (!mapReady || !pendingSearchRef.current) return;
    const { lat, lon } = pendingSearchRef.current;
    pendingSearchRef.current = null;
    runSearchTransition(lat, lon);
  }, [mapReady, runSearchTransition]);

  // ✅ Recenter to user's location when available (skip during search animation)
  useEffect(() => {
    if (!location || !mapReady) return;
    if (isSearchAnimatingRef.current) return;
    flyToLocation(location.lat, location.lon);
  }, [location, mapReady, flyToLocation]);

  useEffect(() => {
    if (!mapReady || searchResults.length <= 1) return;
    const map = mapRef.current;
    if (!map) return;

    const bounds = L.latLngBounds(
      searchResults.map((result) => [Number(result.lat), Number(result.lon)])
    );

    map.stop();
    map.flyToBounds(bounds, {
      padding: [RESULTS_BOUNDS_PADDING, RESULTS_BOUNDS_PADDING],
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }, [mapReady, searchResults]);
  // ✅ Fetch City Coordinates with debouncing
  const fetchCityCoordinates = useCallback(async (queryInput) => {
    const query = (queryInput || "").trim();
    if (!query) return;
    const cacheKey = normalizeText(query);

    const requestSeq = searchRequestSeqRef.current + 1;
    searchRequestSeqRef.current = requestSeq;

    setSearching(true);
    setError(null);
    setSearchResults([]);
    try {
      let results = searchCacheRef.current.get(cacheKey);
      if (!results) {
        results = await searchGeocodingCandidates(query);
        searchCacheRef.current.set(cacheKey, results);
        if (searchCacheRef.current.size > 60) {
          const oldestKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(oldestKey);
        }
      }

      if (searchRequestSeqRef.current !== requestSeq) return;

      if (results.length > 0) {
        if (results.length === 1) {
          await handleResultSelect(results[0]);
          return;
        }

        setSearchResults(results);
      } else {
        setError("City not found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching city coordinates:", error);
      setError("Failed to fetch city coordinates. Please try again.");
    } finally {
      if (searchRequestSeqRef.current === requestSeq) {
        setSearching(false);
      }
    }
  }, [handleResultSelect, searchGeocodingCandidates]);

  useEffect(() => {
    const externalQuery = (city || "").trim();
    if (!externalQuery) return;
    setSearchCity(externalQuery);
    fetchCityCoordinates(externalQuery);
  }, [city, fetchCityCoordinates]);

  // 🎨 Define Circle Colors Based on AQI Levels
  const getColor = (aqi) => getAQIMetadata(aqi).color;

  // Get AQI Badge Variant
  const getAQIBadgeVariant = (aqi) => getAQIMetadata(aqi).variant;

  // Get AQI Label
  const getAQILabel = (aqi) => getAQIMetadata(aqi).label;

  // 🛠️ Suggestions for Air Quality Improvement
  const getRecommendations = (aqi) => getAQIRecommendation(aqi);

  return (
    <>
      <div className="dashboard-top">
        {/* Map Section */}
        <div className="map-section">
          <Card
            title="Interactive Air Quality Map"
            subtitle="Real-time AQI monitoring with location-based data"
            icon="🗺️"
            action={
              calAQI !== null && (
                <Badge variant={getAQIBadgeVariant(calAQI)} size="lg">
                  AQI: {calAQI} - {getAQILabel(calAQI)}
                </Badge>
              )
            }
          >
            {/* Search Bar */}
            <div className="map-search-bar">
              <input
                type="text"
                value={searchCity}
                onChange={(e) => {
                  setSearchCity(e.target.value);
                  setSearchResults([]);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchCityCoordinates(searchCity);
                  }
                }}
                placeholder="Search city/state/country"
                className="search-input"
              />
              <button
                onClick={() => fetchCityCoordinates(searchCity)}
                className="search-button"
                disabled={searching || !searchCity}
              >
                {searching ? '🔍' : '🔎'} Search
              </button>
            </div>
            <p className="search-helper-text">
              Search by city, city plus state, or country. If multiple matches appear, select one from the list or map.
            </p>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.name}-${result.lat}-${result.lon}`}
                    className="search-result-item"
                    onClick={() => handleResultSelect(result)}
                  >
                    <span className="search-result-name">{formatResultLabel(result)}</span>
                    <span className="search-result-meta">
                      {Number(result.lat).toFixed(3)}, {Number(result.lon).toFixed(3)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Map Container */}
            <div className="map-container-wrapper">
              {loading ? (
                <Loader size="lg" text="Loading map data..." />
              ) : (
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}
                  className="leaflet-map"
                  preferCanvas={true}
                  whenReady={(event) => {
                    const mapInstance = event?.target ?? event;
                    mapRef.current = mapInstance;
                    setMapReady(true);
                    console.log("Map loaded successfully");
                  }}
                >
                  <TileLayer
                    ref={tileLayerRef}
                    eventHandlers={tileEventHandlers}
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                    maxZoom={19}
                    keepBuffer={2}
                    updateWhenZooming={false}
                  />

                  {searchResults.length > 0 && searchResults.map((result) => (
                    <Marker
                      key={`result-${result.name}-${result.lat}-${result.lon}`}
                      position={[Number(result.lat), Number(result.lon)]}
                      icon={searchMarkerIcon}
                      eventHandlers={{
                        click: () => handleResultSelect(result),
                      }}
                      zIndexOffset={1000}
                    >
                      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                        {formatResultLabel(result)}
                      </Tooltip>
                    </Marker>
                  ))}

                  {/* ✅ Show Air Quality Circle Based on AQI */}
                  {airQuality && (
                    <Circle
                      center={[airQuality.lat, airQuality.lon]}
                      radius={500}
                      pathOptions={{
                        color: getColor(calAQI),
                        fillColor: getColor(calAQI),
                        fillOpacity: 0.5,
                      }}
                    >
                      <Popup>
                        <div className="map-popup">
                          <h4 className="popup-title">Air Quality Index</h4>
                          <div className="popup-aqi">
                            <span className="popup-aqi-value">{airQuality.aqi}</span>
                            <Badge variant={getAQIBadgeVariant(calAQI)} size="sm">
                              {getAQILabel(calAQI)}
                            </Badge>
                          </div>
                          <p className="popup-recommendation">{getRecommendations(calAQI)}</p>
                        </div>
                      </Popup>
                    </Circle>
                  )}

                  {/* ✅ Show Errors (if any) */}
                  {error && (
                    <div className="map-error">
                      ⚠️ {error}
                    </div>
                  )}
                </MapContainer>
              )}
            </div>

            {/* AQI Legend */}
            <div className="map-legend">
              <div className="legend-title">AQI Scale</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#10B981' }}></span>
                  <span className="legend-label">0-50 Good</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#FBBF24' }}></span>
                  <span className="legend-label">51-100 Moderate</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#F59E0B' }}></span>
                  <span className="legend-label">101-150 Unhealthy</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#EF4444' }}></span>
                  <span className="legend-label">151+ Very Unhealthy</span>
                </div>
              </div>

              {aqiData?.currentAQI >= 120 && (
                <button
                  className="analyze-btn"
                  onClick={handleAnalyzeArea}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? "Analyzing..." : "🧠 Analyze Area"}
                </button>
              )}

              {/* {areaAnalysis && (
                <div className="ai-analysis-dashboard">
                  <div className="analysis-card">
                    <h4>Main Causes</h4>
                    <ul>
                      {areaAnalysis.main_causes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="analysis-card">
                    <h4>Government Solutions</h4>
                    <ul>
                      {areaAnalysis.government_solutions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="analysis-card">
                    <h4>Citizen Actions</h4>
                    <ul>
                      {areaAnalysis.citizen_actions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* <div className="analysis-card confidence">
                    <h4>Confidence</h4>
                    <p>{areaAnalysis.confidence}</p>
                  </div> 
                </div>
              )} */}

              {/* {aqiData?.currentAQI >= 120 && <AqiAnalysisDashboard areaAnalysis={areaAnalysis} />} */}

              {aqiData?.currentAQI >= 120 && (
                <div className="ai-analysis-wrapper">

                  {analysisLoading && (
                    <div className="ai-analysis-loader">
                      <Loader size="md" text="AI analyzing area..." />
                    </div>
                  )}

                  {!analysisLoading && areaAnalysis && (
                    <AqiAnalysisDashboard areaAnalysis={areaAnalysis} />
                  )}

                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Pollutants Sidebar */}
        <div className="pollutants-section">
          {totalData ? <Sidebar totalData={totalData} /> : (
            <div className="pollutant-sidebar">
              <Loader size="md" text="Loading pollutant data..." />
            </div>
          )}
        </div>
      </div>

      {/* Cigarette Equivalent */}
      {location && totalData && (
        <div className="dashboard-bottom">
          <Cigrate location={location} totalData={totalData} calculatedAQI={calAQI} />
        </div>
      )}
    </>
  );
};

export default MapView;


