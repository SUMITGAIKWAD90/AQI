import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
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
  const [center, setCenter] = useState([18.5204, 73.8567]); // Default: Pune
  const [location, setLocation] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [apiAQI, setApiAQI] = useState(null);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [calAQI, setcalAQI] = useState(null);
  const [totalData, setTotalData] =  useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const apiKey = "d20a1d1d93a48db41372a0393ad30a84"; // OpenWeather API Key
  // setSearchCity(props.transcript); 

  // ✅ Memoize API key to prevent re-renders
  const memoizedApiKey = useMemo(() => apiKey, []);

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

  // ✅ Update map center when location is available
  useEffect(() => {
    if (location) {
      setCenter([location.lat, location.lon]);
      fetchAirQuality(location.lat, location.lon);
    }
  }, [location, fetchAirQuality]);

  // ✅ Fetch City Coordinates with debouncing
  const fetchCityCoordinates = useCallback(async () => {
    if (!searchCity) return;

    setSearching(true);
    setError(null);
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchCity)}&limit=1&appid=${memoizedApiKey}`
      );

      if (response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setLocation({ lat, lon });
        setCenter([lat, lon]);
      } else {
        setError("City not found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching city coordinates:", error);
      setError("Failed to fetch city coordinates. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchCity, memoizedApiKey]);

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
                onChange={(e) => setSearchCity(e.target.value)}
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

            {/* Map Container */}
            <div className="map-container-wrapper">
              {loading ? (
                <Loader size="lg" text="Loading map data..." />
              ) : (
                <MapContainer
                  center={center}
                  zoom={13}
                  style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}
                  className="leaflet-map"
                  preferCanvas={true}
                  whenReady={() => console.log("Map loaded successfully")}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                    maxZoom={19}
                    keepBuffer={2}
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
