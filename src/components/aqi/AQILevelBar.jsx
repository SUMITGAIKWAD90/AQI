import { motion } from "framer-motion";
import clsx from "clsx";
import "./AQILevelBar.css";

const LEVELS = [
  { key: "good", label: "Good", max: 50 },
  { key: "moderate", label: "Moderate", max: 100 },
  { key: "poor", label: "Poor", max: 150 },
  { key: "unhealthy", label: "Unhealthy", max: 200 },
  { key: "severe", label: "Severe", max: 300 },
  { key: "hazardous", label: "Hazardous", max: 500 },
];

const MAX_AQI = 350;

const getLevelKey = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "good";
  const match = LEVELS.find((level) => numeric <= level.max);
  return match?.key ?? "hazardous";
};

export default function AQILevelBar({ value }) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  const progress = Math.min(Math.max(safeValue, 0), MAX_AQI);
  const percent = (progress / MAX_AQI) * 100;
  const levelKey = getLevelKey(safeValue);

  return (
    <div className="aqi-level-bar">
      <div className="aqi-level-track">
        {LEVELS.map((level) => (
          <div key={level.key} className={clsx("aqi-level-segment", `is-${level.key}`)} />
        ))}
        <motion.div
          className={clsx("aqi-level-marker", `is-${levelKey}`)}
          animate={{ left: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          <span className="aqi-level-tooltip">AQI {Number.isFinite(numeric) ? Math.round(numeric) : "--"}</span>
        </motion.div>
      </div>
      <div className="aqi-level-labels">
        {LEVELS.map((level) => (
          <span key={level.key} className="aqi-level-label">
            {level.label}
          </span>
        ))}
      </div>
    </div>
  );
}
