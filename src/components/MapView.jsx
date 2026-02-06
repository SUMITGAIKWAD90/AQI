import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Popup, TileLayer } from "react-leaflet";
import Badge from "./Badge";
import Card from "./Card";
import Cigrate from "./Cigrate";
import Loader from "./Loader";
import "./MapView.css";
import Sidebar from "./Sidebar";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const PM25_BREAKPOINTS = [
  { C_low: 0, C_high: 12, I_low: 0, I_high: 50 },
  { C_low: 12.1, C_high: 35.4, I_low: 51, I_high: 100 },
  { C_low: 35.5, C_high: 55.4, I_low: 101, I_high: 150 },
  { C_low: 55.5, C_high: 150.4, I_low: 151, I_high: 200 },
  { C_low: 150.5, C_high: 250.4, I_low: 201, I_high: 300 },
  { C_low: 250.5, C_high: 500.4, I_low: 301, I_high: 500 },
];

const PM10_BREAKPOINTS = [
  { C_low: 0, C_high: 54, I_low: 0, I_high: 50 },
  { C_low: 55, C_high: 154, I_low: 51, I_high: 100 },
  { C_low: 155, C_high: 254, I_low: 101, I_high: 150 },
  { C_low: 255, C_high: 354, I_low: 151, I_high: 200 },
  { C_low: 355, C_high: 424, I_low: 201, I_high: 300 },
  { C_low: 425, C_high: 604, I_low: 301, I_high: 500 },
];

const DEFAULT_CENTER = [18.5204, 73.8567]; // Default: Pune
const DEFAULT_ZOOM = 13;
const SEARCH_TARGET_ZOOM = DEFAULT_ZOOM;
const SEARCH_PAN_DURATION = 1.2; // seconds
const SEARCH_EASE_LINEARITY = 0.25;
const TILE_WAIT_TIMEOUT = 3500; // ms
const MOVE_WAIT_TIMEOUT = 2500; // ms

const calculateAQI = (concentration, breakpoints) => {
  for (let bp of breakpoints) {
    if (bp.C_low <= concentration && concentration <= bp.C_high) {
      return Math.round(
        ((bp.I_high - bp.I_low) / (bp.C_high - bp.C_low)) *
          (concentration - bp.C_low) +
          bp.I_low
      );
    }
  }
  return null;
};

const MapView = ({city}) => {
  const [location, setLocation] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [apiAQI, setApiAQI] = useState(null);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [calAQI, setcalAQI] = useState(null);
  const [totalData, setTotalData] =  useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const tileLoadingRef = useRef(false);
  const pendingSearchRef = useRef(null);
  const isSearchAnimatingRef = useRef(false);
  const searchSequenceRef = useRef(0);

  const apiKey = "d20a1d1d93a48db41372a0393ad30a84"; // OpenWeather API Key
  // setSearchCity(props.transcript); 

  // ✅ Memoize API key to prevent re-renders
  const memoizedApiKey = useMemo(() => apiKey, []);

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
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocation({ lat, lon });
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);

  // ✅ Fetch Air Quality Data with useCallback to prevent recreating on every render
  const fetchAirQuality = useCallback(async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${memoizedApiKey}`
      );

      const dataPoint = response?.data?.list?.[0];
      if (!dataPoint) {
        setError("No air quality data available.");
        return;
      }

      const components = dataPoint.components;
      const apiAQIValue = dataPoint.main?.aqi ?? null;
      const aqiPm25 = calculateAQI(components.pm2_5 || 0, PM25_BREAKPOINTS);
      const aqiPm10 = calculateAQI(components.pm10 || 0, PM10_BREAKPOINTS);
      const calculatedAQI = Math.max(aqiPm25 ?? 0, aqiPm10 ?? 0);

      setcalAQI(calculatedAQI);
      setApiAQI(apiAQIValue);
      setAirQuality({ lat, lon, aqi: calculatedAQI });
      setTotalData(components);
      console.log("Setpm25 " + components.pm2_5);
      console.log("Components Data: ", components);
    } catch (error) {
      console.error("Error fetching air quality data:", error);
    }
  }, [memoizedApiKey]);

  // ✅ Fetch AQI when location changes
  useEffect(() => {
    if (location) {
      fetchAirQuality(location.lat, location.lon);
    }
  }, [location, fetchAirQuality]);

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

  const pickBestResult = useCallback((results, query) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;

    const tokens = normalized
      .split(",")
      .flatMap((part) => part.trim().split(/\s+/))
      .filter(Boolean);

    if (tokens.length <= 1) return null;

    return results.find((result) => {
      const haystack = [result.name, result.state, result.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    }) || null;
  }, []);

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
    setLocation({ lat, lon });
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

  // ✅ Fetch City Coordinates with debouncing
  const fetchCityCoordinates = useCallback(async () => {
    if (!searchCity) return;

    setSearching(true);
    setError(null);
    setSearchResults([]);
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchCity)}&limit=5&appid=${memoizedApiKey}`
      );

      if (response.data.length > 0) {
        const bestResult = pickBestResult(response.data, searchCity);
        if (bestResult) {
          await handleResultSelect(bestResult);
          return;
        }

        if (response.data.length === 1) {
          await handleResultSelect(response.data[0]);
          return;
        }

        setSearchResults(response.data);
      } else {
        setError("City not found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching city coordinates:", error);
      setError("Failed to fetch city coordinates. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchCity, memoizedApiKey, pickBestResult, handleResultSelect]);

  // 🎨 Define Circle Colors Based on AQI Levels
  const getColor = (aqi) => {
    if (aqi < 50) return "#10B981"; // Good
    if (aqi < 100) return "#FBBF24"; // Moderate
    if (aqi < 150) return "#F59E0B"; // Unhealthy
    if (aqi >= 150) return "#EF4444"; // Very Unhealthy
    return "#64748B"; // Default
  };
  
  // Get AQI Badge Variant
  const getAQIBadgeVariant = (aqi) => {
    if (aqi < 50) return "good";
    if (aqi < 100) return "moderate";
    if (aqi < 150) return "unhealthy";
    if (aqi >= 150) return "very-unhealthy";
    return "default";
  };
  
  // Get AQI Label
  const getAQILabel = (aqi) => {
    if (aqi < 50) return "Good";
    if (aqi < 100) return "Moderate";
    if (aqi < 150) return "Unhealthy";
    if (aqi >= 150) return "Very Unhealthy";
    return "Unknown";
  };

  // 🛠️ Suggestions for Air Quality Improvement
  const getRecommendations = (aqi) => {
    if (aqi < 50) {
      return "Air quality is good. Maintain greenery and reduce vehicle emissions.";
    } else if (aqi < 100) {
      return "Moderate air quality. Consider using air purifiers and reducing outdoor activities.";
    } else if (aqi < 150) {
      return "Unhealthy air quality. Elder,childern and people with lung disease may be affected";
    } else {
      return "Unhealthy air quality! Avoid outdoor activities, wear masks, and reduce fossil fuel use.";
    }
  };

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
              calAQI && (
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
                }}
                onKeyPress={(e) => e.key === 'Enter' && fetchCityCoordinates()}
                placeholder="Search for a city..."
                className="search-input"
              />
              <button
                onClick={fetchCityCoordinates}
                className="search-button"
                disabled={searching || !searchCity}
              >
                {searching ? '🔍' : '🔎'} Search
              </button>
            </div>

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
          <Cigrate location={location} totalData={totalData} apiAQI={apiAQI} />
        </div>
      )}
    </>
  );
};

export default MapView;
