import { useEffect, useState } from "react";
import Badge from "./Badge";
import Loader from "./Loader";
import "./Report.css";

const pm25Breakpoints = [0, 12, 35, 55, 150, 250, 500];
const pm10Breakpoints = [0, 50, 150, 250, 350, 420, 600];

const calculateAQI = (concentration, breakpoints) => {
  let aqi = 0;
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (concentration <= breakpoints[i + 1]) {
      aqi = (i + 1) * 50;
      break;
    }
  }
  return aqi;
};

const getAQIBadgeVariant = (aqi) => {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthy";
  if (aqi <= 200) return "very-unhealthy";
  return "hazardous";
};

const Report = (props) => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${props.lat}&lon=${props.long}&appid=d20a1d1d93a48db41372a0393ad30a84`
      );
      const data = await res.json();

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
      setLoading(false);
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      setError("Failed to load forecast data");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [props.lat, props.long]);

  return (
    <div className="report-container">
      <div className="report-header">
        <h3 className="report-title">🔮 5-Day Air Quality Forecast</h3>
        <p className="report-subtitle">AI-powered predictions based on PM2.5 and PM10 levels</p>
      </div>

      {loading ? (
        <Loader size="md" text="Loading forecast data..." />
      ) : error ? (
        <div className="report-error">
          <span className="error-icon">⚠️</span>
          <p className="error-message">{error}</p>
        </div>
      ) : forecast.length > 0 ? (
        <div className="forecast-table-wrapper">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>📅 Date & Time</th>
                <th>💨 PM2.5</th>
                <th>🔴 PM10</th>
                <th>🌍 AQI</th>
              </tr>
            </thead>
            <tbody>
              {forecast.slice(0, 40).map((entry, index) => (
                <tr key={index}>
                  <td className="date-cell">
                    {new Date(entry.dt * 1000).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="value-cell">{entry.components.pm2_5.toFixed(1)} µg/m³</td>
                  <td className="value-cell">{entry.components.pm10.toFixed(1)} µg/m³</td>
                  <td className="badge-cell">
                    <Badge variant={getAQIBadgeVariant(entry.calculatedAQI)} size="sm">
                      {entry.calculatedAQI}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="report-empty">
          <p>No forecast data available</p>
        </div>
      )}
    </div>
  );
};

export default Report;
