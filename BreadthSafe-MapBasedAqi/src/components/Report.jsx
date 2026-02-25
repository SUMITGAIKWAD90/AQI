import { useCallback, useEffect, useState } from "react";
import Badge from "./Badge";
import Loader from "./Loader";
import "./Report.css";
import { getAQIMetadata } from "./airQualityUtils";
import { fetchAQIForecastByCoords } from "./openWeatherApi";

const Report = ({ lat, long }) => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const forecastRows = await fetchAQIForecastByCoords(lat, long);
      setForecast(forecastRows);
      setLoading(false);
    } catch (fetchError) {
      console.error("Error fetching forecast data:", fetchError);
      setError("Failed to load forecast data");
      setLoading(false);
    }
  }, [lat, long]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return (
    <div className="report-container">
      <div className="report-header">
        <h3 className="report-title">5-Day Air Quality Forecast</h3>
        <p className="report-subtitle">Uses the same OpenWeather AQI pipeline as current map values</p>
      </div>

      {loading ? (
        <Loader size="md" text="Loading forecast data..." />
      ) : error ? (
        <div className="report-error">
          <span className="error-icon">!</span>
          <p className="error-message">{error}</p>
        </div>
      ) : forecast.length > 0 ? (
        <div className="forecast-table-wrapper">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>PM2.5</th>
                <th>PM10</th>
                <th>AQI</th>
              </tr>
            </thead>
            <tbody>
              {forecast.slice(0, 40).map((entry, index) => (
                <tr key={index}>
                  <td className="date-cell">
                    {new Date(Number(entry.dt) * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="value-cell">{Number(entry?.components?.pm2_5 || 0).toFixed(1)} ug/m3</td>
                  <td className="value-cell">{Number(entry?.components?.pm10 || 0).toFixed(1)} ug/m3</td>
                  <td className="badge-cell">
                    <Badge variant={getAQIMetadata(entry?.calculatedAQI).variant} size="sm">
                      {Number.isFinite(Number(entry?.calculatedAQI)) ? Number(entry.calculatedAQI) : "-"}
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
