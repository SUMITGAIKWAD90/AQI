import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import axios from "axios";
import AirQualityChart from "./AirQualityChart";
import Sidebar from "./Sidebar";
import Cigrate from "./Cigrate";
import VoiceAssistant from "./VoiceAssistant";

const MapView = ({city}) => {
  const [center, setCenter] = useState([18.5204, 73.8567]); // Default: Pune
  const [location, setLocation] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [predictedAQI, setPredictedAQI] = useState(null);
  const [error, setError] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [calAQI, setcalAQI] = useState(null);
  const [totalData, setTotalData] =  useState(null);
  const [pm25, setpm25] = useState(null);

  const apiKey = "d20a1d1d93a48db41372a0393ad30a84"; // OpenWeather API Key
  // setSearchCity(props.transcript); 


  // ✅ Get User's Current Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocation({ lat, lon });
        },
        (err) => {
          setError(err.message);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  }, []);

  // ✅ Update map center when location is available
  useEffect(() => {
    if (location) {
      setCenter([location.lat, location.lon]);
      fetchAirQuality(location.lat, location.lon);
    }
  }, [location]);

  // ✅ Fetch Air Quality Data
  const fetchAirQuality = async (lat, lon) => {
    try {
      const response = await axios.get(
        `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );

      const aqiData = await Calculated(lat, lon);
      setcalAQI(aqiData.calculatedAQI);

      const aqi = response.data.list[0].main.aqi; // Extract AQI value
      setAirQuality({ lat, lon, aqi: aqiData.calculatedAQI });

      const components = response.data.list[0].components;
      setTotalData(components); // Store only the components, if needed
      setpm25(components.pm2_5);
      console.log("Setpm25 "+ pm25);
      console.log("Components Data: ", components);
      // Predict future AQI
      predictFutureAQI(aqi);
    } catch (error) {
      console.error("Error fetching air quality data:", error);
    }
  };

  // ✅ Fetch City Coordinates
  const fetchCityCoordinates = async () => {
    if (!searchCity) return;

    try {
      const response = await axios.get(
        `http://api.openweathermap.org/geo/1.0/direct?q=${searchCity}&limit=1&appid=${apiKey}`
      );

      if (response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setCenter([lat, lon]);
        console.log("location :" + location);
        fetchAirQuality(lat, lon);
      } else {
        setError("City not found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching city coordinates:", error);
    }
  };

  // 🎯 Predict Future AQI (Using a Simple Trend Model)
  const predictFutureAQI = (currentAQI) => {
    // Simulating a future AQI based on current trends
    const randomFactor = Math.random() * 2 - 1; // Randomly decrease/increase
    let futureAQI = Math.round(currentAQI + randomFactor);
    futureAQI = Math.min(5, Math.max(1, futureAQI)); // Keep within 1-5 range

    setPredictedAQI(futureAQI);
  };

  // 🎨 Define Circle Colors Based on AQI Levels
  const getColor = (aqi) => {
    if (aqi < 50) return "green"; // Good
    if (50 < aqi < 100) return "yellow"; // Moderate
    if (100 < aqi < 150) return "orange"; // Unhealthy
    if (aqi > 150) return "red"; // Unhealthy
    return "gray"; // Default
  };

  // 🛠️ Suggestions for Air Quality Improvement
  const getRecommendations = (aqi) => {
    if (aqi < 50) {
      return "Air quality is good. Maintain greenery and reduce vehicle emissions.";
    } else if (50 < aqi < 100) {
      return "Moderate air quality. Consider using air purifiers and reducing outdoor activities.";
    } else if (100 < aqi < 150) {
      return "Unhealthy air quality. Elder,childern and people with lung disease may be affected";
    } else {
      return "Unhealthy air quality! Avoid outdoor activities, wear masks, and reduce fossil fuel use.";
    }
  };

  //Calculate AQI

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

  const pm25Breakpoints = [
    { C_low: 0, C_high: 12, I_low: 0, I_high: 50 },
    { C_low: 12.1, C_high: 35.4, I_low: 51, I_high: 100 },
    { C_low: 35.5, C_high: 55.4, I_low: 101, I_high: 150 },
    { C_low: 55.5, C_high: 150.4, I_low: 151, I_high: 200 },
    { C_low: 150.5, C_high: 250.4, I_low: 201, I_high: 300 },
    { C_low: 250.5, C_high: 500.4, I_low: 301, I_high: 500 },
  ];

  const pm10Breakpoints = [
    { C_low: 0, C_high: 54, I_low: 0, I_high: 50 },
    { C_low: 55, C_high: 154, I_low: 51, I_high: 100 },
    { C_low: 155, C_high: 254, I_low: 101, I_high: 150 },
    { C_low: 255, C_high: 354, I_low: 151, I_high: 200 },
    { C_low: 355, C_high: 424, I_low: 201, I_high: 300 },
    { C_low: 425, C_high: 604, I_low: 301, I_high: 500 },
  ];

  const Calculated = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );

      const data = response.data.list[0];
      const pollutants = data.components;
      const apiAQI = data.main.aqi;

      const aqiPm25 = calculateAQI(pollutants.pm2_5 || 0, pm25Breakpoints);
      const aqiPm10 = calculateAQI(pollutants.pm10 || 0, pm10Breakpoints);
      const calculatedAQI = Math.max(aqiPm25, aqiPm10);

      return { apiAQI, calculatedAQI, pollutants };
    } catch (error) {
      console.error("Error fetching air quality data:", error);
      return null;
    }
  };

  return (
    <>
    <div style={{ display: "flex", height: "90vh", padding: "20px", gap: "20px" }}>
      <div  style={{ flex: 1, margin: "10px", padding: "20px", background: "#f0f0f0", borderRadius: "10px" }}>
        {/* Search Bar */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "white",
            padding: "2px",
            borderRadius: "10px",
            boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
            display: "flex",
            gap: "0px",
            marginTop:"8rem",
            marginLeft:"4rem",
           
          }}
        >
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="Enter city name"
            style={{
              padding: "6px",
              paddingLeft:"0px",
              border: "1px solid #ccc",
              borderRadius: "5px",
              outline: "none",
            }}
          />
          <button
            onClick={fetchCityCoordinates}
            style={{
              padding: "8px ",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop:"5px",
            }}
          >
            Search
          </button>
          
          {/* <VoiceAssistant/> */}
        </div>
        {/* <span style={{
            padding: "2px",
            backgroundColor:"lightslategray",
            marginLeft:"100vh"
          }}>
            Wild Fire
          </span> */}
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "70vh", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* ✅ Show Air Quality Circle Based on AQI */}
          {airQuality && (
            <Circle
              center={[airQuality.lat, airQuality.lon]}
              radius={500} // Radius in meters
              pathOptions={{
                color: getColor(calAQI),
                fillColor: getColor(calAQI),
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <strong>Current AQI: {airQuality.aqi}</strong>
                {/*<br />
               <span>
                {airQuality.aqi === 1 || airQuality.aqi === 2
                  ? "Good "
                  : airQuality.aqi === 3
                  ? "Moderate "
                  : "Unhealthy "}
              </span> 
              <br />
              <strong>Predicted AQI (Next 24h): {predictedAQI}</strong>*/}
                <br />
                <span>{getRecommendations(calAQI)}</span>
              </Popup>
            </Circle>
          )}

          {/* ✅ Show Errors (if any) */}
          {error && (
            <p
              style={{ color: "red", position: "absolute", top: 50, left: 10 }}
            >
              {error}
            </p>
          )}
        </MapContainer>
        {/* <AirQualityChart lat ={location.lat} lon ={location.lon} /> */}
      </div>
       <div style={{ width: "300px", margin: "10px", padding: "20px", background: "#e0e0e0", borderRadius: "10px" }}>
        {/* PPass air quality to sidebar */}
        {totalData  && <Sidebar totalData={totalData} />}
      </div> 
    </div>
    <hr/>
    <div style={{display:"flex"}}>
    <AirQualityChart/>
   {location && totalData && <Cigrate location={location} totalData={totalData}/>}
 
   </div>
    </>
  );
};

export default MapView;
