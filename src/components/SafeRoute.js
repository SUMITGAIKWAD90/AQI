import "leaflet/dist/leaflet.css";
import React, { useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import './SafeRote.css'


const SafeRoute = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState([]);
  const [aqiData, setAqiData] = useState([]);

  // Function to get coordinates from city name
  const getCoordinates = async (city) => {
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
  };

  // Function to fetch AQI data for a given point
  const getAQI = async (lat, lng) => {
    try {
      const res = await fetch(
        `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=d20a1d1d93a48db41372a0393ad30a84`
      );
      const data = await res.json();
      return data.list[0]?.main?.aqi || 5; // Default to worst AQI if not found
    } catch (error) {
      console.error("AQI Fetch Error:", error);
      return 5;
    }
  };

  // Function to fetch multiple routes and AQI data
  const handleRouteSearch = async () => {
    try {
      const sourceCoords = await getCoordinates(source);
      const destinationCoords = await getCoordinates(destination);

      if (!sourceCoords || !destinationCoords) {
        alert("Invalid city names! Please try again.");
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
    }
  };

  // Assign alternating colors based on AQI sorting
  const getRouteColor = (index) => {
    return index === 0 ? "red" : "green"; // First route = Green (better AQI), Second = Red (worse AQI)
  };

  return (
    <div >  
      <hr/>
      <h2>Find the Safest Route</h2>
      <div className="main">
      <input
        type="text"
        placeholder="Enter Source City"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter Destination City"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />

      <button onClick={handleRouteSearch}>Find Route</button>
</div>

<h3>Finding best route from {source} to {destination} </h3>

      {/* Leaflet Map */}
      <MapContainer center={[20, 78]} zoom={6} style={{ height: "400px", width: "80%" ,marginBottom:"50px", marginLeft:"50%", transform: "translateX(-50%)" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Display Multiple Routes with sorted AQI */}
        {routes.map((route, index) => (
          <Polyline
            key={index}
            positions={route}
            color={getRouteColor(index)} // First route is green (better AQI), second is red
            weight={5}
            opacity={0.8}
          >
            <Tooltip sticky>
              <b>Route {index + 1}</b> <br />
              <b>AQI:</b> {aqiData[index]?.toFixed(2)}
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

      {/* <div>
        <h3>AQI for Routes:</h3>
        {aqiData.map((aqi, index) => (
          <p key={index}>
            Route {index + 1}: AQI {aqi.toFixed(2)} {" "}
            {aqi <= 1 ? "✅ Safest" : aqi <= 2 ? " Good" : aqi <= 3 ? " Moderate" : aqi <= 4 ? " Unhealthy" : " Hazardous"}
          </p>
        ))}
      </div> */}
    </div>
  );
};

export default SafeRoute;