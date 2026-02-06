import { useMemo, useState } from 'react';
import Badge from './Badge';
import Card from './Card';
import './Cigrate.css';
import Report from './Report';

function Cigrate({ location, totalData, apiAQI }) {
  const [showReport, setShowReport] = useState(false);

  const lat = location.lat;
  const long = location.lon;
  const pm25Value = totalData?.pm2_5 ?? null;
  const cigarettes = useMemo(() => {
    if (pm25Value === null) return null;
    return (pm25Value / 22).toFixed(2);
  }, [pm25Value]);

  const getAQIDetails = (aqiValue) => {
    const details = {
      1: {
        title: "🌿 Excellent Air Quality",
        message: "The air is fresh and safe to breathe. Enjoy your day outdoors!",
        variant: "good"
      },
      2: {
        title: "😷 Moderate Air Quality",
        message: "Some pollutants are present. Sensitive individuals should be cautious.",
        variant: "moderate"
      },
      3: {
        title: "⚠️ Unhealthy for Sensitive Groups",
        message: "People with breathing issues should limit outdoor activities.",
        variant: "unhealthy"
      },
      4: {
        title: "❌ Unhealthy Air Quality",
        message: "Everyone may experience health effects. Reduce outdoor exposure.",
        variant: "very-unhealthy"
      },
      5: {
        title: "☠️ Hazardous Air Quality",
        message: "Extremely bad air! Stay indoors and wear a mask if going out.",
        variant: "hazardous"
      }
    };
    return details[aqiValue] || details[2];
  };

  const aqiDetails = getAQIDetails(apiAQI);

  return (
    <Card 
      title="Health Impact Analysis"
      subtitle="Cigarette equivalent and air quality recommendations"
      icon="🏥"
    >
      <div className="cigrate-container">
        {/* AQI Notification */}
        {apiAQI !== null && (
          <div className="aqi-notification">
            <div className="notification-header">
              <h4 className="notification-title">{aqiDetails.title}</h4>
              <Badge variant={aqiDetails.variant} size="md">AQI {apiAQI}</Badge>
            </div>
            <p className="notification-message">{aqiDetails.message}</p>
          </div>
        )}

        {/* Cigarette Equivalent */}
        <div className="cigarette-section">
          {pm25Value !== null ? (
            <>
              <div className="cigarette-metric">
                <div className="metric-icon">🌫️</div>
                <div className="metric-content">
                  <span className="metric-label">PM2.5 Level</span>
                  <span className="metric-value">{pm25Value.toFixed(2)} µg/m³</span>
                </div>
              </div>
              
              <div className="cigarette-equivalence">
                <div className="equivalence-icon">🚬</div>
                <div className="equivalence-content">
                  <span className="equivalence-label">Daily Cigarette Equivalent</span>
                  <span className="equivalence-value">{cigarettes} cigarettes</span>
                  <span className="equivalence-hint">Based on PM2.5 exposure</span>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-message">
              <span className="loading-icon">⏳</span>
              <span>Loading air quality data...</span>
            </div>
          )}
        </div>

        {/* Prediction Button */}
        <button 
          onClick={() => setShowReport(!showReport)}
          className="prediction-button"
        >
          {showReport ? "Hide Predictions" : "View 5-Day AQI Forecast"}
        </button>

        {/* Show Report component when button is clicked */}
        {showReport && <Report lat={lat} long={long} />}
      </div>
    </Card>
  );
}

export default Cigrate;
