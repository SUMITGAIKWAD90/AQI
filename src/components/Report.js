import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Report.css";

const pm25Breakpoints = [0, 12, 35, 55, 150, 250, 500]; // Example breakpoints
const pm10Breakpoints = [0, 50, 150, 250, 350, 420, 600]; // Example breakpoints

const calculateAQI = (concentration, breakpoints) => {
  let aqi = 0;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (concentration <= breakpoints[i + 1]) {
      aqi = (i + 1) * 50; // Example AQI calculation
      break;
    }
  }
  return aqi;
};

const Report = (props) => {
  const [forecast, setForecast] = useState([]);

  const fetchForecast = async () => {
    try {
      const res = await fetch(
        `http://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${props.lat}&lon=${props.long}&appid=d20a1d1d93a48db41372a0393ad30a84`
      );
      const data = await res.json();

      // Process data before storing it
      const processedData = data.list.map((entry) => {
        const pollutants = entry.components;
        const aqiPm25 = calculateAQI(pollutants.pm2_5 || 0, pm25Breakpoints);
        const aqiPm10 = calculateAQI(pollutants.pm10 || 0, pm10Breakpoints);
        const calculatedAQI = Math.max(aqiPm25, aqiPm10);

        return {
          ...entry,
          calculatedAQI,
        };
      });

      setForecast(processedData);
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      setForecast([]);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [props.lat, props.long]);

  return (
    <div className="report-container">
      <h2>AI-Based <br/>Air Quality Forecast</h2>
      {forecast.length > 0 ? (
        <div className="table-container">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>📅 Date & Time</th>
                {/* <th>🌍 AQI Level (Calculated)</th> */}
                <th>💨 PM2.5 (µg/m³)</th>
                <th>🔴 PM10 (µg/m³)</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((entry, index) => (
                <tr key={index}>
                  <td>{new Date(entry.dt * 1000).toLocaleString()}</td>
                  {/* <td>
                    <span className={`aqi-badge aqi-${entry.calculatedAQI}`}>
                      {entry.calculatedAQI}
                    </span>
                  </td> */}
                  <td>{entry.components.pm2_5}</td>
                  <td>{entry.components.pm10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Error fetching data or no data available.</p>
      )}
    </div>
  );
};

export default Report;
