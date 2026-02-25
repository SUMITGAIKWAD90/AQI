import clsx from "clsx";
import AQICharacter from "./AQICharacter";
import AQILevelBar from "./AQILevelBar";
import "./AqiHeroCard.css";

const getTier = (aqi) => {
  const value = Number(aqi);
  if (!Number.isFinite(value)) return "good";
  if (value <= 50) return "good";
  if (value <= 100) return "moderate";
  if (value <= 150) return "poor";
  if (value <= 200) return "unhealthy";
  if (value <= 300) return "severe";
  return "hazardous";
};

const TIER_LABELS = {
  good: "Good",
  moderate: "Moderate",
  poor: "Poor",
  unhealthy: "Unhealthy",
  severe: "Severe",
  hazardous: "Hazardous",
};

export default function AqiHeroCard({
  aqi,
  pm25,
  pm10,
  locationLabel,
  trend,
  average,
  timestampLabel,
}) {
  const tier = getTier(aqi);
  const label = TIER_LABELS[tier];
  const displayAqi = Number.isFinite(Number(aqi)) ? Math.round(aqi) : "--";

  return (
    <section className={clsx("aqi-hero-card", `aqi-hero-card--${tier}`)}>
      <div className="aqi-hero-top">
        <div>
          <div className="aqi-live-pill">
            <span className="live-dot" />
            Live AQI
          </div>
          <h2 className="aqi-hero-title">{locationLabel || "Current Location"}</h2>
          <p className="aqi-hero-subtitle">
            Real-time PM2.5 & PM10 air quality signals{timestampLabel ? ` · Updated ${timestampLabel}` : "."}
          </p>
        </div>
        <div className="aqi-tier-chip">{label}</div>
      </div>

      <div className="aqi-hero-body">
        <div className="aqi-hero-metrics">
          <div className="aqi-value-block">
            <div className="aqi-value">{displayAqi}</div>
            <span className="aqi-value-label">AQI (US)</span>
          </div>

          <div className="aqi-sub-metrics">
            <div className="aqi-sub-card">
              <span className="aqi-sub-label">PM2.5</span>
              <strong>{Number.isFinite(pm25) ? `${pm25.toFixed(1)} µg/m³` : "--"}</strong>
            </div>
            <div className="aqi-sub-card">
              <span className="aqi-sub-label">PM10</span>
              <strong>{Number.isFinite(pm10) ? `${pm10.toFixed(1)} µg/m³` : "--"}</strong>
            </div>
            <div className="aqi-sub-card">
              <span className="aqi-sub-label">Trend</span>
              <strong>{trend?.label || "Stable"}</strong>
            </div>
            <div className="aqi-sub-card">
              <span className="aqi-sub-label">Avg AQI</span>
              <strong>{Number.isFinite(average) ? Math.round(average) : "--"}</strong>
            </div>
          </div>

          <AQILevelBar value={aqi} />
        </div>

        <div className="aqi-hero-character">
          <AQICharacter aqiValue={aqi} />
        </div>
      </div>
    </section>
  );
}
