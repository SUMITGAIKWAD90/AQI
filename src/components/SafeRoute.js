import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import Badge from "./Badge";
import Card from "./Card";
import Loader from "./Loader";
import './SafeRote.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});


const SafeRoute = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState([]);
  const [aqiData, setAqiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memoize API key
  const apiKey = useMemo(() => "d20a1d1d93a48db41372a0393ad30a84", []);

  // Function to get coordinates from city name
  const getCoordinates = useCallback(async (city) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${city}`
      );
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    }
    return null;
  }, []);

  // Function to fetch AQI data for a given point
  const getAQI = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`
      );
      const data = await res.json();
      return data.list[0]?.main?.aqi || 5; // Default to worst AQI if not found
    } catch (error) {
      console.error("AQI Fetch Error:", error);
      return 5;
    }
  }, [apiKey]);

  // Function to fetch multiple routes and AQI data
  const handleRouteSearch = useCallback(async () => {
    if (!source || !destination) {
      setError("Please enter both source and destination cities");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const sourceCoords = await getCoordinates(source);
      const destinationCoords = await getCoordinates(destination);

      if (!sourceCoords || !destinationCoords) {
        setError("Invalid city names! Please try again.");
        setLoading(false);
        return;
      }

      // Fetch multiple routes using OSRM API
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${sourceCoords.lng},${sourceCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=full&geometries=geojson&alternatives=true`
      );
      const data = await response.json();

      if (data.routes.length > 0) {
        const allRoutes = data.routes.map((route) =>
          route.geometry.coordinates.map((coord) => ({
            lat: coord[1],
            lng: coord[0],
          }))
        );

        // Fetch AQI for each route
        const aqiResults = await Promise.all(
          allRoutes.map(async (route) => {
            const aqiValues = await Promise.all(
              route.slice(0, 10).map(async (point) => await getAQI(point.lat, point.lng))
            );
            return aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length;
          })
        );

        // Sort routes based on AQI (lowest AQI first)
        const sortedRoutes = allRoutes.map((route, index) => ({
          route,
          aqi: aqiResults[index],
        }));
        sortedRoutes.sort((a, b) => a.aqi - b.aqi);

        setRoutes(sortedRoutes.map((item) => item.route));
        setAqiData(sortedRoutes.map((item) => item.aqi));
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      setError("Failed to fetch routes. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [source, destination, getCoordinates, getAQI]);

  // Assign alternating colors based on AQI sorting
  const getRouteColor = (index) => {
    return index === 0 ? "#10B981" : "#EF4444"; // First route = Green (better AQI), Second = Red (worse AQI)
  };
  
  const getRouteLabel = (index, aqi) => {
    if (index === 0) return "Safest Route";
    return "Alternative Route";
  };
  
  const getAQIBadge = (aqi) => {
    if (aqi <= 1) return { variant: "good", label: "Good" };
    if (aqi <= 2) return { variant: "moderate", label: "Moderate" };
    if (aqi <= 3) return { variant: "unhealthy", label: "Unhealthy" };
    if (aqi <= 4) return { variant: "very-unhealthy", label: "Very Unhealthy" };
    return { variant: "hazardous", label: "Hazardous" };
  };

  return (
    <Card 
      title="Safest Route Finder"
      subtitle="Compare routes based on air quality along the path"
      icon="🛣️"
    >
      <div className="route-finder">
        {/* Input Section */}
        <div className="route-inputs">
          <div className="input-group">
            <label className="input-label">Source City</label>
            <input
              type="text"
              placeholder="e.g., Mumbai"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="route-input"
            />
          </div>
          
          <div className="route-arrow">→</div>
          
          <div className="input-group">
            <label className="input-label">Destination City</label>
            <input
              type="text"
              placeholder="e.g., Pune"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="route-input"
            />
          </div>
          
          <button 
            onClick={handleRouteSearch} 
            className="route-button"
            disabled={loading || !source || !destination}
          >
            {loading ? "Finding Routes..." : "Find Routes"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="route-error">
            ⚠️ {error}
          </div>
        )}

        {/* Route Info */}
        {source && destination && routes.length > 0 && (
          <div className="route-info">
            <h4 className="route-info-title">
              Routes from <span className="city-name">{source}</span> to <span className="city-name">{destination}</span>
            </h4>
            <div className="route-legend-container">
              <div className="route-legend-item">
                <span className="route-legend-line" style={{ background: '#10B981' }}></span>
                <span className="route-legend-text">Safest Route (Best AQI)</span>
              </div>
              <div className="route-legend-item">
                <span className="route-legend-line" style={{ background: '#EF4444' }}></span>
                <span className="route-legend-text">Alternative Routes</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="route-map-wrapper">
          {loading ? (
            <Loader size="lg" text="Calculating safest routes..." />
          ) : (
            <MapContainer 
              center={[20, 78]} 
              zoom={6} 
              style={{ height: "100%", width: "100%", borderRadius: "var(--radius-md)" }}
              className="route-map"
              preferCanvas={true}
              whenReady={() => console.log("Route map loaded successfully")}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
                maxZoom={19}
                keepBuffer={2}
              />

              {/* Display Multiple Routes with sorted AQI */}
              {routes.map((route, index) => (
                <Polyline
                  key={index}
                  positions={route}
                  color={getRouteColor(index)}
                  weight={5}
                  opacity={0.8}
                >
                  <Tooltip sticky>
                    <div className="route-tooltip">
                      <strong>{getRouteLabel(index, aqiData[index])}</strong>
                      <div className="tooltip-aqi">
                        <span>Avg AQI: {aqiData[index]?.toFixed(2)}</span>
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              ))}

              {/* Start & End Markers */}
              {routes.length > 0 && (
                <>
                  <Marker position={routes[0][0]} />
                  <Marker position={routes[0][routes[0].length - 1]} />
                </>
              )}
            </MapContainer>
          )}
        </div>

        {/* Route Statistics */}
        {routes.length > 0 && !loading && (
          <div className="route-stats">
            {aqiData.map((aqi, index) => {
              const badge = getAQIBadge(aqi);
              return (
                <div key={index} className="route-stat-card">
                  <div className="stat-header">
                    <div className="stat-route-indicator" style={{ background: getRouteColor(index) }}></div>
                    <h5 className="stat-title">{getRouteLabel(index, aqi)}</h5>
                  </div>
                  <div className="stat-body">
                    <div className="stat-aqi">
                      <span className="stat-label">Average AQI</span>
                      <span className="stat-value">{aqi.toFixed(2)}</span>
                    </div>
                    <Badge variant={badge.variant} size="md">
                      {badge.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {routes.length === 0 && !loading && (
          <div className="route-empty">
            <span className="empty-icon">🗺️</span>
            <p className="empty-text">Enter source and destination to find the safest route</p>
            <p className="empty-hint">We'll analyze air quality along multiple paths</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SafeRoute;
