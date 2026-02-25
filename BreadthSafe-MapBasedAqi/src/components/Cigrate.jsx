import { HeartPulse } from "lucide-react";
import { useMemo, useState } from "react";
import Badge from "./Badge";
import Card from "./Card";
import "./Cigrate.css";
import Report from "./Report";
import { getAQIMetadata, getAQIRecommendation } from "./airQualityUtils";

function Cigrate({ location, totalData, calculatedAQI }) {
  const [showReport, setShowReport] = useState(false);

  const lat = location.lat;
  const long = location.lon;
  const pm25Value = totalData?.pm2_5 ?? null;

  const cigarettes = useMemo(() => {
    if (pm25Value === null) return null;
    return (pm25Value / 22).toFixed(2);
  }, [pm25Value]);

  const displayAQI = Number.isFinite(calculatedAQI) ? calculatedAQI : null;
  const aqiMeta = getAQIMetadata(displayAQI);
  const aqiMessage = getAQIRecommendation(displayAQI);

  return (
    <Card
      title="Health Impact Analysis"
      subtitle="Cigarette equivalent and air quality recommendations"
      icon={<HeartPulse size={20} />}
    >
      <div className="cigrate-container">
        {displayAQI !== null && (
          <div className="aqi-notification">
            <div className="notification-header">
              <h4 className="notification-title">{aqiMeta.label} Air Quality</h4>
              <Badge variant={aqiMeta.variant} size="md">AQI {Math.round(displayAQI)}</Badge>
            </div>
            <p className="notification-message">{aqiMessage}</p>
          </div>
        )}

        <div className="cigarette-section">
          {pm25Value !== null ? (
            <>
              <div className="cigarette-metric">
                <div className="metric-icon">PM</div>
                <div className="metric-content">
                  <span className="metric-label">PM2.5 Level</span>
                  <span className="metric-value">{pm25Value.toFixed(2)} ug/m3</span>
                </div>
              </div>

              <div className="cigarette-equivalence">
                <div className="equivalence-icon">EQ</div>
                <div className="equivalence-content">
                  <span className="equivalence-label">Daily Cigarette Equivalent</span>
                  <span className="equivalence-value">{cigarettes} cigarettes</span>
                  <span className="equivalence-hint">Based on PM2.5 exposure</span>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-message">
              <span className="loading-icon">...</span>
              <span>Loading air quality data...</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowReport(!showReport)}
          className="prediction-button"
        >
          {showReport ? "Hide Predictions" : "View 5-Day AQI Forecast"}
        </button>

        {showReport && <Report lat={lat} long={long} />}
      </div>
    </Card>
  );
}

export default Cigrate;
